# TerraFusion Platform

An advanced geospatial intelligence platform with a sophisticated multi-agent architecture, designed for intelligent workflow optimization and extensible plugin ecosystems.

## Overview

TerraFusion is an enterprise-ready geospatial platform with a modular monorepo architecture. It integrates advanced AI capabilities, offline synchronization, and collaborative editing features to support field operations even in disconnected environments. The platform leverages CRDT technology for conflict-free merging of changes and provides a comprehensive plugin ecosystem for extensibility.

## Key Features

- **Offline-First Architecture**: Complete offline functionality with CRDT-based synchronization
- **Mobile-Ready Design**: Works seamlessly across web, mobile, and desktop platforms
- **Conflict Resolution System**: Intuitive UI for resolving data conflicts from offline edits
- **Offline GIS**: Map tile caching and spatial data editing in disconnected environments
- **Multi-Agent System**: Advanced AI capabilities with multiple provider support
- **Extensible Plugin Architecture**: Marketplace with payment integration for premium plugins
- **Enterprise-Ready Compliance**: SOC2 and ISO27001 compliance modules with evidence collection
- **Developer Portal**: Comprehensive tools for third-party developers and integration partners

## Technology Stack

- **Monorepo Architecture**: TurboRepo and pnpm workspaces for optimized builds and dependency management
- **Frontend**: React with TypeScript, Tailwind CSS, and advanced component library
- **Mobile**: React Native with Realm for mobile data persistence
- **Backend**: Express with secure API architecture and real-time WebSocket support
- **Offline Sync**: CRDT-based data synchronization using Yjs and IndexedDB/Realm
- **Geospatial**: OpenLayers and Mapbox integration with offline tile caching
- **AI Integration**: LangChain framework with multiple AI provider support (OpenAI, Anthropic)
- **Database**: PostgreSQL with Drizzle ORM and partitioning strategies
- **Testing**: E2E testing with Playwright and comprehensive unit tests

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
- [FTP Testing Framework](docs/ftp-testing.md): Comprehensive testing suite for FTP functionality
- [WebSocket Connectivity](docs/WEBSOCKET-CONNECTIVITY.md): Browser compatibility and fallback mechanisms
- [Observability](observability/slo/SLOs_and_error_budgets.md): SLIs, SLOs, and error budget policies
- [Incident Management](docs/incident-management-runbook.md): Runbook for performance incidents
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
   - Comprehensive testing framework with unified test runner
   - Unit tests to verify scheduling functionality 
   - Data processor verification for fixed-width file parsing
   - Lock mechanism testing to prevent concurrent synchronization
   - Detailed sync history and performance metrics

For FTP synchronization testing:
```bash
# Run all FTP-related tests
./scripts/run-ftp-tests.sh

# Run specific test groups
./scripts/run-ftp-tests.sh --connection    # Test FTP connection only
./scripts/run-ftp-tests.sh --directories   # Test directory structure only
./scripts/run-ftp-tests.sh --processor     # Test data processor only
./scripts/run-ftp-tests.sh --scheduler     # Test scheduler only

# Individual test commands
node scripts/test-ftp-sync.js --small-sync-only       # Run small sync test
node scripts/test-ftp-sync.js --check-dirs            # Check directory structure
node scripts/test-ftp-data-processor.js --test-configs # Test processor configs
```

## Development Guidelines

- Use the memory storage interface in `server/storage.ts` for data operations
- Add new routes in `server/routes.ts`
- Define data models in `shared/schema.ts` to ensure consistency
- Add MCP tools in `server/services/mcp.ts`

## CI/CD Pipeline

TerraFusion employs a robust CI/CD pipeline to ensure code quality and automate deployments:

### Observability CI

The **Observability CI** workflow ensures that all monitoring configurations are properly validated before deployment:

1. **Linting**:
   - Validates YAML syntax in Prometheus rules and Grafana configurations
   - Uses `yamllint` and `promtool` for validation

2. **Smoke Testing**:
   - Tests health endpoints for all services
   - Verifies WebSocket connectivity
   - Confirms metrics are properly exposed and collected

3. **Deployment**:
   - Automatically deploys validated configurations to staging
   - Tags commits for traceability
   - Posts status updates to pull requests

To run the pipeline locally:
```bash
# Run lint checks only
npm run observability:lint

# Run smoke tests
npm run observability:test

# Run full pipeline without deploying
npm run observability:verify
```

Configurations are first deployed to staging and monitored before being promoted to production.

## Security Considerations

This system handles sensitive property data and implements multiple security layers:

- Authentication and authorization with role-based access
- Input validation and sanitization for all data
- Threat detection for SQL injection, XSS and other attacks
- Rate limiting and request throttling
- Comprehensive audit logging

## License

Copyright © 2024 Benton County Assessor's Office. All rights reserved.