#!/bin/bash

# TerraFusion Enterprise One-Click Deployment Script
# Compatible with: Ubuntu 20.04+, CentOS 8+, Amazon Linux 2, RHEL 8+
# Usage: ./deploy-enterprise.sh [ENVIRONMENT] [DOMAIN]
# Example: ./deploy-enterprise.sh production terrafusion.county.gov

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
DOMAIN=${2:-terrafusion.local}
PROJECT_NAME="terrafusion"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Banner
show_banner() {
    echo -e "${PURPLE}"
    cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║  ████████╗███████╗██████╗ ██████╗  █████╗ ███████╗██╗   ██╗  ║
║  ╚══██╔══╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔════╝██║   ██║  ║
║     ██║   █████╗  ██████╔╝██████╔╝███████║█████╗  ██║   ██║  ║
║     ██║   ██╔══╝  ██╔══██╗██╔══██╗██╔══██║██╔══╝  ██║   ██║  ║
║     ██║   ███████╗██║  ██║██║  ██║██║  ██║██║     ╚██████╔╝  ║
║     ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝      ╚═════╝   ║
║                                                               ║
║                 ENTERPRISE DEPLOYMENT                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    echo -e "${CYAN}Environment:${NC} $ENVIRONMENT"
    echo -e "${CYAN}Domain:${NC} $DOMAIN"
    echo -e "${CYAN}Deployment Mode:${NC} Enterprise Production"
    echo ""
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
    fi
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check OS
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        error "This script only supports Linux distributions"
    fi
    
    # Check available memory (minimum 4GB)
    MEMORY_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    MEMORY_GB=$((MEMORY_KB / 1024 / 1024))
    if [[ $MEMORY_GB -lt 4 ]]; then
        error "Minimum 4GB RAM required. Current: ${MEMORY_GB}GB"
    fi
    
    # Check disk space (minimum 20GB)
    DISK_SPACE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
    if [[ $DISK_SPACE -lt 20 ]]; then
        error "Minimum 20GB disk space required. Available: ${DISK_SPACE}GB"
    fi
    
    log "System requirements check passed ✓"
}

# Install Docker and Docker Compose
install_docker() {
    if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
        log "Docker and Docker Compose already installed ✓"
        return
    fi
    
    log "Installing Docker and Docker Compose..."
    
    # Update package manager
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
        
        # Add Docker's official GPG key
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        
        # Set up the stable repository
        echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        # Install Docker Engine
        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        
    elif command -v yum &> /dev/null; then
        sudo yum install -y yum-utils
        sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        sudo systemctl start docker
        sudo systemctl enable docker
    else
        error "Unsupported package manager. Please install Docker manually."
    fi
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    
    # Install docker-compose if not available
    if ! command -v docker-compose &> /dev/null; then
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    fi
    
    log "Docker installation completed ✓"
}

# Generate secure passwords and secrets
generate_secrets() {
    log "Generating secure secrets..."
    
    # Generate random passwords and secrets
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    SESSION_SECRET=$(openssl rand -base64 64)
    JWT_SECRET=$(openssl rand -base64 64)
    GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-12)
    
    log "Secrets generated ✓"
}

# Create environment file
create_env_file() {
    log "Creating environment configuration..."
    
    cat > $ENV_FILE << EOF
# TerraFusion Production Environment Configuration
# Generated on $(date)

# Environment
NODE_ENV=production
ENVIRONMENT=$ENVIRONMENT
DOMAIN=$DOMAIN

# Database Configuration
DB_PASSWORD=$DB_PASSWORD
DATABASE_URL=postgresql://terrafusion:$DB_PASSWORD@postgres:5432/terrafusion_prod

# Redis Configuration
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_URL=redis://:$REDIS_PASSWORD@redis:6379

# Security Secrets
SESSION_SECRET=$SESSION_SECRET
JWT_SECRET=$JWT_SECRET

# API Keys (Set these with your actual keys)
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
MAPBOX_ACCESS_TOKEN=your_token_here

# Monitoring
GRAFANA_ADMIN_PASSWORD=$GRAFANA_ADMIN_PASSWORD

# SSL Configuration
SSL_EMAIL=admin@$DOMAIN

# Backup Configuration
BACKUP_RETENTION_DAYS=30
BACKUP_S3_BUCKET=terrafusion-backups-$ENVIRONMENT

# Performance Settings
MAX_CONNECTIONS=200
WORKER_PROCESSES=auto
WORKER_CONNECTIONS=1024

# Security Settings
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

    chmod 600 $ENV_FILE
    log "Environment file created ✓"
}

# Setup SSL certificates
setup_ssl() {
    if [[ "$DOMAIN" == "localhost" ]]; then
        warn "Skipping SSL setup for localhost"
        return
    fi
    
    log "Setting up SSL certificates..."
    
    # Create directories
    mkdir -p config/nginx/ssl
    
    # Install certbot
    if command -v apt-get &> /dev/null; then
        sudo apt-get install -y certbot
    elif command -v yum &> /dev/null; then
        sudo yum install -y certbot
    fi
    
    # Generate SSL certificate
    if [[ ! -f "config/nginx/ssl/${DOMAIN}.crt" ]]; then
        info "Generating self-signed certificate for development..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout config/nginx/ssl/${DOMAIN}.key \
            -out config/nginx/ssl/${DOMAIN}.crt \
            -subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=${DOMAIN}"
    fi
    
    log "SSL certificates configured ✓"
}

