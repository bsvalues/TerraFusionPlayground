# TerraFusion Enterprise One-Click Deployment Script (PowerShell)
# Usage: .\deploy-enterprise.ps1 [Domain]

param(
    [string]$Domain = "terrafusion.local"
)

# Color output functions
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-ColorOutput "[$timestamp] $Message" "Green"
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "[ERROR] $Message" "Red"
    exit 1
}

# Show banner
Write-ColorOutput @"
╔═══════════════════════════════════════════════════════════════╗
║               TerraFusion Enterprise Deployment              ║
╚═══════════════════════════════════════════════════════════════╝
"@ "Blue"

Write-Log "Starting TerraFusion Enterprise deployment for domain: $Domain"

# Check if Docker Desktop is running
if (-not (Get-Process "Docker Desktop" -ErrorAction SilentlyContinue)) {
    if (Get-Command "docker" -ErrorAction SilentlyContinue) {
        Write-Log "Docker found but not running. Please start Docker Desktop."
    } else {
        Write-Error "Docker not found. Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    }
}

# Generate secure passwords
Write-Log "Generating secure passwords..."
function New-RandomPassword {
    param([int]$Length = 25)
    $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    $password = ""
    for ($i = 0; $i -lt $Length; $i++) {
        $password += $chars[(Get-Random -Maximum $chars.Length)]
    }
    return $password
}

$DbPassword = New-RandomPassword
$RedisPassword = New-RandomPassword
$SessionSecret = New-RandomPassword -Length 64
$JwtSecret = New-RandomPassword -Length 64
$GrafanaPassword = New-RandomPassword -Length 12

# Create environment file
Write-Log "Creating environment configuration..."
$envContent = @"
NODE_ENV=production
DOMAIN=$Domain
DB_PASSWORD=$DbPassword
REDIS_PASSWORD=$RedisPassword
SESSION_SECRET=$SessionSecret
JWT_SECRET=$JwtSecret
GRAFANA_ADMIN_PASSWORD=$GrafanaPassword
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
MAPBOX_ACCESS_TOKEN=your_token_here
"@

$envContent | Out-File -FilePath ".env.production" -Encoding UTF8

# Create necessary directories
Write-Log "Creating configuration directories..."
@("config\nginx", "config\production", "scripts\production") | ForEach-Object {
    if (-not (Test-Path $_)) {
        New-Item -ItemType Directory -Force -Path $_ | Out-Null
    }
}

# Build application
Write-Log "Building application for production..."
npm run build:production
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed. Please check the build output above."
}

# Check if Docker Compose file exists
if (-not (Test-Path "docker-compose.prod.yml")) {
    Write-Error "docker-compose.prod.yml not found. Please ensure it exists in the current directory."
}

# Start deployment
Write-Log "Starting services with Docker Compose..."
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker Compose deployment failed."
}

# Wait for services
Write-Log "Waiting for services to start..."
Start-Sleep -Seconds 60

# Check service health
Write-Log "Checking service health..."
$services = docker-compose -f docker-compose.prod.yml ps
if ($services -match "Up") {
    Write-Log "✅ Services are running!"
} else {
    Write-Error "❌ Some services failed to start. Check: docker-compose -f docker-compose.prod.yml logs"
}

# Display summary
Write-ColorOutput @"

╔═══════════════════════════════════════════════════════════════╗
║                 DEPLOYMENT SUCCESSFUL!                       ║
╚═══════════════════════════════════════════════════════════════╝

"@ "Green"

Write-ColorOutput "🌐 Application: http://$Domain" "Yellow"
Write-ColorOutput "📊 Monitoring: http://${Domain}:3001" "Yellow"
Write-ColorOutput "🔒 Database Password: $DbPassword" "Yellow"
Write-ColorOutput "🔑 Grafana Password: $GrafanaPassword" "Yellow"

Write-ColorOutput "`nNext steps:" "Blue"
Write-Host "1. Update API keys in .env.production"
Write-Host "2. Configure your domain DNS"
Write-Host "3. Set up SSL certificates"

Write-ColorOutput "`n🎉 TerraFusion Enterprise is now running!" "Green"

# Show useful commands
Write-ColorOutput "`nUseful commands:" "Cyan"
Write-Host "• View logs: docker-compose -f docker-compose.prod.yml logs -f"
Write-Host "• Stop services: docker-compose -f docker-compose.prod.yml down"
Write-Host "• Restart services: docker-compose -f docker-compose.prod.yml restart"
Write-Host "• Check status: docker-compose -f docker-compose.prod.yml ps" 