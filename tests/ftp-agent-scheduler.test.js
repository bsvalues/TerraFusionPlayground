/**
 * FTP Agent Scheduler Tests
 * 
 * This file contains unit tests for the FTP data agent's scheduling capabilities.
 * It tests the scheduling logic, interval calculations, and state management.
 */

const { FtpDataAgent } = require('../server/services/agents/ftp-data-agent');
const { MemStorage } = require('../server/storage');
const { MCPService } = require('../server/services/mcp-service');

// Mock the FTP service to avoid actual FTP connections during tests
jest.mock('../server/services/ftp-service', () => {
  return {
    FtpService: jest.fn().mockImplementation(() => {
      return {
        connect: jest.fn().mockResolvedValue(true),
        disconnect: jest.fn().mockResolvedValue(true),
        listFiles: jest.fn().mockResolvedValue([
          { name: 'file1.csv', isDirectory: false, size: 1024, modifiedAt: new Date() },
          { name: 'file2.csv', isDirectory: false, size: 2048, modifiedAt: new Date() }
        ]),
        downloadFile: jest.fn().mockResolvedValue({ success: true, path: '/tmp/test.csv', size: 1024 }),
        testConnection: jest.fn().mockResolvedValue({ success: true, server: 'test.ftp.server', features: { utf8: true } })
      };
    })
  };
});

// Test utilities
class TestClock {
  constructor() {
    this.now = new Date('2025-04-01T00:00:00Z');
  }
  
  getCurrentTime() {
    return this.now;
  }
  
  advanceTime(milliseconds) {
    this.now = new Date(this.now.getTime() + milliseconds);
    return this.now;
  }
  
  advanceHours(hours) {
    return this.advanceTime(hours * 60 * 60 * 1000);
  }
  
  advanceMinutes(minutes) {
    return this.advanceTime(minutes * 60 * 1000);
  }
}

