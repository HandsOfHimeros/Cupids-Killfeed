# Compare local files with what's deployed on Heroku
Write-Host "`n=== COMPARING LOCAL VS HEROKU ===" -ForegroundColor Cyan

# Key files to check
$filesToCheck = @(
    'shop_items.js',
    'commands/economy.js',
    'index.js',
    'spawn.json'
)

Write-Host "`nChecking critical files..." -ForegroundColor Yellow

foreach ($file in $filesToCheck) {
    if (Test-Path $file) {
        $localHash = (Get-FileHash $file -Algorithm MD5).Hash
        
        # Check if file is committed
        $gitStatus = git status --short $file
        
        if ($gitStatus) {
            Write-Host "⚠️  $file - UNCOMMITTED CHANGES" -ForegroundColor Red
        } else {
            # Check if it's different from origin/master
            $diff = git diff origin/master -- $file
            if ($diff) {
                Write-Host "⚠️  $file - DIFFERENT FROM HEROKU" -ForegroundColor Yellow
            } else {
                Write-Host "✅ $file - SYNCED" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "❌ $file - NOT FOUND" -ForegroundColor Red
    }
}

# Quick stats
Write-Host "`n=== QUICK STATS ===" -ForegroundColor Cyan
Write-Host "Shop items: " -NoNewline
node -e "console.log(require('./shop_items.js').length + ' items')"

Write-Host "Git status: " -NoNewline
$uncommitted = (git status --short | Measure-Object -Line).Lines
if ($uncommitted -eq 0) {
    Write-Host "Clean" -ForegroundColor Green
} else {
    Write-Host "$uncommitted files modified" -ForegroundColor Yellow
}

Write-Host "Commits ahead: " -NoNewline
$ahead = git rev-list --count origin/master..HEAD 2>$null
if ($ahead -eq 0) {
    Write-Host "0 (up to date)" -ForegroundColor Green
} else {
    Write-Host "$ahead commits" -ForegroundColor Yellow
}

Write-Host ""
