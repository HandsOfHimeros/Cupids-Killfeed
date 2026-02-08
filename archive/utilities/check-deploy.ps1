# Check if all changes are committed before deploying
Write-Host "`n=== PRE-DEPLOYMENT CHECK ===" -ForegroundColor Cyan

# Check git status
Write-Host "`nChecking for uncommitted changes..." -ForegroundColor Yellow
$gitStatus = git status --short

if ($gitStatus) {
    Write-Host "`n⚠️  WARNING: You have uncommitted changes!" -ForegroundColor Red
    Write-Host "`nModified files:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    
    $commit = Read-Host "Do you want to commit these changes now? (y/n)"
    if ($commit -eq 'y') {
        $message = Read-Host "Commit message"
        git add .
        git commit -m "$message"
        Write-Host "✅ Changes committed" -ForegroundColor Green
    } else {
        Write-Host "❌ Deployment cancelled - commit your changes first!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ All changes are committed" -ForegroundColor Green
}

# Check if local is ahead of origin
Write-Host "`nChecking if local branch is ahead of remote..." -ForegroundColor Yellow
$ahead = git rev-list --count origin/master..HEAD 2>$null

if ($ahead -and $ahead -gt 0) {
    Write-Host "✅ You have $ahead commit(s) ready to deploy" -ForegroundColor Green
} else {
    Write-Host "⚠️  No new commits to deploy" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne 'y') {
        Write-Host "❌ Deployment cancelled" -ForegroundColor Red
        exit 1
    }
}

# Show what will be deployed
Write-Host "`n=== CHANGES TO BE DEPLOYED ===" -ForegroundColor Cyan
git log origin/master..HEAD --oneline --color

Write-Host "`n=== FILES CHANGED ===" -ForegroundColor Cyan
git diff --name-status origin/master..HEAD

Write-Host ""
$deploy = Read-Host "Deploy to Heroku? (y/n)"

if ($deploy -eq 'y') {
    Write-Host "`nDeploying to Heroku..." -ForegroundColor Green
    git push heroku master
    
    Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
    Write-Host "`nWould you like to view the logs? (y/n)"
    $viewLogs = Read-Host
    
    if ($viewLogs -eq 'y') {
        heroku logs -a cupidskillfeed --tail
    }
} else {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Red
}