// Test suite
describe('FTP Data Agent Scheduler', () => {
  let ftpAgent;
  let storage;
  let mcpService;
  let testClock;
  
  beforeEach(() => {
    storage = new MemStorage();
    mcpService = new MCPService(storage);
    testClock = new TestClock();
    
    // Create agent with the test clock
    ftpAgent = new FtpDataAgent(storage, mcpService);
    ftpAgent.initialize();
    
    // Override the Date.now function to use our test clock
    const originalDateNow = Date.now;
    Date.now = jest.fn(() => testClock.getCurrentTime().getTime());
    
    // Save original for cleanup
    ftpAgent._originalDateNow = originalDateNow;
  });
  
  afterEach(() => {
    // Restore original Date.now
    if (ftpAgent._originalDateNow) {
      Date.now = ftpAgent._originalDateNow;
    }
    jest.clearAllMocks();
  });
  
  test('should initialize with default schedule disabled', async () => {
    const status = await ftpAgent.getFtpStatus();
    expect(status.schedule.enabled).toBe(false);
  });
  
  test('should enable scheduled sync with specified interval', async () => {
    // Enable schedule with 12 hour interval
    await ftpAgent.scheduleFtpSync({ enabled: true, intervalHours: 12 });
    
    const status = await ftpAgent.getFtpStatus();
    expect(status.schedule.enabled).toBe(true);
    expect(status.schedule.intervalHours).toBe(12);
    
    // Should have calculated next sync time
    expect(status.schedule.nextSync).toBeTruthy();
    
    // Next sync should be 12 hours from now
    const nextSyncDate = new Date(status.schedule.nextSync);
    const expectedNextSync = new Date(testClock.getCurrentTime().getTime() + 12 * 60 * 60 * 1000);
    
    // Allow 1 second tolerance for test execution time
    expect(Math.abs(nextSyncDate.getTime() - expectedNextSync.getTime())).toBeLessThan(1000);
  });
  
  test('should disable scheduled sync', async () => {
    // First enable, then disable
    await ftpAgent.scheduleFtpSync({ enabled: true, intervalHours: 8 });
    
    let status = await ftpAgent.getFtpStatus();
    expect(status.schedule.enabled).toBe(true);
    
    await ftpAgent.scheduleFtpSync({ enabled: false });
    
    status = await ftpAgent.getFtpStatus();
    expect(status.schedule.enabled).toBe(false);
    expect(status.schedule.nextSync).toBeNull();
  });
  
  test('should run a one-time sync immediately', async () => {
    // Mock the synchronizeFtpData method
    const syncSpy = jest.spyOn(ftpAgent, 'synchronizeFtpData').mockResolvedValue({
      success: true,
      result: { filesProcessed: 10, filesDownloaded: 5 }
    });
    
    await ftpAgent.scheduleFtpSync({ runOnce: true });
    
    // Should have called synchronizeFtpData
    expect(syncSpy).toHaveBeenCalledTimes(1);
    
    // Schedule should not be enabled for future runs
    const status = await ftpAgent.getFtpStatus();
    expect(status.schedule.enabled).toBe(false);
  });
  
  test('should reject invalid interval values', async () => {
    // Test with interval too small
    await expect(ftpAgent.scheduleFtpSync({ enabled: true, intervalHours: 0 }))
      .rejects.toThrow(/interval/i);
    
    // Test with interval too large
    await expect(ftpAgent.scheduleFtpSync({ enabled: true, intervalHours: 169 }))
      .rejects.toThrow(/interval/i);
    
    // Test with negative interval
    await expect(ftpAgent.scheduleFtpSync({ enabled: true, intervalHours: -5 }))
      .rejects.toThrow(/interval/i);
  });
  
  test('should correctly report next run as human-readable string', async () => {
    await ftpAgent.scheduleFtpSync({ enabled: true, intervalHours: 24 });
    
    const scheduleInfo = await ftpAgent.getSyncScheduleInfo();
    
    expect(scheduleInfo.success).toBe(true);
    expect(scheduleInfo.result.scheduleDescription).toContain('every 24 hours');
    expect(scheduleInfo.result.nextRunDescription).toContain('tomorrow');
  });
  
  test('should trigger sync when current time reaches next sync time', async () => {
    // Mock the synchronizeFtpData method
    const syncSpy = jest.spyOn(ftpAgent, 'synchronizeFtpData').mockResolvedValue({
      success: true,
      result: { filesProcessed: 10, filesDownloaded: 5 }
    });
    
    // Enable schedule with 2 hour interval
    await ftpAgent.scheduleFtpSync({ enabled: true, intervalHours: 2 });
    
    // Advance time by 1 hour 59 minutes - should not trigger sync
    testClock.advanceHours(1);
    testClock.advanceMinutes(59);
    
    // Check if sync needs to run
    await ftpAgent.checkSchedule();
    expect(syncSpy).not.toHaveBeenCalled();
    
    // Advance time by 2 more minutes - should trigger sync
    testClock.advanceMinutes(2);
    
    // Check if sync needs to run
    await ftpAgent.checkSchedule();
    expect(syncSpy).toHaveBeenCalledTimes(1);
    
    // Next sync should be scheduled for 2 hours later
    const status = await ftpAgent.getFtpStatus();
    const nextSyncDate = new Date(status.schedule.nextSync);
    const expectedNextSync = new Date(testClock.getCurrentTime().getTime() + 2 * 60 * 60 * 1000);
    
    // Allow 1 second tolerance
    expect(Math.abs(nextSyncDate.getTime() - expectedNextSync.getTime())).toBeLessThan(1000);
  });
  
  test('should prevent overlap of sync jobs', async () => {
    // Mock a long-running sync operation
    let syncResolve;
    const syncPromise = new Promise(resolve => {
      syncResolve = resolve;
    });
    
    const syncSpy = jest.spyOn(ftpAgent, 'synchronizeFtpData').mockImplementation(() => {
      return syncPromise;
    });
    
    // Start a sync
    const firstSync = ftpAgent.handleRequest({
      action: 'synchronizeFtpData',
      parameters: { path: '/' }
    });
    
    // Try to start another sync before the first one completes
    const secondSync = ftpAgent.handleRequest({
      action: 'synchronizeFtpData',
      parameters: { path: '/' }
    });
    
    // Second sync should be rejected with "already in progress" error
    const secondResult = await secondSync;
    expect(secondResult.success).toBe(false);
    expect(secondResult.error).toMatch(/already in progress/i);
    
    // Complete the first sync
    syncResolve({
      success: true,
      result: { filesProcessed: 10, filesDownloaded: 5 }
    });
    
    // First sync should complete successfully
    const firstResult = await firstSync;
    expect(firstResult.success).toBe(true);
    
    // Sync should have been called exactly once
    expect(syncSpy).toHaveBeenCalledTimes(1);
  });
  
  test('should allow force option to override sync in progress check', async () => {
    // Mock a long-running sync operation
    let syncResolve;
    const syncPromise = new Promise(resolve => {
      syncResolve = resolve;
    });
    
    const syncSpy = jest.spyOn(ftpAgent, 'synchronizeFtpData').mockImplementation(() => {
      return syncPromise;
    });
    
    // Start a sync
    const firstSync = ftpAgent.handleRequest({
      action: 'synchronizeFtpData',
      parameters: { path: '/' }
    });
    
    // Try to start another sync with force=true
    const forcedSync = ftpAgent.handleRequest({
      action: 'synchronizeFtpData',
      parameters: { path: '/', force: true }
    });
    
    // Allow both syncs to complete
    syncResolve({
      success: true,
      result: { filesProcessed: 10, filesDownloaded: 5 }
    });
    
    // Both syncs should complete successfully
    const firstResult = await firstSync;
    const forcedResult = await forcedSync;
    
    expect(firstResult.success).toBe(true);
    expect(forcedResult.success).toBe(true);
    
    // Sync should have been called twice
    expect(syncSpy).toHaveBeenCalledTimes(2);
  });
  
  test('should update next sync time even if sync fails', async () => {
    // Mock a failing sync
    const syncSpy = jest.spyOn(ftpAgent, 'synchronizeFtpData').mockResolvedValue({
      success: false,
      error: 'Simulated error for testing'
    });
    
    // Enable schedule with 3 hour interval
    await ftpAgent.scheduleFtpSync({ enabled: true, intervalHours: 3 });
    
    // Get initial next sync time
    let status = await ftpAgent.getFtpStatus();
    const initialNextSync = status.schedule.nextSync;
    
    // Advance time to trigger sync
    testClock.advanceHours(3);
    testClock.advanceMinutes(1);
    
    // Check schedule - should trigger sync
    await ftpAgent.checkSchedule();
    expect(syncSpy).toHaveBeenCalledTimes(1);
    
    // Get updated status - next sync should be updated despite failure
    status = await ftpAgent.getFtpStatus();
    expect(status.schedule.nextSync).not.toBe(initialNextSync);
    
    // Next sync should be 3 hours from current time
    const nextSyncDate = new Date(status.schedule.nextSync);
    const expectedNextSync = new Date(testClock.getCurrentTime().getTime() + 3 * 60 * 60 * 1000);
    expect(Math.abs(nextSyncDate.getTime() - expectedNextSync.getTime())).toBeLessThan(1000);
  });
  
  test('should maintain sync statistics', async () => {
    // Reset sync stats counter
    ftpAgent.syncStats = {
      totalAttempts: 0,
      successCount: 0,
      failureCount: 0,
      lastSync: null,
      lastSuccessfulSync: null,
      lastFailedSync: null,
      errors: []
    };
    
    // Mock successful sync
    jest.spyOn(ftpAgent, 'synchronizeFtpData').mockResolvedValueOnce({
      success: true,
      result: { filesProcessed: 10, filesDownloaded: 5 }
    });
    
    // Run successful sync
    await ftpAgent.checkSchedule();
    
    // Check stats
    let status = await ftpAgent.getFtpStatus();
    expect(status.syncStats.totalAttempts).toBe(1);
    expect(status.syncStats.successCount).toBe(1);
    expect(status.syncStats.failureCount).toBe(0);
    expect(status.syncStats.successRate).toBe(100);
    
    // Mock failing sync
    jest.spyOn(ftpAgent, 'synchronizeFtpData').mockResolvedValueOnce({
      success: false,
      error: 'Simulated error for testing'
    });
    
    // Run failing sync
    await ftpAgent.checkSchedule();
    
    // Check updated stats
    status = await ftpAgent.getFtpStatus();
    expect(status.syncStats.totalAttempts).toBe(2);
    expect(status.syncStats.successCount).toBe(1);
    expect(status.syncStats.failureCount).toBe(1);
    expect(status.syncStats.successRate).toBe(50);
    expect(status.syncStats.errors.length).toBe(1);
    expect(status.syncStats.errors[0]).toContain('Simulated error');
  });
});