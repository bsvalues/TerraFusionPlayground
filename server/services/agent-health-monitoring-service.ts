/**
 * Agent Health Monitoring Service
 * 
 * This service is responsible for collecting, analyzing, and reporting agent health metrics.
 * It provides real-time monitoring of agent status, performance, and resource usage.
 */

import { IStorage } from '../storage';
import { logger } from '../utils/logger';
import { AgentSystem } from './agent-system';
import { AgentHealthStatus, InsertAgentHealthMonitoring } from '@shared/schema';
import { AgentPerformanceMetricType } from '@shared/schema';
import EventEmitter from 'events';
import os from 'os';

// Thresholds for health status
interface HealthThresholds {
  cpu: {
    warning: number;  // percentage
    critical: number; // percentage
  };
  memory: {
    warning: number;  // MB
    critical: number; // MB
  };
  responseTime: {
    warning: number;  // ms
    critical: number; // ms
  };
  errorRate: {
    warning: number;  // errors per minute
    critical: number; // errors per minute
  };
}

export class AgentHealthMonitoringService extends EventEmitter {
  private static instance: AgentHealthMonitoringService;
  private storage: IStorage;
  private agentSystem: AgentSystem | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: number = 30000; // 30 seconds by default
  private healthThresholds: HealthThresholds = {
    cpu: {
      warning: 70,  // 70% CPU usage
      critical: 90  // 90% CPU usage
    },
    memory: {
      warning: 1024,  // 1 GB
      critical: 2048   // 2 GB
    },
    responseTime: {
      warning: 2000,  // 2 seconds
      critical: 5000   // 5 seconds
    },
    errorRate: {
      warning: 5,  // 5 errors per minute
      critical: 15 // 15 errors per minute
    }
  };
  
  /**
   * Get singleton instance
   */
  public static getInstance(): AgentHealthMonitoringService {
    if (!AgentHealthMonitoringService.instance) {
      AgentHealthMonitoringService.instance = new AgentHealthMonitoringService();
    }
    
    return AgentHealthMonitoringService.instance;
  }
  
  /**
   * Private constructor for singleton
   */
  private constructor() {
    super();
    
    // Will be initialized later with initialize()
    this.storage = null as unknown as IStorage;
  }
  
  /**
   * Initialize the monitoring service
   */
  public initialize(storage: IStorage, agentSystem: AgentSystem, options?: {
    healthCheckInterval?: number;
    healthThresholds?: Partial<HealthThresholds>;
  }): void {
    this.storage = storage;
    this.agentSystem = agentSystem;
    
    // Configure options if provided
    if (options) {
      if (options.healthCheckInterval) {
        this.healthCheckInterval = options.healthCheckInterval;
      }
      
      if (options.healthThresholds) {
        this.healthThresholds = {
          ...this.healthThresholds,
          ...options.healthThresholds
        };
      }
    }
    
    // Start monitoring
    this.startMonitoring();
    
    logger.info({
      component: 'AgentHealthMonitoringService',
      message: 'Agent Health Monitoring Service initialized',
      interval: this.healthCheckInterval
    });
  }
  
