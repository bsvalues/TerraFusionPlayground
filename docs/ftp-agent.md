# FTP Data Agent Documentation

The FTP Data Agent is responsible for connecting to remote FTP servers (primarily SpatialEst's FTP server) and synchronizing property assessment data into the system. This document provides a comprehensive overview of the agent's capabilities and usage instructions.

## Architecture

The FTP Data Agent is built with a modular architecture consisting of:

1. **FTP Service Layer**: Handles low-level FTP connection details, file operations, and authentication
2. **Data Import Service**: Processes and validates imported data files
3. **Scheduling System**: Manages synchronization timing and execution
4. **Error Handling Layer**: Provides robust error recovery and reporting

## Key Capabilities

### 1. FTP Connection Management

- Secure connection to SpatialEst FTP server
- Authentication with configurable credentials
- Connection pool management for optimal performance
- Automatic retry with exponential backoff

### 2. Data Synchronization

- Full directory synchronization
- Individual file synchronization
- File differencing to identify changes
- File format validation
- Data integrity verification

### 3. Scheduling

- Configurable interval-based scheduling (1 hour to 7 days)
- One-time synchronization option
- Smart overlap prevention
- Human-readable schedule information
- Calendar-aware timing adjustments

### 4. Monitoring and Status Reporting

- Detailed sync activity history
- Success/failure statistics
- File processing metrics
- Performance measurement
- Comprehensive error reporting

## Configuration

The FTP agent can be configured through the following settings:

| Setting | Description | Default |
|---------|-------------|---------|
| `enabled` | Enable/disable scheduled synchronization | `false` |
| `intervalHours` | Hours between sync operations (1-168) | `24` |
| `maxRetries` | Maximum connection retry attempts | `5` |
| `backoffFactor` | Retry delay multiplication factor | `1.5` |
| `fileTypes` | File extensions to process | `.csv, .xml, .json` |

## API Methods

### Connection

- `testFtpConnection()`: Test connection to FTP server
- `listFtpDirectories()`: List available directories
- `browseDirectory(path)`: Browse contents of a specific directory

### Synchronization

- `synchronizeFtpData(path)`: Sync data from specific FTP path
- `downloadFile(remotePath, localPath)`: Download a specific file
- `validateFile(path)`: Validate a downloaded file

### Scheduling

- `scheduleFtpSync({ enabled, intervalHours, runOnce })`: Configure sync schedule
- `getFtpStatus()`: Get current FTP connection and sync status
- `getSyncScheduleInfo()`: Get human-readable schedule information

## Usage Examples

### Testing Connection

```javascript
const result = await ftpAgent.testFtpConnection();
if (result.success) {
  console.log('Successfully connected to FTP server');
}
```

### Scheduling Synchronization

```javascript
// Schedule sync every 12 hours
await ftpAgent.scheduleFtpSync({ 
  enabled: true, 
  intervalHours: 12 
});

// Run a one-time sync immediately
await ftpAgent.scheduleFtpSync({ runOnce: true });

// Disable scheduled synchronization
await ftpAgent.scheduleFtpSync({ enabled: false });
```

### Checking Status

```javascript
const status = await ftpAgent.getFtpStatus();
console.log('Connection status:', status.result.connection.connected);
console.log('Next sync:', status.result.schedule.nextSyncFormatted);
console.log('Success rate:', status.result.syncStats.successRate + '%');
```

## Error Handling

The FTP agent includes sophisticated error handling:

1. **Connection Errors**: Automatically retried with exponential backoff
2. **Authentication Errors**: Reported with detailed diagnostics
3. **File Access Errors**: Path and permission issues identified
4. **Data Format Errors**: File format validation with specific error codes
5. **Timeout Errors**: Long operations monitored and recovered

## Testing

Two testing approaches are available:

1. **Unit Tests**: Jest tests in `tests/ftp-agent-scheduler.test.js`
2. **Manual Testing**: Command-line interface in `scripts/test-ftp-sync.js`

Run the tests using:

```bash
# Run automated tests
npm test -- tests/ftp-agent-scheduler.test.js

# Run manual tests (interactive)
node scripts/test-ftp-sync.js status

# Or use the test runner script
scripts/run-ftp-tests.sh
```

## Troubleshooting

Common issues and solutions:

| Issue | Solution |
|-------|----------|
| Connection timeout | Check network connectivity and firewall settings |
| Authentication failure | Verify FTP credentials in environment variables |
| "Sync already in progress" | A previous sync job is still running, wait for completion |
| File format errors | Check that the source files match expected formats |
| Scheduling errors | Ensure intervalHours is within the valid range (1-168) |