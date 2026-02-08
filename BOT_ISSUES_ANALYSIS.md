# Bot Issues - Root Cause Analysis

## 🔴 Main Problems

### 1. **Database Connection Blocking**
- **Symptom**: Commands timeout after 93+ seconds, "Connection terminated due to connection timeout"
- **Root Cause**: Killfeed polling runs every 2 minutes and processes ALL guilds sequentially
- **Why it happens**: 
  - Each guild poll makes 10-50 database queries
  - Killfeed uses same connection pool as user commands
  - No query prioritization - background tasks block user commands
  - Even with 10 max connections, killfeed can monopolize pool

### 2. **"Already Replied/Deferred" Errors** ✅ FIXED in v374
- **Symptom**: `The reply to this interaction has already been sent or deferred`
- **Cause**: Commands called `deferReply()` without checking state first
- **Fix**: Added `!interaction.deferred && !interaction.replied` checks

### 3. **Long-Running Queries**
- **Symptom**: Some queries take 5-10+ seconds
- **Cause**: No query optimization, missing indexes
- **Impact**: Blocks other queries waiting for connection

## 📊 Current Configuration

**Database**: Heroku Essential-0 ($5/month)
- 20 connection limit (currently using 2-4)
- 1GB storage (using 12MB = 1.2%)
- Healthy - not the bottleneck

**Connection Pool**: 
```javascript
max: 10 connections
min: 2 connections
timeout: 10 seconds
query_timeout: 10 seconds
```

**Killfeed Polling**:
- Runs every 120 seconds (2 minutes)
- Processes 2-3 guilds sequentially
- Each guild: 20-50 DB queries + API calls + log parsing
- Takes 5-15 seconds per guild during active periods

## 🎯 The Real Problem

**Killfeed monopolizes database connections during polls:**

```
Timeline:
00:00 - User runs /shop command
00:00 - Command tries to query database
00:00 - Killfeed is polling (started 5 seconds ago)
00:01 - Killfeed holds 3-4 connections parsing data
00:05 - User command still waiting for connection
00:10 - Command times out (10s limit)
00:15 - Killfeed finishes, releases connections
❌ User sees "Connection terminated due to connection timeout"
```

## ✅ Solutions

### Immediate Fixes (Deploy Today):

1. **Separate Connection Pools**
```javascript
// High priority pool for user commands (fast fail)
const commandPool = new Pool({
    max: 5,
    query_timeout: 5000, // 5 seconds
    priority: 'high'
});

// Low priority pool for background tasks (can wait longer)
const backgroundPool = new Pool({
    max: 5,
    query_timeout: 30000, // 30 seconds
    priority: 'low'
});
```

2. **Killfeed Rate Limiting**
```javascript
// Process 1 guild at a time, yield between each
// Add delays if connections are saturated
if (commandPool.activeQueries > 3) {
    await new Promise(r => setTimeout(r, 2000)); // Wait 2s
}
```

3. **Query Optimization**
```sql
-- Add missing indexes
CREATE INDEX idx_player_stats_steam_id ON player_stats(steam_id);
CREATE INDEX idx_player_stats_guild_id ON player_stats(guild_id);
CREATE INDEX idx_guild_configs_guild_id ON guild_configs(guild_id);
```

4. **Command Deferral Strategy**
- All commands defer IMMEDIATELY on first line
- Use `ephemeral: false` for public commands
- Use `ephemeral: true` for admin commands

### Long-term Fixes:

1. **Move killfeed to separate worker dyno**
2. **Add Redis cache for frequently accessed data**
3. **Implement command queue with priority**
4. **Add database read replicas**

## 🚀 Priority Actions

**RIGHT NOW**:
1. ✅ Fix "already deferred" errors (DONE v374)
2. ⏳ Separate connection pools
3. ⏳ Add killfeed throttling
4. ⏳ Add connection saturation checks

**THIS WEEK**:
1. Add database indexes
2. Optimize slow queries
3. Add metrics dashboard

## 📈 Success Metrics

**Before**:
- Command timeouts: 5-10 per hour
- Average command response: 2-5 seconds
- Database connection errors: Daily

**Target**:
- Command timeouts: < 1 per day
- Average command response: < 1 second
- Database connection errors: None

## 🔧 Implementation Plan

### Phase 1: Emergency Fix (30 minutes)
```bash
1. Create separate pools in database.js
2. Update killfeed to use backgroundPool
3. Update commands to use commandPool
4. Add connection throttling
5. Deploy v375
```

### Phase 2: Optimization (2 hours)
```bash
1. Add database indexes
2. Optimize getAllGuildConfigs query
3. Cache guild configs in memory
4. Add query performance logging
5. Deploy v376
```

### Phase 3: Monitoring (1 hour)
```bash
1. Add Heroku metrics integration
2. Set up connection pool alerts
3. Add slow query logging
4. Create admin dashboard
```
