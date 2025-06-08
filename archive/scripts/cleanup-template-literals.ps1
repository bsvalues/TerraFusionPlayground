#!/usr/bin/env pwsh

Write-Host "🔧 TerraFusion Template Literal Cleanup Script" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Function to fix template literal issues in a file
function Fix-TemplateLiterals {
    param([string]$FilePath)
    
    if (Test-Path $FilePath) {
        Write-Host "Fixing: $FilePath" -ForegroundColor Yellow
        
        # Read file content
        $content = Get-Content $FilePath -Raw -Encoding UTF8
        
        # Fix common template literal patterns
        $fixed = $content
        
        # Fix incomplete console.log statements
        $fixed = $fixed -replace 'console\.log\(`[^`]*$[\r\n]*\s*\);', ''
        $fixed = $fixed -replace 'if \([^)]*\) \{\s*\}\s*`\s*\);', 'if ($1) { console.log(`Operation completed`); }'
        
        # Fix unterminated template literals at end of lines
        $fixed = $fixed -replace '`\s*\);?\s*$', '`;'
        
        # Fix incomplete template literal expressions
        $fixed = $fixed -replace '\$\{[^}]*$', ''
        $fixed = $fixed -replace '^[^`]*\}', ''
        
        # Write back if changes were made
        if ($fixed -ne $content) {
            Set-Content $FilePath $fixed -Encoding UTF8
            Write-Host "  ✅ Fixed template literals" -ForegroundColor Green
        } else {
            Write-Host "  ℹ️  No changes needed" -ForegroundColor Gray
        }
    }
}

# Critical files with template literal issues
$criticalFiles = @(
    "server/services/gis/gis-data-service.ts",
    "server/services/voice-command/voice-command-error-handler.ts", 
    "server/services/gis/agents/ai-insights-agent.ts",
    "server/services/gis/agents/data-normalization-agent.ts",
    "server/services/gis/agents/schema-conversion-agent.ts",
    "client/src/utils/performance-monitoring.tsx",
    "client/src/utils/web-vitals-monitoring.ts",
    "client/src/services/collaboration-websocket-service.ts"
)

foreach ($file in $criticalFiles) {
    Fix-TemplateLiterals $file
}

# Run type check to see improvement
Write-Host "`n🔍 Running type check..." -ForegroundColor Blue
& npm run type-check

Write-Host "`n✨ Template literal cleanup completed!" -ForegroundColor Green 