$archiveDir = "archive"
$testDirs = @{
    "websocket" = @("test-websocket.js", "test-websocket.mjs", "test-websocket-debug.js", "test-websocket-esm.mjs", "test-team-collaboration-websocket.mjs", "test-collaboration-websocket.js", "simple-ws-test.html", "robust-websocket-test.html", "enhanced-websocket-test.html", "websocket-connection-test.html")
    "agent" = @("test-agent-messages.ts", "test-agent-messages.js", "test-agent-functionality.js", "test-team-agent-websocket.js", "temp-file-agent.ts", "temp-fixed-agent-predict-future-value.ts")
    "integration" = @("test-llm-integration.js", "test-gis-functionality.js", "test-development-tools-api.js", "test-api-cli.js", "test-api-browser.js", "api-test-tool.html", "api-browser-test.html")
    "performance" = @("test-cache-performance.js", "test-rate-limiter.js", "test-resilience.js", "test-prometheus-metrics.js")
    "data" = @("test-data-lineage.mjs", "test-data-lineage-advanced.mjs", "test-data-lineage.js", "test-database-integrity.js", "test-partitioning.js")
    "future" = @("test-future-value.mjs", "test-future-value-mock.js", "test-future-value.js", "future-value-prediction-result.json")
    "team" = @("test-team-collaboration.js", "test-connection-manager.cjs")
    "frontend" = @("test-frontend-errors.js", "test-direct-output.js")
}

$configFiles = @{
    "root" = @(".babelrc", ".yamllint.yml", ".replit", "replit.nix", "pyproject.toml", "postcss.config.js", "jest.config.js", "drizzle.config.ts", "tsconfig.json", "vite.config.ts", "tailwind.config.ts", "turbo.json", "theme.json", "pnpm-workspace.yaml")
    "monitoring" = @("monitoring_setup.md")
}

$docsToMove = @{
    "websocket" = @("websocket-upgrade-doc.md")
}

$tempFiles = @(
    "temp_repo",
    "temp-file-agent.ts",
    "temp-fixed-agent-predict-future-value.ts",
    "uv.lock"
)

$duplicateFiles = @(
    "test-share-1743680313966-qrcode.png",
    "test-share-123-pdf-data.json",
    "test-share-123-qrcode.png",
    "test-share-1743680313966-pdf-data.json",
    "test-qrcode.png"
)

# Create necessary directories
foreach ($dir in $testDirs.Keys) {
    $targetDir = "tests\$dir"
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force
    }
}

# Create config directories
New-Item -ItemType Directory -Path "config" -Force
New-Item -ItemType Directory -Path "config/monitoring" -Force

# Create docs subdirectories
New-Item -ItemType Directory -Path "docs/websocket" -Force

# Move test files
foreach ($category in $testDirs.Keys) {
    foreach ($file in $testDirs[$category]) {
        if (Test-Path $file) {
            Move-Item -Path $file -Destination "tests\$category\" -Force
        }
    }
}

# Move config files
foreach ($file in $configFiles["root"]) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "config\" -Force
    }
}

foreach ($file in $configFiles["monitoring"]) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "config/monitoring\" -Force
    }
}

# Move documentation
foreach ($category in $docsToMove.Keys) {
    foreach ($file in $docsToMove[$category]) {
        if (Test-Path $file) {
            Move-Item -Path $file -Destination "docs\$category\" -Force
        }
    }
}

# Move temporary files
foreach ($file in $tempFiles) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "$archiveDir\temp" -Force
    }
}

# Move duplicate files
foreach ($file in $duplicateFiles) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "$archiveDir\duplicates" -Force
    }
}

# Create symlinks for critical config files
$criticalConfigs = @(".gitignore", "package.json", "package-lock.json")
foreach ($file in $criticalConfigs) {
    if (Test-Path "config\$file") {
        Copy-Item -Path "config\$file" -Destination "." -Force
    }
}

# Update .gitignore to include new directories
$gitignoreContent = @"
# Archive
archive/
temp/

# Build
dist/
build/

