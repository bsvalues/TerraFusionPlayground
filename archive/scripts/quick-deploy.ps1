# TerraFusion Quick Deploy - Fix module resolution and start app
# PowerShell version for Windows

Write-Host "🚀 TerraFusion Quick Deploy" -ForegroundColor Cyan
Write-Host "=========================="

# Step 1: Copy shared modules to dist
Write-Host "🏠 Copying shared modules to dist..." -ForegroundColor Yellow
if (-not (Test-Path dist)) {
    New-Item -ItemType Directory -Force -Path dist | Out-Null
}

if (Test-Path shared) {
    Copy-Item -Path shared -Destination dist -Recurse -Force
    Write-Host "✅ Shared folder copied" -ForegroundColor Green
} else {
    Write-Host "⚠️ Shared folder not found" -ForegroundColor Yellow
}

# Step 2: Ensure theme.json is in root for build
Write-Host "🎨 Ensuring theme configuration..." -ForegroundColor Yellow
if (Test-Path config\theme.json) {
    Copy-Item config\theme.json theme.json -Force
    Write-Host "✅ Theme configuration copied" -ForegroundColor Green
}

# Step 3: Build the application
Write-Host "🔨 Building application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Step 4: Ensure shared modules in dist after build
Write-Host "🏠 Ensuring shared modules in dist..." -ForegroundColor Yellow
if (Test-Path shared) {
    Copy-Item -Path shared -Destination dist -Recurse -Force
}

# Step 5: Load environment variables from .env.local
Write-Host "⚙️ Loading environment variables..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $name = $matches[1]
            $value = $matches[2]
            Set-Variable -Name "env:$name" -Value $value
            Write-Host "  ✓ Set $name" -ForegroundColor Green
        }
    }
} else {
    Write-Host "⚠️ .env.local not found, using default values" -ForegroundColor Yellow
    $env:DATABASE_URL = "postgresql://user:password@localhost:5432/terrafusion"
    $env:SUPABASE_URL = "https://demo.supabase.co"
    $env:SUPABASE_KEY = "demo_key"
    $env:NODE_ENV = "development"
    $env:PORT = "3000"
    $env:OPENAI_API_KEY = "sk-demo_key_for_testing"
}

# Step 6: Start the application
Write-Host "🚀 Starting TerraFusion..." -ForegroundColor Green
Write-Host ""
Write-Host "✅ Application will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🩺 Health check: http://localhost:3000/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

try {
    node dist/index.js
} catch {
    Write-Host "❌ Failed to start application. Check the build output above." -ForegroundColor Red
    exit 1
} 