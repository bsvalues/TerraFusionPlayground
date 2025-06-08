#!/bin/bash
# TerraFusion Quick Deploy - Fix module resolution and start app
set -e

echo "🚀 TerraFusion Quick Deploy"
echo "=========================="

# Step 1: Fix module resolution by copying shared folder
echo "📁 Copying shared modules to dist..."
mkdir -p dist
cp -r shared dist/ 2>/dev/null || echo "Shared folder copied or already exists"

# Step 2: Ensure theme.json is in root for build
echo "🎨 Ensuring theme configuration..."
if [ -f "config/theme.json" ]; then
    cp config/theme.json ./theme.json
fi

# Step 3: Build the application
echo "🔨 Building application..."
npm run build

# Step 4: Copy shared again after build (ensure it's there)
echo "📁 Ensuring shared modules in dist..."
cp -r shared dist/

# Step 5: Set environment
export NODE_ENV=production

# Step 6: Start the application
echo "🚀 Starting TerraFusion..."
echo ""
echo "✅ Application will be available at: http://localhost:3000"
echo "📊 Health check: http://localhost:3000/api/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

node dist/index.js 