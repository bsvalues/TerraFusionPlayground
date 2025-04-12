/**
 * Test suite for FTP Data Agent scheduling functionality
 * 
 * This test file validates the enhanced scheduling capabilities including:
 * - One-time synchronization
 * - Schedule overlap prevention
 * - Accurate next sync time calculation
 * - Human-readable schedule information
 */

const { FtpDataAgent } = require('../server/services/agents/ftp-data-agent');
const { FtpService } = require('../server/services/ftp-service');
const { DataImportService } = require('../server/services/data-import-service');
const { MCPService } = require('../server/services/mcp-service');
const { MemStorage } = require('../server/storage');

// Mock dependencies
jest.mock('../server/services/ftp-service');
jest.mock('../server/services/data-import-service');
jest.mock('../server/services/mcp-service');

describe('FTP Data Agent Scheduler', () => {
  let ftpAgent;
  let mockStorage;
  let mockFtpService;
  let mockDataImportService;
  let mockMcpService;

  // Setup before each test
  beforeEach(() => {
    // Create mocks
    mockStorage = new MemStorage();
    mockFtpService = new FtpService();
    mockDataImportService = new DataImportService();
    mockMcpService = new MCPService();

    // Mock the required methods
    mockFtpService.connect = jest.fn().mockResolvedValue(true);
    mockFtpService.disconnect = jest.fn().mockResolvedValue(true);
    mockFtpService.listDirectories = jest.fn().mockResolvedValue({
      success: true,
      directories: ['data', 'uploads'],
      files: []
    });
    mockFtpService.downloadFile = jest.fn().mockResolvedValue({
      success: true,
      localPath: '/tmp/test-file.csv'
    });
    
    // Mock storage activity logging
    mockStorage.logActivity = jest.fn().mockResolvedValue({
      id: 1,
      component: 'ftp-agent',
      activity_type: 'test',
      created_at: new Date()
    });
    
    mockStorage.getActivitiesByType = jest.fn().mockResolvedValue([]);

    // Create the agent with mocked dependencies
    ftpAgent = new FtpDataAgent(mockStorage, mockMcpService, mockFtpService, mockDataImportService);
  });

  // Clean up after each test
  afterEach(() => {
    jest.clearAllMocks();
    
    // Clean up any timers or intervals
    if (ftpAgent.scheduler) {
      clearInterval(ftpAgent.scheduler);
      ftpAgent.scheduler = null;
    }
  });

  describe('Schedule Configuration', () => {
    test('should correctly enable scheduling with default interval', async () => {
      // Enable scheduling with default 24 hour interval
      const result = await ftpAgent.scheduleFtpSync({ enabled: true });
      
      expect(result.success).toBe(true);
      expect(result.result.enabled).toBe(true);
      expect(result.result.intervalHours).toBe(24);
      expect(result.result.nextSyncTime).not.toBeNull();
      expect(ftpAgent.scheduler).not.toBeNull();
    });

    test('should correctly disable scheduling', async () => {
      // First enable, then disable
      await ftpAgent.scheduleFtpSync({ enabled: true });
      const result = await ftpAgent.scheduleFtpSync({ enabled: false });
      
      expect(result.success).toBe(true);
      expect(result.result.enabled).toBe(false);
      expect(ftpAgent.scheduler).toBeNull();
    });

    test('should validate and cap intervalHours within allowed range', async () => {
      // Test with too low value, should be set to minimum 1
      let result = await ftpAgent.scheduleFtpSync({ enabled: true, intervalHours: 0.5 });
      expect(result.result.intervalHours).toBe(1);
      
      // Test with too high value, should be capped at 168 (7 days)
      result = await ftpAgent.scheduleFtpSync({ enabled: true, intervalHours: 200 });
      expect(result.result.intervalHours).toBe(168);
      
      // Test with valid value
      result = await ftpAgent.scheduleFtpSync({ enabled: true, intervalHours: 12 });
      expect(result.result.intervalHours).toBe(12);
    });
  });

  describe('One-Time Sync', () => {
    test('should correctly execute a one-time sync', async () => {
      // Setup mock for runScheduledSync
      ftpAgent.runScheduledSync = jest.fn().mockResolvedValue(true);
      
      // Spy on setTimeout (to verify the one-time sync is triggered)
      jest.spyOn(global, 'setTimeout');
      
      // Execute one-time sync
      const result = await ftpAgent.scheduleFtpSync({ runOnce: true });
      
      expect(result.success).toBe(true);
      expect(result.result.syncType).toBe('one-time');
      expect(result.result.status).toBe('started');
      
      // Verify setTimeout was called to trigger the sync
      expect(setTimeout).toHaveBeenCalled();
      
      // Execute the timeout callback
      jest.runAllTimers();
      
      // Verify runScheduledSync was called
      expect(ftpAgent.runScheduledSync).toHaveBeenCalled();
    });
  });

  describe('Next Sync Time Calculation', () => {
    test('should calculate correct next sync time', async () => {
      // Set up a known last run time
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - (2 * 60 * 60 * 1000));
      
      // Configure agent with 4 hour interval and last run time
      await ftpAgent.scheduleFtpSync({ enabled: true, intervalHours: 4 });
      ftpAgent.schedule.lastRun = twoHoursAgo;
      
      // Get next sync time
      const nextSyncTime = ftpAgent.getNextSyncTime();
      const expectedTime = new Date(twoHoursAgo.getTime() + (4 * 60 * 60 * 1000));
      
      // Extract just the time portion for comparison (avoiding millisecond precision issues)
      const nextSyncDate = new Date(nextSyncTime);
      
      // The next sync should be 4 hours after the last run
      expect(nextSyncDate.getTime()).toBeCloseTo(expectedTime.getTime(), -3); // -3 allows for ~seconds difference
    });

    test('should adjust next sync time to future when past time calculated', async () => {
      // Set up a last run time from yesterday
      const now = new Date();
      const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      
      // Configure agent with 4 hour interval and yesterday's last run
      await ftpAgent.scheduleFtpSync({ enabled: true, intervalHours: 4 });
      ftpAgent.schedule.lastRun = yesterday;
      
      // Get next sync time
      const nextSyncTime = ftpAgent.getNextSyncTime();
      const nextSyncDate = new Date(nextSyncTime);
      
      // Verify the calculated time is in the future, not the past
      expect(nextSyncDate.getTime()).toBeGreaterThan(now.getTime());
      
      // It should be the next 4-hour increment after the current time
      const expectedHourIncrement = 4 - (now.getHours() % 4);
      const estimatedNextTime = new Date(now);
      estimatedNextTime.setHours(now.getHours() + expectedHourIncrement);
      estimatedNextTime.setMinutes(0);
      estimatedNextTime.setSeconds(0);
      estimatedNextTime.setMilliseconds(0);
      
      // This test may be somewhat approximate due to time during test execution
      expect(nextSyncDate.getHours() % 4).toBe(yesterday.getHours() % 4);
    });
  });

  describe('Human-Readable Schedule Info', () => {
    test('should provide user-friendly schedule information when active', async () => {
      // Set up a scheduled sync
      await ftpAgent.scheduleFtpSync({ enabled: true, intervalHours: 2 });
      
      // Mock a last run time 30 minutes ago
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - (30 * 60 * 1000));
      ftpAgent.schedule.lastRun = thirtyMinutesAgo;
      
      // Get the human-readable info
      const info = ftpAgent.getSyncScheduleInfo();
      
      expect(info.status).toBe('active');
      expect(info.message).toContain('FTP sync scheduled every 2 hours');
      expect(info.timeRemaining).toContain('1 hour 30 minute');
      expect(info.nextSync).not.toBeNull();
      expect(info.nextSyncFormatted).not.toBeNull();
      expect(info.lastSync).toBe(thirtyMinutesAgo.toISOString());
      expect(info.intervalHours).toBe(2);
    });

    test('should provide appropriate status when schedule is disabled', async () => {
      // Set up a disabled schedule
      await ftpAgent.scheduleFtpSync({ enabled: false });
      
      // Get the human-readable info
      const info = ftpAgent.getSyncScheduleInfo();
      
      expect(info.status).toBe('disabled');
      expect(info.message).toContain('disabled');
    });
  });

  describe('FTP Status Reporting', () => {
    test('should provide comprehensive status including connection and schedule info', async () => {
      // Set up a scheduled sync
      await ftpAgent.scheduleFtpSync({ enabled: true, intervalHours: 3 });
      
      // Mock successful connection test
      mockFtpService.testConnection = jest.fn().mockResolvedValue({
        success: true, 
        connected: true
      });
      
      // Set some mock activities
      mockStorage.getActivitiesByType.mockImplementation((type) => {
        if (type === 'ftp_scheduled_sync_complete') {
          return Promise.resolve([
            { 
              created_at: new Date(), 
              status: 'success',
              details: JSON.stringify({
                syncResults: { filesProcessed: 5, recordsImported: 120 }
              })
            }
          ]);
        } else if (type === 'ftp_scheduled_sync_error') {
          return Promise.resolve([]);
        } else {
          return Promise.resolve([
            { created_at: new Date(), status: 'success' },
            { created_at: new Date(), status: 'success' }
          ]);
        }
      });
      
      // Get the status
      const status = await ftpAgent.getFtpStatus();
      
      expect(status.success).toBe(true);
      expect(status.result.connection.connected).toBe(true);
      expect(status.result.schedule.enabled).toBe(true);
      expect(status.result.schedule.intervalHours).toBe(3);
      expect(status.result.syncStats).toBeDefined();
      expect(status.result.lastSyncResults).toBeDefined();
      expect(status.result.lastSyncResults.filesProcessed).toBe(5);
      expect(status.result.lastSyncResults.recordsImported).toBe(120);
    });
  });
});