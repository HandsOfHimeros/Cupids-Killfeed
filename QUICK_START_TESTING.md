# Quick Start Guide - Testing the Fixed Bot

## 1. Restart the Bot

```powershell
# Stop the current bot (Ctrl+C in the terminal where it's running)

# Start the bot fresh
node index.js
```

## 2. Watch for Success Messages

You should see these on startup:

```
[COMMAND LOADER] Loading X command files...
[COMMAND LOADER] ✓ Loaded command: admin
[COMMAND LOADER] ✓ Loaded command: economy
[COMMAND LOADER] ✓ Loaded command: shop
... (more commands)
[COMMAND LOADER] Loaded X total commands/modules

[DATABASE] ✓ Connection successful! Server time: ...
Logged in as YourBot#1234!
KILLFEED IS ACTIVE!
```

## 3. Test Common Commands

### Basic Commands (Should work immediately):
```
/balance
/wallet
/leaderboard
```

### Shop Commands:
```
/shop
```

### Admin Commands:
```
/admin killfeed status
```

## 4. What to Look For

### ✅ Good Signs:
- Commands respond within 1-2 seconds
- No "Interaction failed" errors in Discord
- Console shows: `[INTERACTION] Command xyz completed in XXms`

### ❌ Warning Signs:
- `WARNING: xyz taking longer than 2.5 seconds to respond!`
- `Error: Interaction has already been acknowledged`
- `Command not found: xyz`
- Commands not showing up in Discord

## 5. If You See Errors:

### "Unknown interaction" or "Interaction failed"
**Solution:** Re-register commands
```powershell
node register.js
```
Then restart the bot.

### "Database connection failed"
**Solution:** Check your DATABASE_URL in `.env`
```powershell
# Test database connection
node -e "require('./database.js')"
```

### Commands taking too long (>2.5s warning)
**Possible causes:**
- Slow database queries
- Network issues with Nitrado API
- Server resource constraints

**Solutions:**
1. Check database connection
2. Verify Nitrado API token is valid
3. Restart the bot

### "Command not found: xyz"
**Solution:** Check if command file exists:
```powershell
dir commands\xyz.js
```

## 6. Common Issues & Fixes

### Issue: Bot not responding to slash commands
**Fix:**
1. Make sure commands are registered: `node register.js`
2. Restart bot
3. Wait 1-5 minutes for Discord to sync commands

### Issue: "This interaction failed"
**Fix:** The new error handlers should prevent this, but if it happens:
1. Check console logs for the specific error
2. Look for database connection issues
3. Verify all environment variables are set

### Issue: Economy commands not working
**Fix:**
1. Ensure database is connected (check startup logs)
2. Run: `node init_database.js` to create tables
3. Check `economy_channel_id` is set in guild config

### Issue: Shop spawning not working
**Fix:**
1. Verify guild is configured: `/admin killfeed setup`
2. Check Nitrado credentials are valid
3. Ensure player used `/imhere` to set location

## 7. Performance Monitoring

Watch the console for timing information:

```
[INTERACTION] Command shop completed in 150ms     ← Good (fast)
[INTERACTION] Command shop completed in 2800ms    ← Slow but OK
[INTERACTION] WARNING: shop taking longer...      ← Problem!
```

**Ideal response times:**
- Simple commands (balance, wallet): <100ms
- Database queries (shop, leaderboard): 100-500ms
- Nitrado API calls (killfeed setup): 500-2000ms

**Concerning response times:**
- Anything over 2500ms will show a warning
- Anything over 3000ms will fail in Discord

## 8. Logs to Monitor

### Every command execution logs:
```
[INTERACTION] Received: APPLICATION_COMMAND shop at 1234567890
[INTERACTION] Executing command: shop
[INTERACTION] Command shop completed in 234ms
```

### Errors are logged with context:
```
[INTERACTION] Error executing shop: Error: Database connection failed
[SHOP] Error: No guild configuration found
```

## 9. Testing Checklist

- [ ] Bot starts without errors
- [ ] Database connection successful
- [ ] All commands load successfully
- [ ] `/balance` works
- [ ] `/shop` shows items
- [ ] `/admin killfeed status` responds
- [ ] Button interactions work (shop categories, etc.)
- [ ] Modal submissions work (admin setup, etc.)
- [ ] No "interaction failed" errors
- [ ] Response times are reasonable (<2.5s)

## 10. Getting Help

If you're still seeing errors after applying these fixes:

1. **Collect this information:**
   - Exact error message from console
   - Which command is failing
   - Database connection status
   - How many commands loaded successfully

2. **Check these files:**
   - `.env` - All required variables set?
   - `package.json` - All dependencies installed?
   - `commands/` folder - All .js files present?

3. **Try these commands:**
   ```powershell
   # Reinstall dependencies
   npm install
   
   # Re-register commands
   node register.js
   
   # Test database
   node -e "require('./database.js')"
   
   # Start bot with full logs
   node index.js
   ```

## Success Indicators

Your bot is working correctly when you see:
- ✅ All commands load on startup
- ✅ Database connects successfully
- ✅ Commands respond within 1-2 seconds
- ✅ No timeout warnings in console
- ✅ No "interaction failed" in Discord
- ✅ Button clicks and modals work smoothly

## Emergency Reset

If nothing works, try a complete reset:

```powershell
# 1. Stop the bot
# Ctrl+C

# 2. Clear node cache
rm -r node_modules
npm install

# 3. Re-register commands
node register.js

# 4. Restart bot
node index.js
```