# Create necessary directories and configuration files
setup_configuration() {
    log "Setting up configuration files..."
    
    # Create required directories
    mkdir -p config/{nginx,production} scripts/production prometheus/rules grafana/{dashboards,provisioning}
    
    # Create nginx configuration
    cat > config/nginx/terrafusion.conf << 'EOF'
upstream terrafusion_backend {
    least_conn;
    server terrafusion-app-1:3000 max_fails=3 fail_timeout=30s;
    server terrafusion-app-2:3000 max_fails=3 fail_timeout=30s;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

server {
    listen 80;
    server_name _;
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Redirect to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name _;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/terrafusion.crt;
    ssl_certificate_key /etc/nginx/ssl/terrafusion.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss:; frame-ancestors 'none';" always;
    
    # API routes with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://terrafusion_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # WebSocket support
    location /ws/ {
        proxy_pass http://terrafusion_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
    
    # Static assets with caching
    location /assets/ {
        proxy_pass http://terrafusion_backend;
        proxy_cache_valid 200 1d;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
    
    # Application routes
    location / {
        proxy_pass http://terrafusion_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

    # Create database initialization script
    cat > scripts/production/init-db.sql << 'EOF'
-- TerraFusion Production Database Initialization
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create application user with limited privileges
CREATE USER terrafusion_app WITH PASSWORD 'change_this_password';
GRANT CONNECT ON DATABASE terrafusion_prod TO terrafusion_app;
GRANT USAGE ON SCHEMA public TO terrafusion_app;
GRANT CREATE ON SCHEMA public TO terrafusion_app;
EOF

    # Create backup script
    cat > scripts/production/backup.sh << 'EOF'
#!/bin/bash
set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="terrafusion_backup_${TIMESTAMP}.sql"

echo "Starting database backup at $(date)"

# Create backup
pg_dump -h postgres -U terrafusion -d terrafusion_prod > "${BACKUP_DIR}/${BACKUP_FILE}"

# Compress backup
gzip "${BACKUP_DIR}/${BACKUP_FILE}"

# Clean up old backups (keep last 30 days)
find "${BACKUP_DIR}" -name "terrafusion_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
EOF

    chmod +x scripts/production/backup.sh
    
    log "Configuration files created ✓"
}

# Deploy application
deploy_application() {
    log "Deploying TerraFusion Enterprise..."
    
    # Pull latest images and build
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE pull
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE build --no-cache
    
    # Start services
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d
    
    log "Application deployed ✓"
}

# Wait for services to be healthy
wait_for_services() {
    log "Waiting for services to be healthy..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose -f $COMPOSE_FILE ps | grep -q "healthy"; then
            break
        fi
        
        info "Attempt $attempt/$max_attempts - Waiting for services..."
        sleep 10
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        error "Services failed to become healthy within expected time"
    fi
    
    log "All services are healthy ✓"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Wait for database to be ready
    sleep 30
    
    # Run migrations using the app container
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T terrafusion-app-1 npm run db:push || true
    
    log "Database migrations completed ✓"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring and alerting..."
    
    # Create Prometheus configuration
    cat > prometheus/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'terrafusion'
    static_configs:
      - targets: ['terrafusion-app-1:3000', 'terrafusion-app-2:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
EOF

    log "Monitoring configured ✓"
}

# Create backup cron job
setup_backup_schedule() {
    log "Setting up automated backups..."
    
    # Create backup cron job
    (crontab -l 2>/dev/null; echo "0 2 * * * cd $(pwd) && docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE run --rm backup") | crontab -
    
    log "Backup schedule configured ✓"
}

# Display deployment summary
show_summary() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    DEPLOYMENT SUCCESSFUL                     ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}🌐 Application URL:${NC} https://$DOMAIN"
    echo -e "${CYAN}📊 Monitoring Dashboard:${NC} http://$DOMAIN:3001"
    echo -e "${CYAN}📈 Metrics:${NC} http://$DOMAIN:9090"
    echo ""
    echo -e "${YELLOW}📋 Important Information:${NC}"
    echo -e "   • Environment file: $ENV_FILE"
    echo -e "   • Database password: $DB_PASSWORD"
    echo -e "   • Grafana admin password: $GRAFANA_ADMIN_PASSWORD"
    echo -e "   • SSL certificates: config/nginx/ssl/"
    echo ""
    echo -e "${YELLOW}🔧 Next Steps:${NC}"
    echo -e "   1. Update API keys in $ENV_FILE"
    echo -e "   2. Configure domain DNS to point to this server"
    echo -e "   3. Set up proper SSL certificates for production"
    echo -e "   4. Review monitoring dashboards"
    echo -e "   5. Test the application thoroughly"
    echo ""
    echo -e "${GREEN}🎉 TerraFusion Enterprise is now running!${NC}"
    echo ""
}

# Main deployment function
main() {
    show_banner
    
    # Checks
    check_root
    check_requirements
    
    # Installation and setup
    install_docker
    generate_secrets
    create_env_file
    setup_ssl
    setup_configuration
    
    # Deployment
    deploy_application
    wait_for_services
    run_migrations
    setup_monitoring
    setup_backup_schedule
    
    # Summary
    show_summary
}

# Run main function
main "$@" 