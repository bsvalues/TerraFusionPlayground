$ErrorActionPreference = "Stop"

function Create-ArchiveStructure {
    $archiveDirs = @(
        "archive\scripts",
        "archive\configs",
        "archive\docs",
        "archive\logs",
        "archive\assets",
        "archive\temp"
    )
    
    foreach ($dir in $archiveDirs) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Host "Created directory: $dir"
        }
    }
}

function Move-ToArchive {
    param (
        [string]$Pattern,
        [string]$Destination
    )
    
    Get-ChildItem -Path $Pattern -ErrorAction SilentlyContinue | ForEach-Object {
        $targetPath = Join-Path $Destination $_.Name
        if (Test-Path $targetPath) {
            $newName = "$($_.BaseName)_$(Get-Date -Format 'yyyyMMdd_HHmmss')$($_.Extension)"
            $targetPath = Join-Path $Destination $newName
        }
        try {
            Move-Item -Path $_.FullName -Destination $targetPath -Force
            Write-Host "Moved $($_.Name) to $Destination"
        }
        catch {
            Write-Host "Failed to move $($_.Name): $_"
        }
    }
}

function Cleanup-Workspace {
    Write-Host "Starting workspace cleanup..."
    
    Create-ArchiveStructure
    
    # Move error logs
    Move-ToArchive -Pattern "errors*.txt" -Destination "archive\logs"
    
    # Move cleanup scripts
    Move-ToArchive -Pattern "cleanup*.ps1" -Destination "archive\scripts"
    
    # Move deployment scripts
    Move-ToArchive -Pattern "*deploy*.ps1" -Destination "archive\scripts"
    Move-ToArchive -Pattern "*deploy*.sh" -Destination "archive\scripts"
    
    # Move duplicate config files
    Move-ToArchive -Pattern ".eslintrc.js" -Destination "archive\configs"
    Move-ToArchive -Pattern "eslint.config.js" -Destination "archive\configs"
    
    # Move documentation files
    Move-ToArchive -Pattern "*.md" -Destination "archive\docs"
    
    # Move zip files
    Move-ToArchive -Pattern "*.zip" -Destination "archive\assets"
    
    Write-Host "Workspace cleanup completed!"
}

Cleanup-Workspace 