# Quick sync workflow - test locally, then deploy
Write-Host "`n=== FULL SYNC WORKFLOW ===" -ForegroundColor Cyan

# Step 1: Check for uncommitted changes
Write-Host "`n[1/5] Checking for uncommitted changes..." -ForegroundColor Yellow
$gitStatus = git status --short

if ($gitStatus) {
    Write-Host "Found uncommitted changes:" -ForegroundColor Yellow
    git status --short
    
    Write-Host "`nWhat would you like to do?" -ForegroundColor Cyan
    Write-Host "  1) Commit all changes now" -ForegroundColor White
    Write-Host "  2) Review changes file by file" -ForegroundColor White
    Write-Host "  3) Cancel" -ForegroundColor White
    
    $choice = Read-Host "`nChoice (1-3)"
    
    switch ($choice) {
        "1" {
            $message = Read-Host "Commit message"
            git add .
            git commit -m "$message"
            Write-Host "✅ Changes committed" -ForegroundColor Green
        }
        "2" {
            git status
            Write-Host "`nReview your changes, then run this script again." -ForegroundColor Yellow
            exit 0
        }
        default {
            Write-Host "Cancelled" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "✅ No uncommitted changes" -ForegroundColor Green
}

# Step 2: Verify critical files and check for WIP
Write-Host "`n[2/5] Verifying critical files..." -ForegroundColor Yellow
$criticalFiles = @('shop_items.js', 'commands/economy.js', 'index.js', 'spawn.json')
$allGood = $true

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file - MISSING!" -ForegroundColor Red
        $allGood = $false
    }
}

if (-not $allGood) {
    Write-Host "`n❌ Critical files are missing! Fix this before deploying." -ForegroundColor Red
    exit 1
}

# Check for WIP/dev-only commands
$wipCommands = @('devtest.js', 'kits.js', 'test.js')
$foundWip = @()
foreach ($cmd in $wipCommands) {
    if (Test-Path "commands\$cmd") {
        $foundWip += $cmd
    }
}

if ($foundWip.Count -gt 0) {
    Write-Host "`n⚠️  Work-in-Progress commands detected:" -ForegroundColor Yellow
    $foundWip | ForEach-Object { Write-Host "    commands\$_" -ForegroundColor Cyan }
    Write-Host "`nThese will be deployed to production!" -ForegroundColor Yellow
    Write-Host "Continue? (y/n)" -ForegroundColor Cyan
    $continue = Read-Host
    if ($continue -ne 'y') {
        Write-Host "Cancelled - move WIP files out of commands/ folder first" -ForegroundColor Red
        exit 1
    }
}

# Step 3: Show what will be deployed
Write-Host "`n[3/5] Changes to be deployed:" -ForegroundColor Yellow
$ahead = git rev-list --count origin/master..HEAD 2>$null

if ($ahead -gt 0) {
    Write-Host "  Commits: $ahead" -ForegroundColor Cyan
    git log origin/master..HEAD --oneline --color
    Write-Host "`n  Files changed:" -ForegroundColor Cyan
    git diff --name-only origin/master..HEAD | ForEach-Object { Write-Host "    $_" -ForegroundColor White }
} else {
    Write-Host "  ⚠️  No new commits to deploy" -ForegroundColor Yellow
}

# Step 4: Quick verification
Write-Host "`n[4/5] Quick verification:" -ForegroundColor Yellow
Write-Host "  Shop items: " -NoNewline
$itemCount = node -e "console.log(require('./shop_items.js').length)" 2>$null
Write-Host "$itemCount items" -ForegroundColor Cyan

# Check for migration files
$migrationFiles = Get-ChildItem -Filter "add_*.js" | Where-Object { $_.Name -notlike "*_column.js" -or $_.LastWriteTime -gt (Get-Date).AddDays(-7) }
if ($migrationFiles) {
    Write-Host "  ⚠️  Recent migration files detected:" -ForegroundColor Yellow
    $migrationFiles | ForEach-Object { Write-Host "    $($_.Name)" -ForegroundColor Cyan }
}

# Step 5: Deploy
Write-Host "`n[5/5] Ready to deploy!" -ForegroundColor Yellow
Write-Host "`nDeploy to Heroku production?" -ForegroundColor Cyan
Write-Host "  y) Yes, deploy now" -ForegroundColor Green
Write-Host "  t) Test locally first" -ForegroundColor Yellow
Write-Host "  n) Cancel" -ForegroundColor Red

$choice = Read-Host "`nChoice (y/t/n)"

switch ($choice.ToLower()) {
    "y" {
        Write-Host "`n🚀 Deploying to Heroku..." -ForegroundColor Green
        
        # Check for migrations
        $needsMigration = $false
        if (Test-Path "add_auto_ban_column.js") {
            Write-Host "`n📋 Database migration needed!" -ForegroundColor Yellow
            Write-Host "   Run migrations on Heroku? (y/n)" -ForegroundColor Cyan
            $runMigrate = Read-Host
            if ($runMigrate -eq 'y') {
                $needsMigration = $true
            }
        }
        
        # Push to Heroku
        git push heroku master
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ Code deployed!" -ForegroundColor Green
            
            # Run migrations if needed
            if ($needsMigration) {
                Write-Host "`n🔄 Running database migrations..." -ForegroundColor Yellow
                heroku run "node add_auto_ban_column.js" -a cupidskillfeed
                heroku run "node add_pvp_zones_column.js" -a cupidskillfeed
                Write-Host "✅ Migrations complete" -ForegroundColor Green
            }
            
            # Register commands
            Write-Host "`n📝 Registering commands..." -ForegroundColor Yellow
            heroku run "node register.js" -a cupidskillfeed
            Write-Host "✅ Commands registered" -ForegroundColor Green
            
            Write-Host "`n✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
            Write-Host "`nView logs? (y/n)" -ForegroundColor Cyan
            $logs = Read-Host
            if ($logs -eq 'y') {
                Start-Sleep 3
                heroku logs -a cupidskillfeed -n 50 --tail
            }
        } else {
            Write-Host "`n❌ Deployment failed!" -ForegroundColor Red
        }
    }
    "t" {
        Write-Host "`n🧪 Starting dev bot for testing..." -ForegroundColor Yellow
        .\start-dev.ps1
    }
    default {
        Write-Host "`n❌ Deployment cancelled" -ForegroundColor Red
    }
}
