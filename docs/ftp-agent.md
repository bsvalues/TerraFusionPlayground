# FTP Agent Documentation

## Overview

The FTP Agent is a specialized component of the Property Intelligence Platform that handles downloading and processing property assessment data from external FTP servers. It is designed to automatically synchronize data files, process them into the appropriate format, and make them available for analysis by other system components.

## Architecture

The FTP Agent consists of several interconnected components:

1. **FTP Service**: Core service that handles FTP connections, file operations, and synchronization
2. **FTP Data Agent**: AI-powered agent that orchestrates FTP operations and analyzes downloaded data
3. **FTP Data Processor**: Service that converts downloaded files into structured data
4. **Scheduler**: Cron-based job scheduler for automated synchronization

## Key Features

### FTP Synchronization

- Connects to remote FTP servers using configurable credentials
- Downloads new and modified files while preserving directory structure
- Provides detailed status reporting and error handling
- Supports secure FTP connections (FTPS)
- Implements configurable retry logic for failed operations

### Error Handling and Reliability

- Automatically retries failed connections and downloads
- Implements exponential backoff for retries
- Prevents overlapping synchronization jobs
- Detailed logging of all operations and errors
- Recovery from interrupted downloads

### Scheduling and Automation

- Supports scheduled synchronization via cron expressions
- Prevents job overlap when previous job is still running
- Allows one-time manual synchronization
- Configurable frequency (default: every 6 hours)

### Data Processing

- Processes various file formats (CSV, fixed-width, XML)
- Applies configurable transformations and field mappings
- Validates data against predefined schemas
- Generates summaries of processed data

## Usage

### Basic Synchronization

To run a one-time synchronization:

```javascript
import { synchronizeBentonCountyFTP } from './scripts/synchronize-benton-county-ftp.js';

// Run the synchronization
synchronizeBentonCountyFTP()
  .then((result) => {
    console.log(`Synchronized ${result.filesDownloaded} files`);
  })
  .catch((error) => {
    console.error(`Synchronization failed: ${error.message}`);
  });
```

### Scheduled Synchronization

To set up scheduled synchronization:

```javascript
import { scheduleFtpSync } from './scripts/setup-ftp-cron.js';

// Schedule synchronization to run every 6 hours
const job = scheduleFtpSync('0 */6 * * *');

// To stop the scheduled job
job.stop();
```

### Data Processing

After files are downloaded, they can be processed:

```javascript
import { FtpDataProcessor } from './server/services/ftp-data-processor.js';

// Create processor instance
const processor = new FtpDataProcessor({
  downloadPath: './downloads/benton-county'
});

// Process a specific file
const result = await processor.processFile('property-assessment-data/properties.csv', {
  sourceFormat: 'csv',
  targetFormat: 'json',
  delimiter: ',',
  headerRow: true,
  mappings: {
    'AIN': 'parcelId',
    'SITUS_STREET': 'propertyAddress'
    // Additional field mappings...
  }
});

console.log(`Processed ${result.rowsProcessed} rows`);
```

## Configuration

The FTP Agent uses the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| FTP_HOST | Hostname of the FTP server | ftp.bentoncounty.spatialest.com |
| FTP_PORT | Port of the FTP server | 21 |
| FTP_USER | Username for FTP authentication | bcftp |
| FTP_PASSWORD | Password for FTP authentication | anonymous |
| FTP_SECURE | Whether to use secure FTP (FTPS) | false |

## Testing

Comprehensive test scripts are provided to ensure the FTP Agent works correctly:

- `scripts/test-ftp-sync.js`: Tests FTP connection and synchronization
- `scripts/test-ftp-data-processor.js`: Tests data processing functionality
- `scripts/run-ftp-tests.sh`: Runs all FTP-related tests

To run all tests:

```bash
./scripts/run-ftp-tests.sh
```

## API Reference

### FTP Service

#### `constructor(config)`

Creates a new FTP service instance with the specified configuration.

#### `initialize()`

Initializes the FTP service.

#### `connect()`

Connects to the FTP server.

#### `disconnect()`

Disconnects from the FTP server.

#### `syncDirectory(remotePath, options)`

Synchronizes a remote directory to the local file system.

### FTP Data Processor

#### `getSummary()`

Returns a summary of downloaded files.

#### `processFile(filePath, options)`

Processes a specific file with the given options.

#### `processDirectory(dirPath, options)`

Processes all files in a directory with the given options.

#### `getFixedWidthConfigs()`

Returns fixed-width format configurations.

#### `getFieldMappings()`

Returns available field mappings for different data sources.

## Troubleshooting

### Common Issues

1. **Connection failures**: Verify FTP credentials and connectivity to the server
2. **Permission errors**: Check that local directories are writable
3. **Processing errors**: Verify file formats and mappings match the expected structure

### Logs

The FTP Agent logs all operations to the standard application log. To view detailed logs:

```bash
grep "FTP" logs/application.log
```

## Future Enhancements

- Support for additional file formats and data sources
- Integration with cloud storage services
- Real-time change notification
- Data validation and cleansing during processing
- Delta sync to minimize data transfer