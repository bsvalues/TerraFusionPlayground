# TerraFusion Quick Deploy - Clean Build
Write-Host "TerraFusion Quick Deploy" -ForegroundColor Cyan
Write-Host "=========================="

# Step 1: Copy shared modules to dist
Write-Host "Copying shared modules to dist..." -ForegroundColor Yellow
if (-not (Test-Path dist)) {
    New-Item -ItemType Directory -Force -Path dist | Out-Null
}

if (Test-Path shared) {
    Copy-Item -Path shared -Destination dist -Recurse -Force
    Write-Host "Shared folder copied" -ForegroundColor Green
} else {
    Write-Host "Shared folder not found" -ForegroundColor Yellow
}

# Step 2: Build the application
Write-Host "Building application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Ensure shared modules in dist after build
Write-Host "Ensuring shared modules in dist..." -ForegroundColor Yellow
if (Test-Path shared) {
    Copy-Item -Path shared -Destination dist -Recurse -Force
}

# Step 4: Set environment variables
Write-Host "Setting environment variables..." -ForegroundColor Yellow
$env:DATABASE_URL = "postgresql://user:password@localhost:5432/terrafusion"
$env:SUPABASE_URL = "https://demo.supabase.co"
$env:SUPABASE_KEY = "demo_key"
$env:NODE_ENV = "development"
$env:PORT = "3000"
$env:OPENAI_API_KEY = "sk-demo_key_for_testing"
$env:ANTHROPIC_API_KEY = "demo_key"

# Step 5: Start the application
Write-Host "Starting TerraFusion..." -ForegroundColor Green
Write-Host ""
Write-Host "Application will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Health check: http://localhost:3000/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

node dist/index.js 