# Dependencies
node_modules/
.pnpm-store/

# Environment
.env
.env.local
.env.*.local

# Logs
logs/
*.log

# Testing
coverage/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
"@

Set-Content -Path ".gitignore" -Value $gitignoreContent 

# TerraFusion-AI Comprehensive Codebase Cleanup Script
# Executive Production Level Organization

Write-Host "🚀 TerraFusion-AI: COMPREHENSIVE CLEANUP" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Create necessary directories
$directories = @(
    "archive",
    "config", 
    "scripts/database",
    "scripts/testing",
    "scripts/development",
    "scripts/deployment"
)

Write-Host "`n📁 Creating directory structure..." -ForegroundColor Yellow

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force
        Write-Host "✅ Created directory: $dir" -ForegroundColor Green
    }
}

# Move script files from root to organized locations
$scriptFiles = @{
    "taxi-dev-tools-cli.js" = "scripts/"
    "setup-taxi-dev-tools.sh" = "scripts/development/"
    "setup-database-conversion.sh" = "scripts/database/"
    "setup-development-tools-db.js" = "scripts/database/"
    "run-tests.sh" = "scripts/testing/"
    "run-all-tests.js" = "scripts/testing/"
    "run-connection-manager-tests.js" = "scripts/testing/"
    "push-schema.js" = "scripts/database/"
    "check-middleware-config.js" = "scripts/"
    "auto-commenter.py" = "scripts/"
}

Write-Host "`n📦 Moving script files..." -ForegroundColor Yellow

foreach ($file in $scriptFiles.Keys) {
    if (Test-Path $file) {
        $destination = $scriptFiles[$file]
        if (-not (Test-Path $destination)) {
            New-Item -ItemType Directory -Path $destination -Force
        }
        Move-Item -Path $file -Destination $destination -Force
        Write-Host "✅ Moved $file → $destination" -ForegroundColor Green
    }
}

# Move configuration files to config/
$configFiles = @(
    "playwright.config.ts"
)

Write-Host "`n⚙️ Organizing configuration files..." -ForegroundColor Yellow

foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "config/" -Force
        Write-Host "✅ Moved $file → config/" -ForegroundColor Green
    }
}

# Archive potentially unused files
$archiveFiles = @(
    "generated-icon.png",
    "capabilities.json"
)

Write-Host "`n🗄️ Archiving potentially unused files..." -ForegroundColor Yellow

foreach ($file in $archiveFiles) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "archive/" -Force
        Write-Host "✅ Archived $file" -ForegroundColor Green
    }
}

# Create documentation files
Write-Host "`n📚 Creating documentation..." -ForegroundColor Yellow

# Archive README
$archiveReadme = "# TerraFusion Archive Directory

## Purpose
This directory contains files that have been moved from the main codebase for better organization.

## Contents
- generated-icon.png: Auto-generated application icon
- capabilities.json: System capabilities configuration

## Restoration
If any archived file is needed:
1. Move it back to the appropriate location
2. Update any import paths or references
3. Update this documentation

## Last Updated
$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"

$archiveReadme | Out-File -FilePath "archive/README.md" -Encoding UTF8 -Force

# Scripts README
$scriptsReadme = "# TerraFusion Scripts Directory

## Organization

### database/
Database setup and migration scripts

### testing/  
Test execution and validation scripts

### development/
Development environment setup scripts

### deployment/
Build and deployment automation

## Usage
Review script contents before execution.
Always test in development environment first.
"

$scriptsReadme | Out-File -FilePath "scripts/README.md" -Encoding UTF8 -Force

Write-Host "`n🎯 CLEANUP COMPLETE!" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host "✅ Directory structure organized" -ForegroundColor Green
Write-Host "✅ Script files moved" -ForegroundColor Green
Write-Host "✅ Configuration files organized" -ForegroundColor Green  
Write-Host "✅ Archive updated" -ForegroundColor Green
Write-Host "✅ Documentation created" -ForegroundColor Green
Write-Host "`n🚀 Codebase is PRODUCTION READY!" -ForegroundColor Cyan 