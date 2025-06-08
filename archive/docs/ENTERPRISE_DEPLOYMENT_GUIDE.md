# TerraFusion Enterprise Deployment Guide

## Overview

This guide provides multiple deployment options for TerraFusion, from quick local testing to full enterprise production deployment.

## Deployment Options

### 1. Quick Deploy (Recommended for Testing)

**Windows:**

```powershell
.\quick-deploy.ps1
```

**Linux/macOS:**

```bash
chmod +x quick-deploy.sh
./quick-deploy.sh
```

**Features:**

- Fixes module resolution issues
- Builds the application
- Starts single instance on http://localhost:3000
- Ready in ~2 minutes

### 2. Enterprise Production Deploy (Full Stack)

**Windows:**

```powershell
.\deploy-enterprise.ps1 [domain.com]
```

**Linux/macOS:**

```bash
chmod +x deploy-enterprise.sh
./deploy-enterprise.sh [domain.com]
```

**Features:**

- High Availability: 2 load-balanced app instances
- PostgreSQL: Production database with optimizations
- Redis: Session storage and caching
- Nginx: Load balancer with SSL support
- Monitoring: Prometheus + Grafana dashboards
- Security: Automated password generation
- Backups: Automatic daily database backups
- Docker: Containerized with health checks

## System Requirements

**Minimum:**

- RAM: 4GB+ (8GB recommended)
- Storage: 20GB+ free space
- OS: Linux, macOS, or Windows 10/11
- Docker: Required for enterprise deployment

## Post-Deployment

### Quick Deploy

- Application: http://localhost:3000
- Health check: http://localhost:3000/api/health

### Enterprise Deploy

- Application: http://your-domain.com
- Monitoring: http://your-domain.com:3001
- Update API keys in .env.production

## Management Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Check status
docker-compose -f docker-compose.prod.yml ps
```

## Success Indicators

**Quick Deploy:**

- Build completes without errors
- Server starts on port 3000
- Health check returns "OK"
- Frontend loads properly

**Enterprise Deploy:**

- All containers show "Up (healthy)"
- Load balancer responds
- Database accepts connections
- Monitoring dashboards accessible
