# TerraFusion Quick Deploy - Fix module resolution and start app
# PowerShell version for Windows

Write-Host "🚀 TerraFusion Quick Deploy" -ForegroundColor Green
Write-Host "==========================" -ForegroundColor Green

# Step 1: Fix module resolution by copying shared folder
Write-Host "📁 Copying shared modules to dist..." -ForegroundColor Yellow
if (-not (Test-Path "dist")) {
    New-Item -ItemType Directory -Force -Path "dist" | Out-Null
}

if (Test-Path "shared") {
    Copy-Item -Path "shared" -Destination "dist" -Recurse -Force
    Write-Host "✅ Shared folder copied" -ForegroundColor Green
} else {
    Write-Host "⚠️ Shared folder not found" -ForegroundColor Yellow
}

# Step 2: Ensure theme.json is in root for build
Write-Host "🎨 Ensuring theme configuration..." -ForegroundColor Yellow
if (Test-Path "config\theme.json") {
    Copy-Item "config\theme.json" "theme.json" -Force
    Write-Host "✅ Theme configuration copied" -ForegroundColor Green
}

# Step 3: Build the application
Write-Host "🔨 Building application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Step 4: Copy shared again after build (ensure it's there)
Write-Host "📁 Ensuring shared modules in dist..." -ForegroundColor Yellow
if (Test-Path "shared") {
    Copy-Item -Path "shared" -Destination "dist" -Recurse -Force
}

# Step 5: Set environment
$env:NODE_ENV = "production"

# Step 6: Start the application
Write-Host "🚀 Starting TerraFusion..." -ForegroundColor Green
Write-Host ""
Write-Host "✅ Application will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "📊 Health check: http://localhost:3000/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor White
Write-Host ""

try {
    node dist/index.js
} catch {
    Write-Host "❌ Failed to start application. Check the build output above." -ForegroundColor Red
    exit 1
} 