# Start Development Bot
# This runs the bot locally on your computer using .env configuration

Write-Host "🚀 Starting Cupid's Killfeed DEV Bot..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Please create .env file with your dev bot token." -ForegroundColor Yellow
    pause
    exit
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "✅ Configuration loaded from .env" -ForegroundColor Green
Write-Host "📍 Mode: DEVELOPMENT" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop the bot" -ForegroundColor Gray
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Start the bot
node index.js
