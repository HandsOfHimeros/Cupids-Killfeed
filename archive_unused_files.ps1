# Archive unused files to keep workspace clean
# Run this script to move development/testing files to archive folder

$archiveDir = ".\archive"

# Create archive directory if it doesn't exist
if (-not (Test-Path $archiveDir)) {
    New-Item -ItemType Directory -Path $archiveDir | Out-Null
    Write-Host "Created archive directory" -ForegroundColor Green
}

# Create subdirectories in archive
$subDirs = @("test", "migrations", "checks", "backups", "utilities", "announcements", "junk")
foreach ($dir in $subDirs) {
    $path = Join-Path $archiveDir $dir
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path | Out-Null
    }
}

$movedCount = 0

# Test files
Write-Host "`nArchiving test files..." -ForegroundColor Cyan
Get-ChildItem -Path . -Filter "test_*.js" | ForEach-Object {
    Move-Item $_.FullName "$archiveDir\test\" -Force
    Write-Host "  Moved: $($_.Name)"
    $movedCount++
}

# Migration/Setup scripts
Write-Host "`nArchiving migration files..." -ForegroundColor Cyan
$migrationPatterns = @("add_*.js", "setup_*.js", "init_*.js", "migrate_*.js")
foreach ($pattern in $migrationPatterns) {
    Get-ChildItem -Path . -Filter $pattern | ForEach-Object {
        Move-Item $_.FullName "$archiveDir\migrations\" -Force
        Write-Host "  Moved: $($_.Name)"
        $movedCount++
    }
}

# Check/inspection scripts
Write-Host "`nArchiving check files..." -ForegroundColor Cyan
Get-ChildItem -Path . -Filter "check_*.js" | ForEach-Object {
    Move-Item $_.FullName "$archiveDir\checks\" -Force
    Write-Host "  Moved: $($_.Name)"
    $movedCount++
}

# Announcement scripts
Write-Host "`nArchiving announcement files..." -ForegroundColor Cyan
Get-ChildItem -Path . -Filter "announce_*.js" | ForEach-Object {
    Move-Item $_.FullName "$archiveDir\announcements\" -Force
    Write-Host "  Moved: $($_.Name)"
    $movedCount++
}

# Utility/cleanup scripts
Write-Host "`nArchiving utility files..." -ForegroundColor Cyan
$utilityPatterns = @("fix_*.js", "verify_*.js", "validate_*.js", "clear_*.js", "cleanup_*.js", 
                     "empty_*.js", "remove_*.js", "restore_*.js", "reset_*.js", "update_*.js",
                     "list_*.js", "find_*.js", "create_*.js", "generate_*.js", "extract_*.js",
                     "send_*.js", "post_*.js", "mention_*.js", "welcome_*.js", "show_*.js",
                     "set_*.js")
foreach ($pattern in $utilityPatterns) {
    Get-ChildItem -Path . -Filter $pattern | ForEach-Object {
        # Skip database.js and critical files
        if ($_.Name -ne "register-commands.js") {
            Move-Item $_.FullName "$archiveDir\utilities\" -Force
            Write-Host "  Moved: $($_.Name)"
            $movedCount++
        }
    }
}

# Backup files
Write-Host "`nArchiving backup files..." -ForegroundColor Cyan
$backupFiles = @(
    "spawn.json.backup*",
    "shop_items_old.js",
    "shop_items_new.js",
    "extracted_items.json",
    "shop_validation_report.txt",
    "player_locations.json"
)
foreach ($pattern in $backupFiles) {
    Get-ChildItem -Path . -Filter $pattern | ForEach-Object {
        Move-Item $_.FullName "$archiveDir\backups\" -Force
        Write-Host "  Moved: $($_.Name)"
        $movedCount++
    }
}

# Move backup_v42 folder if exists
if (Test-Path ".\backup_v42") {
    Move-Item ".\backup_v42" "$archiveDir\backups\" -Force
    Write-Host "  Moved: backup_v42 folder"
    $movedCount++
}

# Junk/broken files
Write-Host "`nArchiving junk files..." -ForegroundColor Cyan
$junkFiles = @(
    "console.log('Guild",
    "b.name.localeCompare(a.name))"
)
foreach ($file in $junkFiles) {
    if (Test-Path $file) {
        Move-Item $file "$archiveDir\junk\" -Force
        Write-Host "  Moved: $file"
        $movedCount++
    }
}

# PowerShell scripts (optional - keep if you use them)
Write-Host "`nArchiving PowerShell utility scripts..." -ForegroundColor Cyan
$psScripts = @(
    "check-deploy.ps1",
    "compare-local-remote.ps1",
    "start-dev.ps1"
)
foreach ($script in $psScripts) {
    if (Test-Path $script) {
        Move-Item $script "$archiveDir\utilities\" -Force
        Write-Host "  Moved: $script"
        $movedCount++
    }
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Archive complete!" -ForegroundColor Green
Write-Host "Total files moved: $movedCount" -ForegroundColor Yellow
Write-Host "Archive location: $archiveDir" -ForegroundColor Yellow
Write-Host "`nYour workspace is now cleaner!" -ForegroundColor Green
Write-Host "If you need any archived files, they're in the archive folder." -ForegroundColor Cyan
Write-Host "You can safely delete the archive folder if you don't need them." -ForegroundColor Cyan
