# Benton County Assessor's Office Platform

An AI-powered property tax assessment platform that simplifies complex property evaluation through intelligent data management and innovative insights.

## Overview

This platform modernizes the Benton County Assessor's Office operations by implementing a secure Model Context Protocol (MCP) architecture that integrates with their Property Appraisal and Collection System (PACS). The system provides a unified interface for property valuation, citizen inquiries, and administrative processes through secure AI agent interactions.

## Key Features

- **AI-enhanced property assessment**: Intelligent valuation models and data analysis
- **Secure MCP architecture**: Role-based access control and comprehensive security
- **PACS integration**: Seamless connectivity with existing property systems
- **FTP data synchronization**: Robust SpatialEst FTP integration with scheduled and on-demand sync
- **Appeals management**: Streamlined workflow for handling property assessment appeals
- **Advanced data visualization**: Interactive property data exploration tools
- **Public transparency portal**: Accessible property information for citizens

## Technology Stack

- **Frontend**: React with advanced data visualization using recharts
- **Backend**: Express with secure API architecture
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based with role-based access control
- **AI Integration**: LangChain framework with multiple AI provider support
- **Testing**: Comprehensive testing suite for API and UI validation

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Set up the database:
   ```
   npm run db:push
   ```

3. Import PACS modules:
   ```
   # Using API-based import (requires running server)
   node scripts/import-pacs-modules.js
   
   # Or using direct database import (no server required)
   node scripts/direct-import-pacs-modules.js
   
   # Or using the combined script
   bash scripts/run-import.sh [direct]
   ```

4. Start the development server:
   ```
   npm run dev
   ```

## MCP Architecture

The Model Context Protocol (MCP) architecture provides a secure, unified interface for AI agents to access property data:

1. **Authentication Layer**: Secures access with JWT tokens and API keys
2. **Security Layer**: Validates all inputs and prevents malicious attempts
3. **Tool Registry**: Provides a catalog of available data operations
4. **Integration Layer**: Connects to PACS and other data sources
5. **Audit & Logging**: Records all system activities for compliance

## Documentation

- [MCP Authentication](docs/mcp-authentication.md): Authentication system overview
- [MCP Security](docs/mcp-security.md): Security architecture details
- [PACS Module Integration](scripts/README.md): PACS module import tools and usage
- [FTP Data Agent](docs/ftp-agent.md): FTP data synchronization capabilities
- Additional documentation is available in the [docs](docs) directory

## Data Integration

### FTP Data Synchronization

The platform includes a robust FTP data synchronization agent that connects to the SpatialEst FTP server to retrieve property data. Key features include:

1. **Scheduled Synchronization**
   - Configurable interval-based scheduling (1 hour to 7 days)
   - One-time synchronization option for immediate data updates
   - Smart overlap prevention to avoid conflicting sync jobs

2. **Enhanced Reliability**
   - Automatic retry with exponential backoff for transient failures
   - Detailed operation status tracking and reporting
   - Human-readable schedule information with time remaining display

3. **Data Validation**
   - File format verification before processing
   - Comprehensive data integrity checks
   - Detailed import statistics and error reporting

4. **Testing and Monitoring**
   - Unit tests to verify scheduling functionality
   - Manual testing script for simulation and verification
   - Detailed sync history and performance metrics

To test FTP synchronization functionality:
```
node scripts/test-ftp-sync.js status       # Check current status
node scripts/test-ftp-sync.js schedule 12  # Schedule sync every 12 hours
node scripts/test-ftp-sync.js run-once     # Run a one-time sync
```

## Development Guidelines

- Use the memory storage interface in `server/storage.ts` for data operations
- Add new routes in `server/routes.ts`
- Define data models in `shared/schema.ts` to ensure consistency
- Add MCP tools in `server/services/mcp.ts`

## Security Considerations

This system handles sensitive property data and implements multiple security layers:

- Authentication and authorization with role-based access
- Input validation and sanitization for all data
- Threat detection for SQL injection, XSS and other attacks
- Rate limiting and request throttling
- Comprehensive audit logging

## License

Copyright © 2024 Benton County Assessor's Office. All rights reserved.