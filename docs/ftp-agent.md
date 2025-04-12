# FTP Data Agent Documentation

## Overview

The FTP Data Agent is a specialized agent that handles synchronization of data between your application and external FTP servers. It's designed specifically for integrating with property assessment and tax data servers, and includes robust capabilities for scheduling, error handling, and status reporting.

## Key Features

- **Automatic Synchronization**: Schedule periodic data synchronization with configurable intervals
- **Error Handling & Retries**: Robust error recovery with configurable retry attempts
- **Detailed Logging**: Comprehensive logging of all FTP operations
- **Status Reporting**: Human-readable status reports including next scheduled syncs, success rates, etc.
- **Selective Downloads**: Synchronize specific directories or the entire FTP structure
- **Overlap Prevention**: Safety mechanisms to prevent multiple concurrent syncs
- **Flexible Automation**: Support for cron jobs and one-time synchronizations

## Configuration

The FTP Data Agent can be configured in several ways:

### Connection Settings

The agent uses the following environment variables for connection:

```
FTP_HOST=example.ftp.server
FTP_USERNAME=username
FTP_PASSWORD=password
FTP_PORT=21  # Optional, defaults to 21
FTP_SECURE=true  # Optional, defaults to false (use FTPS)
```

### Advanced Settings

Additional settings can be configured programmatically through the agent API:

- **Download Path**: Where synchronized files are stored locally
- **Max Retry Attempts**: Number of retry attempts for failed operations
- **Retry Delay**: Delay between retry attempts
- **Timeout**: Connection timeout settings
- **File Filters**: Patterns to include/exclude specific files

## Scheduled Synchronization

The FTP Data Agent supports scheduled synchronization with flexible interval settings:

### Enabling Scheduled Sync

```javascript
// Enable hourly synchronization
await ftpAgent.scheduleFtpSync({ 
  enabled: true, 
  intervalHours: 1 
});

// Enable daily synchronization (every 24 hours)
await ftpAgent.scheduleFtpSync({ 
  enabled: true, 
  intervalHours: 24 
});
```

### One-time Synchronization

```javascript
// Run a one-time sync now
await ftpAgent.scheduleFtpSync({ runOnce: true });
```

### Disabling Scheduled Sync

```javascript
// Disable scheduled synchronization
await ftpAgent.scheduleFtpSync({ enabled: false });
```

## REST API Endpoints

The FTP Data Agent exposes REST API endpoints for administration:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ftp/status` | GET | Get current FTP agent status |
| `/api/ftp/sync` | POST | Trigger manual synchronization |
| `/api/ftp/schedule` | POST | Configure synchronization schedule |
| `/api/ftp/files` | GET | List files on the FTP server |
| `/api/ftp/download` | POST | Download a specific file |

### Example Request (Configure Schedule)

```http
POST /api/ftp/schedule
Content-Type: application/json

{
  "enabled": true,
  "intervalHours": 24
}
```

## Command Line Interface

The FTP agent can be controlled through command-line tools:

### Testing Connection

```bash
node scripts/test-ftp-sync.js connect
```

### Checking Status

```bash
node scripts/test-ftp-sync.js status
```

### Manual Synchronization

```bash
node scripts/test-ftp-sync.js sync [/optional/path]
```

### Listing Files

```bash
node scripts/test-ftp-sync.js list /path/to/directory
```

### Configure Schedule

```bash
# Enable with 12-hour interval
node scripts/test-ftp-sync.js schedule --enable --interval=12

# Disable scheduling
node scripts/test-ftp-sync.js schedule --disable

# Run once immediately
node scripts/test-ftp-sync.js schedule --once
```

### Downloading Files

```bash
node scripts/test-ftp-sync.js download /path/to/remote/file.csv
```

## Automated Synchronization with Cron

For production deployments, the FTP agent is designed to be scheduled using cron jobs. Here are example cron entries:

### Hourly Synchronization

```
0 * * * * cd /path/to/app && node scripts/synchronize-benton-county-ftp.ts --silent
```

### Daily Synchronization (midnight)

```
0 0 * * * cd /path/to/app && node scripts/synchronize-benton-county-ftp.ts --silent
```

### Weekly Synchronization (Sunday midnight)

```
0 0 * * 0 cd /path/to/app && node scripts/synchronize-benton-county-ftp.ts --silent
```

## Setup Assistant

To help set up cron jobs automatically, use the setup assistant:

```bash
node scripts/setup-ftp-cron.js [hourly|daily|weekly]
```

This will generate the appropriate crontab entries and instructions for installation.

## Automated Testing

The FTP agent includes a comprehensive testing suite:

```bash
# Run the full test suite
scripts/run-ftp-tests.sh

# Run only basic tests (quick mode)
scripts/run-ftp-tests.sh --quick

# Run with actual synchronization (caution!)
scripts/run-ftp-tests.sh --force

# Test a specific file download
scripts/run-ftp-tests.sh --force --file=/path/to/test.csv
```

## Status Reporting

The FTP agent provides detailed status reporting, including:

- **Connection Status**: Current connection state
- **Synchronization Stats**: Success/failure counts and percentages
- **Last Sync Time**: When the last synchronization occurred
- **Next Sync Time**: When the next scheduled sync will occur
- **Active Operations**: Currently running FTP operations
- **Transferred Data**: Statistics on transferred files and bytes

## Error Handling & Debugging

The FTP agent includes robust error handling:

- **Automatic Retries**: Failed operations are automatically retried
- **Detailed Logs**: All operations are logged with timestamps
- **Error Classifications**: Errors are categorized (connection, authentication, permission, etc.)
- **Diagnostics**: Self-diagnostic capabilities for connection issues

Logs are saved to:
- `logs/ftp-agent.log`: Main operational logs
- `logs/ftp-error.log`: Detailed error logs
- `logs/ftp-sync.log`: Synchronization-specific logs

## API Reference

The FTP Data Agent exposes the following JavaScript API:

| Method | Description |
|--------|-------------|
| `initialize()` | Initialize the agent |
| `testFtpConnection()` | Test connection to FTP server |
| `getFtpStatus()` | Get current agent status |
| `scheduleFtpSync(options)` | Configure synchronization schedule |
| `synchronizeFtpData(path)` | Synchronize data from specified path |
| `listFtpFiles(path)` | List files in a directory |
| `downloadFtpFile(remotePath, localPath)` | Download a specific file |
| `getSyncScheduleInfo()` | Get human-readable schedule information |
| `checkSchedule()` | Check and run scheduled tasks if needed |

## Security Considerations

The FTP Data Agent implements several security best practices:

- **Credential Protection**: FTP credentials are never logged
- **Secure Connection**: FTPS support for encrypted data transfer
- **Restricted Access**: Downloads are restricted to configured directories
- **Input Validation**: All paths and parameters are validated
- **Content Verification**: File integrity checks

## Limitations & Known Issues

- The agent is optimized for structured data synchronization and may not be ideal for very large binary files
- To prevent memory issues, there is a 100MB size limit for individual files
- Synchronization of very large directories (10,000+ files) may take significant time

## Troubleshooting

Common issues and solutions:

| Issue | Solution |
|-------|----------|
| Connection failures | Check network connectivity, credentials, and firewall settings |
| Timeout errors | Increase timeout settings for larger files |
| Permission errors | Verify FTP user permissions on target directories |
| Scheduling issues | Check for clock synchronization problems |
| "Already in progress" errors | Use `--force` to override or wait for current sync to complete |