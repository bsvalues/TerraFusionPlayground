# FTP Data Agent Documentation

## Overview

The FTP Data Agent is a specialized agent in the property intelligence platform that facilitates automated synchronization of property data from external FTP servers. This agent is specifically designed to work with common property assessment data formats and provides robust error handling, scheduling, and reporting capabilities.

## Key Features

- **Secure FTP Connectivity**: Connect to SpatialEst and other property assessment FTP servers with authentication
- **Automated Synchronization**: Schedule regular data imports or run one-time sync operations
- **Selective Synchronization**: Target specific directories or file types for import
- **Incremental Updates**: Import only new or changed files since last synchronization
- **Comprehensive Logging**: Detailed logs of all synchronization activities
- **Robust Error Handling**: Retry mechanisms and detailed error reporting
- **Status Monitoring**: Real-time status checks and historical statistics
- **Configurable Settings**: Customize behavior through environment variables or configuration files

## Environment Variables

The FTP agent uses the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `FTP_HOST` | FTP server hostname | N/A (required) |
| `FTP_USER` | FTP username | N/A (required) |
| `FTP_PASSWORD` | FTP password | N/A (required) |
| `FTP_PORT` | FTP server port | `21` |
| `FTP_SECURE` | Use FTPS (secure FTP) | `false` |
| `FTP_BASE_DIR` | Base directory on FTP server | `/` |
| `FTP_LOCAL_DIR` | Local directory for downloads | `./downloads` |
| `FTP_RETRY_COUNT` | Number of retries on failure | `3` |
| `FTP_RETRY_DELAY` | Delay between retries (ms) | `5000` |
| `FTP_TIMEOUT` | Connection timeout (ms) | `30000` |
| `FTP_SYNC_INTERVAL` | Default sync interval (hours) | `24` |

## Agent Capabilities

The FTP data agent provides the following capabilities:

- `testFtpConnection()`: Test connection to FTP server
- `synchronizeFtpData({ path, force })`: Sync data from FTP server
- `listFtpFiles({ path })`: List files in a specific directory
- `getFtpFileDetails({ path })`: Get details about a specific file
- `downloadFtpFile({ remotePath, localPath })`: Download a specific file
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

## Implementation Details

### Data Processing Flow

The agent follows a structured data processing flow:

1. **Connection**: Establish connection to FTP server
2. **Directory Scan**: Recursively scan directories based on configuration
3. **Change Detection**: Compare file timestamps with previously imported data
4. **Download**: Transfer new or modified files to local storage
5. **Validation**: Validate file format and structure before importing
6. **Import**: Parse and import data into the platform's storage
7. **Cleanup**: Remove temporary files and update sync metadata
8. **Logging**: Record detailed activity for auditing and diagnostics

### File Format Support

The agent currently supports the following file formats:

- CSV (comma-separated values)
- TSV (tab-separated values)
- JSON (JavaScript Object Notation)
- XML (Extensible Markup Language)
- Excel (XLSX/XLS)
- SpatialEst export formats
- CAMA (Computer Assisted Mass Appraisal) data formats

### Performance Considerations

For optimal performance:

- Schedule synchronizations during off-peak hours
- Use selective sync for large repositories
- Configure appropriate retry parameters based on network reliability
- Monitor disk space for downloaded files
- Review sync logs regularly for potential optimizations