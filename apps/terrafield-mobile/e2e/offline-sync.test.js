/**
 * E2E Tests for Mobile Offline Sync and Conflict Resolution
 * 
 * This test suite validates offline-first functionality on mobile, including:
 * - Editing properties while offline and syncing when reconnected
 * - Conflict detection and resolution when changes collide
 * - Mobile UI components for handling conflicts
 */

describe('Mobile Offline Sync', () => {
  // Test property data
  const testProperty = {
    id: 'property-123',
    address: '123 Main St',
    owner: 'John Mobile',
    value: '250000',
    lastInspection: '2025-01-15',
    features: '3 bedrooms, 2 baths, garage',
    notes: 'Test mobile property'
  };

  // Offline changes
  const offlineChanges = {
    address: '123 Updated Mobile St',
    owner: 'Jane Mobile',
    value: '275000',
    notes: 'Updated on mobile offline'
  };

  // Remote changes (simulating server updates)
  const remoteChanges = {
    address: '123 Conflict Mobile St',
    owner: 'Bob Mobile',
    value: '300000',
    notes: 'Updated by another user'
  };

  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await waitFor(element(by.text('TerraField'))).toBeVisible().withTimeout(2000);
  });

  it('edits property while offline and syncs when reconnected', async () => {
    // Select test property
    await element(by.text('123 Main St')).tap();
    
    // Verify property details are loaded
    await waitFor(element(by.id('property-form'))).toBeVisible().withTimeout(2000);
    await expect(element(by.id('input-address'))).toHaveText(testProperty.address);
    
    // Set device offline
    await device.setStatusBar({ networkType: 'none' });
    
    // Check offline indicator is shown
    await expect(element(by.text('Offline'))).toBeVisible();
    
    // Make changes while offline
    await element(by.id('input-address')).replaceText(offlineChanges.address);
    await element(by.id('input-owner')).replaceText(offlineChanges.owner);
    await element(by.id('input-value')).replaceText(offlineChanges.value);
    await element(by.id('input-notes')).replaceText(offlineChanges.notes);
    
    // Save changes
    await element(by.text('Save Property')).tap();
    
    // Verify unsynced indicator
    await expect(element(by.text('unsynced'))).toBeVisible();
    
    // Set device back online
    await device.setStatusBar({ networkType: 'wifi' });
    
    // Wait for sync to complete
    await waitFor(element(by.text('synced'))).toBeVisible().withTimeout(5000);
    
    // Navigate back to property list
    await element(by.text('← Back to Properties')).tap();
    
    // Navigate back to the property to verify changes persisted
    await element(by.text('123 Updated Mobile St')).tap();
    
    // Verify changes were saved
    await expect(element(by.id('input-address'))).toHaveText(offlineChanges.address);
    await expect(element(by.id('input-owner'))).toHaveText(offlineChanges.owner);
    await expect(element(by.id('input-value'))).toHaveText(offlineChanges.value);
    await expect(element(by.id('input-notes'))).toHaveText(offlineChanges.notes);
  });

  it('detects and resolves conflicts with mobile UI', async () => {
    // This test requires mocking remote changes because we can't easily
    // create two mobile instances in Detox
    
    // Select test property
    await element(by.text('123 Main St')).tap();
    
    // Set device offline
    await device.setStatusBar({ networkType: 'none' });
    
    // Make offline changes
    await element(by.id('input-address')).replaceText(offlineChanges.address);
    await element(by.id('input-owner')).replaceText(offlineChanges.owner);
    await element(by.id('input-value')).replaceText(offlineChanges.value);
    await element(by.id('input-notes')).replaceText(offlineChanges.notes);
    
    // Save changes
    await element(by.text('Save Property')).tap();
    
    // Mock remote changes
    // In a real test, we would use a mock server
    // For this test, we'll use detox.executionAsyncStorage
    await device.sendToHome();
    await device.setStatusBar({ networkType: 'wifi' });
    await device.launchApp({ newInstance: false });
    
    // Trigger conflict detection with mock remote changes
    await device.sendUserNotification({
      title: 'Mock Server Update',
      body: 'Simulating remote changes',
      payload: {
        type: 'mock-remote-update',
        propertyId: testProperty.id,
        changes: remoteChanges
      }
    });
    
    // Wait for conflict UI to appear
    await waitFor(element(by.text('Conflict Detected'))).toBeVisible().withTimeout(5000);
    
    // Verify local and remote changes are displayed
    await expect(element(by.id('local-address'))).toHaveText(offlineChanges.address);
    await expect(element(by.id('remote-address'))).toHaveText(remoteChanges.address);
    
    // Select local address
    await element(by.id('select-local-address')).tap();
    
    // Select remote owner
    await element(by.id('select-remote-owner')).tap();
    
    // Select local value
    await element(by.id('select-local-value')).tap();
    
    // Select remote notes
    await element(by.id('select-remote-notes')).tap();
    
    // Resolve conflict
    await element(by.text('Resolve Conflict')).tap();
    
    // Wait for resolution to complete
    await waitFor(element(by.text('synced'))).toBeVisible().withTimeout(5000);
    
    // Verify merged data
    await expect(element(by.id('input-address'))).toHaveText(offlineChanges.address);
    await expect(element(by.id('input-owner'))).toHaveText(remoteChanges.owner);
    await expect(element(by.id('input-value'))).toHaveText(offlineChanges.value);
    await expect(element(by.id('input-notes'))).toHaveText(remoteChanges.notes);
  });
});