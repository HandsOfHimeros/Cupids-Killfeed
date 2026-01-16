# DEVELOPMENT SETUP

## Quick Start

### 1. Environment Setup
Your `.env` file is already configured with the DEV bot token.

**Important:** 
- `.env` = Local development (your computer)
- `config.json` = Production (Heroku)
- Never commit `.env` to git (it's in .gitignore)

### 2. Database URL
Update `DATABASE_URL` in `.env`:
- Use your Heroku Postgres URL (same as production)
- OR set up a local PostgreSQL database for testing

To get Heroku DB URL:
```powershell
heroku config:get DATABASE_URL
```

### 3. Start Dev Bot

**Option A - PowerShell Script:**
```powershell
.\start-dev.ps1
```

**Option B - Direct:**
```powershell
node index.js
```

### 4. Invite Dev Bot to Test Server

**Your Test Server ID:** 1461070029175918662

**Generate Invite Link:**
1. Go to https://discord.com/developers/applications
2. Click your DEV bot (ID: 1461089628391080162)
3. OAuth2 → URL Generator
4. Check: `bot`, `applications.commands`
5. Permissions: `Administrator`
6. Copy URL and open in browser
7. Add to your test server

### 5. Register Commands

After starting bot, register slash commands:
```powershell
node register.js
```

Or use the registration endpoint in Discord Developer Portal.

---

## Testing Workflow

### Development Cycle:
1. **Make code changes**
2. **Stop bot** (Ctrl+C)
3. **Restart bot** (`.\start-dev.ps1`)
4. **Test in Discord** (test server: 1461070029175918662)
5. **Verify it works**
6. **Deploy to production** (when stable)

### Test Commands:
```
/devtest - Check bot status and test features
/devtest feature:db - Test database connection
/devtest feature:kit - Test kit system
/devtest feature:sub - Test subscription tiers
```

---

## Feature Flags

Enable/disable features in `.env`:
```env
ENABLE_KIT_SYSTEM=true
ENABLE_SUBSCRIPTION_CHECKING=true
DEV_MODE=true
```

When `DEV_MODE=true`:
- `/devtest` command available
- Extra logging enabled
- Test features unlocked

---

## Production Deployment

When ready to deploy changes to production:

1. **Test thoroughly locally**
2. **Commit code to git**
3. **Push to Heroku:**
   ```powershell
   git push heroku main
   ```
4. **Heroku uses `config.json`** (not .env)
5. **Production bot gets updates**

---

## Two Bots Running

**DEV Bot (Local):**
- Token: MTQ2MTA4OTYy... (in .env)
- Test server only
- You control when it runs

**PROD Bot (Heroku):**
- Token: MTQwNDIzNTE4... (in config.json)
- Live servers
- Runs 24/7 on Heroku

Both can run at same time - they're separate bots!

---

## Troubleshooting

**Bot won't start:**
- Check TOKEN in .env is correct
- Run `npm install` to install dependencies
- Check DATABASE_URL is valid

**Commands not showing:**
- Run `node register.js` to register commands
- Wait 5-10 minutes for Discord to update
- Kick and re-invite bot

**Database errors:**
- Make sure DATABASE_URL in .env is correct
- Test connection with `/devtest feature:db`

---

## Next Steps

Build and test new features:
- [ ] Kit builder system
- [ ] Subscription tier checking
- [ ] Payment integration
- [ ] Feature gating