  /**
   * Start the health monitoring process
   */
  public startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);
    
    // Perform an immediate health check
    this.performHealthCheck();
    
    logger.info({
      component: 'AgentHealthMonitoringService',
      message: 'Agent Health Monitoring started',
      interval: this.healthCheckInterval
    });
  }
  
  /**
   * Stop the health monitoring process
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      
      logger.info({
        component: 'AgentHealthMonitoringService',
        message: 'Agent Health Monitoring stopped'
      });
    }
  }
  
  /**
   * Perform a health check for all agents
   */
  private async performHealthCheck(): Promise<void> {
    try {
      if (!this.agentSystem) {
        logger.warn({
          component: 'AgentHealthMonitoringService',
          message: 'Agent System not initialized for health check'
        });
        return;
      }
      
      // Get all agents from the system
      const systemStatus = this.agentSystem.getSystemStatus();
      const agentIds = Object.keys(systemStatus.agents);
      
      for (const agentId of agentIds) {
        // Check if agent exists in agentHealthMonitoring table
        const existingHealth = await this.storage.getAgentHealthByAgentId(agentId);
        
        // Collect health metrics for this agent
        const healthMetrics = await this.collectAgentHealthMetrics(agentId);
        const healthStatus = this.determineHealthStatus(healthMetrics);
        
        // Prepare health data
        const healthData: InsertAgentHealthMonitoring = {
          agentId,
          healthStatus,
          cpuUsage: healthMetrics.cpuUsage,
          memoryUsage: healthMetrics.memoryUsage,
          responseTime: healthMetrics.responseTime,
          uptime: healthMetrics.uptime,
          activeConnections: healthMetrics.activeConnections,
          errorCount: healthMetrics.errorCount,
          llmApiCallCount: healthMetrics.llmApiCallCount,
          tokenUsage: healthMetrics.tokenUsage,
          lastActivityTimestamp: healthMetrics.lastActivityTimestamp,
          alertsTriggered: healthMetrics.alertsTriggered,
          metadata: healthMetrics.metadata
        };
        
        // Update or create health record
        if (existingHealth) {
          await this.storage.updateAgentHealth(agentId, healthData);
          
          // Check if health status changed
          if (existingHealth.healthStatus !== healthStatus) {
            this.emit('health-status-changed', {
              agentId,
              previousStatus: existingHealth.healthStatus,
              currentStatus: healthStatus,
              timestamp: new Date()
            });
            
            logger.info({
              component: 'AgentHealthMonitoringService',
              message: `Agent ${agentId} health status changed from ${existingHealth.healthStatus} to ${healthStatus}`
            });
          }
        } else {
          await this.storage.createAgentHealth(healthData);
          
          this.emit('health-status-initialized', {
            agentId,
            status: healthStatus,
            timestamp: new Date()
          });
        }
        
        // Emit health metrics updated event
        this.emit('health-metrics-updated', {
          agentId,
          metrics: healthMetrics,
          status: healthStatus,
          timestamp: new Date()
        });
      }
      
      logger.debug({
        component: 'AgentHealthMonitoringService',
        message: `Completed health check for ${agentIds.length} agents`
      });
    } catch (error) {
      logger.error({
        component: 'AgentHealthMonitoringService',
        message: 'Error performing health check',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Collect health metrics for a specific agent
   */
  private async collectAgentHealthMetrics(agentId: string): Promise<{
    cpuUsage: number;
    memoryUsage: number;
    responseTime: number;
    uptime: number;
    activeConnections: number;
    errorCount: number;
    llmApiCallCount: number;
    tokenUsage: number;
    lastActivityTimestamp: Date | null;
    lastErrorTimestamp: Date | null;
    alertsTriggered: Record<string, any>;
    metadata: Record<string, any>;
  }> {
    // Get agent from system
    const systemStatus = this.agentSystem?.getSystemStatus();
    const agent = systemStatus?.agents[agentId];
    
    if (!agent) {
      logger.warn({
        component: 'AgentHealthMonitoringService',
        message: `Agent ${agentId} not found in system status`,
        agentId
      });
      
      // Return default metrics
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        responseTime: 0,
        uptime: 0,
        activeConnections: 0,
        errorCount: 0,
        llmApiCallCount: 0,
        tokenUsage: 0,
        lastActivityTimestamp: null,
        lastErrorTimestamp: null,
        alertsTriggered: {},
        metadata: {}
      };
    }
    
    // Get performance metrics for this agent
    const recentMetrics = await this.storage.getAgentPerformanceMetrics(
      agentId,
      undefined,
      'hourly',
      5 // Last 5 hours
    );
    
    // Get error counts
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentErrors = await this.storage.getAgentMessages({
      senderAgentId: agentId,
      messageType: 'error',
      createdAfter: hourAgo
    });
    
    // Get API call counts (for LLM agents)
    const llmApiCalls = await this.storage.getAgentMetadata(agentId, 'llm_api_calls') || 0;
    const tokenUsageCount = await this.storage.getAgentMetadata(agentId, 'token_usage') || 0;
    
    // Get last activity
    const lastActivity = await this.storage.getLatestAgentActivity(agentId);
    
    // Get system metrics
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsageMB = Math.round((totalMem - freeMem) / (1024 * 1024));
    
    // Calculate CPU usage by agent (simplified - in a real system you'd use process monitoring)
    const cpuUsage = Math.min(
      Math.round(
        os.loadavg()[0] * (Math.random() * 0.3 + 0.7) * 100 / os.cpus().length
      ),
      100
    );
    
    // Get response time from metrics or estimate
    const responseTimeMetrics = recentMetrics.filter(
      m => m.metricType === AgentPerformanceMetricType.RESPONSE_TIME
    );
    let avgResponseTime = 0;
    if (responseTimeMetrics.length > 0) {
      avgResponseTime = responseTimeMetrics.reduce(
        (sum, m) => sum + Number(m.value),
        0
      ) / responseTimeMetrics.length;
    }
    
    // Calculate agent-specific memory usage (mock implementation for demo)
    // In a real system, you'd monitor the actual process memory
    const agentMemoryUsage = Math.round(
      memUsageMB * (0.05 + Math.random() * 0.15) // 5-20% of system memory
    );
    
    // Get actual uptime or last restart time
    let uptime = 0;
    const agentStartTime = await this.storage.getAgentMetadata(agentId, 'start_time');
    if (agentStartTime) {
      uptime = Math.round((Date.now() - new Date(agentStartTime).getTime()) / 1000);
    }
    
    // Determine active connections (simplified for demo)
    const activeConnections = Math.round(Math.random() * 5); // 0-5 connections
    
    // Get alerts that were triggered for this agent
    const activeAlerts = await this.storage.getActiveAlertsForAgent(agentId);
    
    return {
      cpuUsage,
      memoryUsage: agentMemoryUsage,
      responseTime: avgResponseTime,
      uptime,
      activeConnections,
      errorCount: recentErrors.length,
      llmApiCallCount: Number(llmApiCalls),
      tokenUsage: Number(tokenUsageCount),
      lastActivityTimestamp: lastActivity?.timestamp || null,
      lastErrorTimestamp: recentErrors.length > 0 
        ? new Date(recentErrors[0].createdAt) 
        : null,
      alertsTriggered: Object.fromEntries(
        activeAlerts.map(alert => [alert.alertType, alert.metadata])
      ),
      metadata: {
        // Additional agent-specific metadata
        agentType: agent.type,
        capabilities: agent.capabilities,
        lastStatus: agent.status
      }
    };
  }
  
  /**
   * Determine the health status based on metrics
   */
  private determineHealthStatus(metrics: {
    cpuUsage: number;
    memoryUsage: number;
    responseTime: number;
    errorCount: number;
    uptime: number;
  }): AgentHealthStatus {
    // Check for critical conditions
    if (
      metrics.cpuUsage >= this.healthThresholds.cpu.critical ||
      metrics.memoryUsage >= this.healthThresholds.memory.critical ||
      metrics.responseTime >= this.healthThresholds.responseTime.critical ||
      metrics.errorCount >= this.healthThresholds.errorRate.critical
    ) {
      return AgentHealthStatus.CRITICAL;
    }
    
    // Check for degraded conditions
    if (
      metrics.cpuUsage >= this.healthThresholds.cpu.warning ||
      metrics.memoryUsage >= this.healthThresholds.memory.warning ||
      metrics.responseTime >= this.healthThresholds.responseTime.warning ||
      metrics.errorCount >= this.healthThresholds.errorRate.warning
    ) {
      return AgentHealthStatus.DEGRADED;
    }
    
    // Check if agent is offline (no activity for extended period)
    if (metrics.uptime === 0) {
      return AgentHealthStatus.OFFLINE;
    }
    
    // Otherwise, agent is healthy
    return AgentHealthStatus.HEALTHY;
  }
  
  /**
   * Get the current health status for all agents
   */
  public async getAllAgentHealth(): Promise<any[]> {
    try {
      return await this.storage.getAllAgentHealth();
    } catch (error) {
      logger.error({
        component: 'AgentHealthMonitoringService',
        message: 'Error getting all agent health data',
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }
  
  /**
   * Get the current health status for a specific agent
   */
  public async getAgentHealth(agentId: string): Promise<any | null> {
    try {
      return await this.storage.getAgentHealthByAgentId(agentId);
    } catch (error) {
      logger.error({
        component: 'AgentHealthMonitoringService',
        message: `Error getting health data for agent ${agentId}`,
        agentId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }
  
  /**
   * Get health statistics for all agents
   */
  public async getHealthStatistics(): Promise<{
    totalAgents: number;
    healthyCount: number;
    degradedCount: number;
    criticalCount: number;
    offlineCount: number;
    averageCpuUsage: number;
    averageMemoryUsage: number;
    averageResponseTime: number;
    totalErrors: number;
    totalLlmApiCalls: number;
    totalTokenUsage: number;
  }> {
    try {
      const allHealth = await this.storage.getAllAgentHealth();
      
      if (allHealth.length === 0) {
        return {
          totalAgents: 0,
          healthyCount: 0,
          degradedCount: 0,
          criticalCount: 0,
          offlineCount: 0,
          averageCpuUsage: 0,
          averageMemoryUsage: 0,
          averageResponseTime: 0,
          totalErrors: 0,
          totalLlmApiCalls: 0,
          totalTokenUsage: 0
        };
      }
      
      // Count agents by status
      const healthyCount = allHealth.filter(h => h.healthStatus === AgentHealthStatus.HEALTHY).length;
      const degradedCount = allHealth.filter(h => h.healthStatus === AgentHealthStatus.DEGRADED).length;
      const criticalCount = allHealth.filter(h => h.healthStatus === AgentHealthStatus.CRITICAL).length;
      const offlineCount = allHealth.filter(h => h.healthStatus === AgentHealthStatus.OFFLINE).length;
      
      // Calculate averages
      const activeCpuValues = allHealth
        .filter(h => h.cpuUsage !== null && h.cpuUsage !== undefined)
        .map(h => Number(h.cpuUsage));
        
      const activeMemoryValues = allHealth
        .filter(h => h.memoryUsage !== null && h.memoryUsage !== undefined)
        .map(h => Number(h.memoryUsage));
        
      const activeResponseTimeValues = allHealth
        .filter(h => h.responseTime !== null && h.responseTime !== undefined)
        .map(h => Number(h.responseTime));
      
      const averageCpuUsage = activeCpuValues.length > 0
        ? activeCpuValues.reduce((sum, val) => sum + val, 0) / activeCpuValues.length
        : 0;
        
      const averageMemoryUsage = activeMemoryValues.length > 0
        ? activeMemoryValues.reduce((sum, val) => sum + val, 0) / activeMemoryValues.length
        : 0;
        
      const averageResponseTime = activeResponseTimeValues.length > 0
        ? activeResponseTimeValues.reduce((sum, val) => sum + val, 0) / activeResponseTimeValues.length
        : 0;
      
      // Calculate totals
      const totalErrors = allHealth.reduce(
        (sum, h) => sum + (h.errorCount || 0), 
        0
      );
      
      const totalLlmApiCalls = allHealth.reduce(
        (sum, h) => sum + (h.llmApiCallCount || 0), 
        0
      );
      
      const totalTokenUsage = allHealth.reduce(
        (sum, h) => sum + (h.tokenUsage || 0), 
        0
      );
      
      return {
        totalAgents: allHealth.length,
        healthyCount,
        degradedCount,
        criticalCount,
        offlineCount,
        averageCpuUsage,
        averageMemoryUsage,
        averageResponseTime,
        totalErrors,
        totalLlmApiCalls,
        totalTokenUsage
      };
    } catch (error) {
      logger.error({
        component: 'AgentHealthMonitoringService',
        message: 'Error getting health statistics',
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        totalAgents: 0,
        healthyCount: 0,
        degradedCount: 0,
        criticalCount: 0,
        offlineCount: 0,
        averageCpuUsage: 0,
        averageMemoryUsage: 0,
        averageResponseTime: 0,
        totalErrors: 0,
        totalLlmApiCalls: 0,
        totalTokenUsage: 0
      };
    }
  }
}

// Export singleton instance
export const agentHealthMonitoringService = AgentHealthMonitoringService.getInstance();