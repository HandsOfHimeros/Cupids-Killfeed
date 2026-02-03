# Throne System Implementation

## Overview
The Throne System adds dynamic King rank battles to the medieval economy bot. Only ONE player can be the "Reigning King" at a time, and other King-rank players can challenge for the throne.

## Database Changes

### New Tables
1. **reigning_king**
   - `guild_id` (VARCHAR(255), PRIMARY KEY): Discord guild ID
   - `user_id` (VARCHAR(255), NOT NULL): Current king's Discord user ID
   - `crowned_at` (BIGINT, NOT NULL): Timestamp when crowned
   - `defense_count` (INTEGER, DEFAULT 0): Number of successful throne defenses
   - `last_challenged` (BIGINT, DEFAULT 0): Last challenge timestamp (for cooldown)

2. **throne_challenges**
   - `id` (SERIAL, PRIMARY KEY): Auto-increment ID
   - `guild_id` (VARCHAR(255), NOT NULL): Discord guild ID
   - `challenger_id` (VARCHAR(255), NOT NULL): Challenger's Discord user ID
   - `king_id` (VARCHAR(255), NOT NULL): Defending king's Discord user ID
   - `challenged_at` (BIGINT, NOT NULL): Challenge timestamp
   - `outcome` (VARCHAR(50), NOT NULL): 'victory', 'defense', 'abdication', 'timeout', 'default_win'
   - `wager` (INTEGER, NOT NULL): Amount wagered ($5,000)
   - `winner_id` (VARCHAR(255)): Winner's Discord user ID

### New Database Functions (database.js)
- `getReigningKing(guildId)` - Get current throne holder
- `setReigningKing(guildId, userId)` - Crown a new king
- `incrementDefenseCount(guildId)` - Increment successful defenses
- `updateLastChallenged(guildId, timestamp)` - Update challenge cooldown
- `recordThroneChallenge(...)` - Log throne battle
- `getThroneHistory(guildId, limit)` - Get recent battles
- `getUserThroneStats(guildId, userId)` - Get user's throne battle stats

## Game Mechanics

### Requirements to Challenge
- Must be King rank ($150,000+ total earned)
- Must have $5,000 in wallet for wager
- 7-day cooldown between throne challenges (guild-wide)

### Challenge Process
1. Challenger uses `/challenge-throne`
2. If no Reigning King exists, challenger claims throne automatically
3. If throne is occupied, current king is notified
4. King has 60 seconds to respond:
   - **Defend Throne**: Battle occurs
   - **Abdicate**: Challenger wins by default
   - **Timeout**: Challenger wins by default

### Battle Mechanics
- Both players wager $5,000
- Reigning King gets +10% power bonus (defender's advantage)
- Winner takes $10,000 total
- Loser is **demoted to Duke rank** (total_earned set to $74,999)
- Winner becomes/remains Reigning King

### Throne Benefits
- **Special Title**: "Reigning King" displayed in `/rank`
- **Enhanced Stipend**: $1,000/day (vs $500 for regular King)
- **Defense Counter**: Track successful throne defenses
- **Battle History**: All throne battles recorded

## New Commands

### `/throne`
View the current Reigning King and recent throne battle history.
- Shows king's username, days reigning, defense count
- Shows last 5 throne battles with outcomes

### `/challenge-throne`
Challenge the Reigning King for the throne ($5,000 wager, loser drops to Duke).
- Validates King rank requirement
- Checks balance and cooldown
- Initiates throne battle or auto-claim

### Updated: `/rank`
Now shows throne status for King-rank users:
- **Reigning King**: Shows "REIGNING KING" status with defense count and days on throne
- **Eligible King**: Shows "Eligible to /challenge-throne"
- Different stipend display ($1,000 for Reigning King, $500 for regular King)

## Migration Script
Run `node add_throne_system.js` to create the database tables.

## Deployment Checklist
1. ✅ Create migration script: `add_throne_system.js`
2. ✅ Add database functions to `database.js`
3. ✅ Export new functions in `database.js` module.exports
4. ✅ Add command definitions to `commands/economy.js` data array
5. ✅ Update `/rank` command to show throne status
6. ✅ Implement `/throne` command handler
7. ✅ Implement `/challenge-throne` command handler
8. ⏳ Run migration on production database
9. ⏳ Deploy to Heroku
10. ⏳ Test throne mechanics

## Testing Plan
1. Create test accounts at King rank
2. First king claims throne via `/challenge-throne`
3. Verify `/throne` shows correct info
4. Second king challenges throne
5. Test battle outcomes (win/loss/abdicate/timeout)
6. Verify loser demoted to Duke ($74,999)
7. Verify winner becomes Reigning King
8. Verify 7-day cooldown works
9. Verify `/rank` shows correct throne status
10. Verify stipend difference ($1,000 vs $500)

## Balance Considerations
- **Wager**: $5,000 is significant but not prohibitive for King-rank players
- **Demotion**: Losing sets total_earned to $74,999 (Duke threshold), requiring $75,001 to reach King again
- **Cooldown**: 7 days prevents spam challenges but allows regular competition
- **Defender Bonus**: 10% power boost rewards throne holder slightly
- **Risk/Reward**: High stakes encourage strategic timing and preparation

## Future Enhancements (Optional)
- Achievement: "Regicide" (defeat a Reigning King)
- Achievement: "Eternal Throne" (reign for 30+ days)
- Throne battle leaderboard (most defenses, longest reign)
- Throne challenge betting system for spectators
- Royal court system (King can appoint Duke advisors)
