# Raid Weekend Management System

## Overview
The raid weekend system allows server admins to toggle raiding on/off (base and container damage) and set up automatic schedules for recurring raid weekends.

## Features

### 1. Manual Control
- **Enable Raiding NOW**: Immediately enable base and container damage
- **Disable Raiding NOW**: Immediately disable base and container damage
- Changes are made to `cfggameplay.json` (sets `disableBaseDamage` and `disableContainerDamage`)
- @everyone announcement sent to general channel with countdown timer
- Shows next server restart time

### 2. Automatic Scheduling
- Set up weekly raid weekends (e.g., Friday 6pm → Monday 6am)
- Modal input for:
  - Start Day (0=Sunday, 1=Monday, etc.)
  - Start Time (HH:MM format)
  - End Day
  - End Time
  - Timezone (e.g., America/New_York)
- Background job checks every 5 minutes
- Automatically enables/disables raiding and posts announcements

### 3. Status Display
- Shows current raid status (active/protected)
- Countdown timer to next state change
- Displays automatic schedule if enabled
- Shows next server restart time

### 4. Announcements
- Posted to general channel (or killfeed channel as fallback)
- @everyone ping
- Color-coded embeds:
  - Red (#ff5555) when raiding enabled
  - Green (#55ff55) when raiding disabled
- Includes countdown timer
- Shows next restart time

## Commands

### `/admin killfeed raiding <action>`

**Actions:**
- `Enable Raiding NOW` - Immediately enable raiding
- `Disable Raiding NOW` - Immediately disable raiding
- `Setup Automatic Schedule` - Opens modal to configure weekly schedule
- `View Status` - Shows current status and countdown

## Database Schema

New columns added to `guild_configs` table:
```sql
raid_schedule_enabled BOOLEAN DEFAULT false
raid_start_day INTEGER (0-6, where 0=Sunday)
raid_start_time VARCHAR(5) (HH:MM format)
raid_end_day INTEGER (0-6)
raid_end_time VARCHAR(5)
raid_timezone VARCHAR(50) DEFAULT 'America/New_York'
raid_currently_active BOOLEAN DEFAULT false
```

## How It Works

### Manual Toggle
1. Admin runs `/admin killfeed raiding` and selects enable/disable
2. Bot downloads `cfggameplay.json` from Nitrado
3. Modifies `disableBaseDamage` and `disableContainerDamage` flags
   - Enable raiding: set both to `false` (damage allowed)
   - Disable raiding: set both to `true` (damage blocked)
4. Uploads modified file via FTP
5. Updates `raid_currently_active` in database
6. Posts @everyone announcement with countdown
7. Bot does NOT trigger server restart (relies on scheduled restarts)

### Automatic Schedule
1. Admin runs `/admin killfeed raiding schedule`
2. Fills out modal with start/end times and timezone
3. Database stores schedule and sets `raid_schedule_enabled = true`
4. Background scheduler runs every 5 minutes checking all guilds
5. When current day/time matches start time:
   - Modifies cfggameplay.json
   - Updates database
   - Posts @everyone announcement
6. When current day/time matches end time:
   - Disables raiding
   - Posts announcement

### Countdown Timer
- Calculates time until next state change
- Uses guild's configured timezone
- Displays as "X days, Y hours, Z minutes"
- Shown in announcements and status display

## Files Modified

### commands/admin.js
- Added raid subcommand with 4 action choices
- `handleRaidingCommand()` - Routes to specific handlers
- `handleRaidToggle()` - Enable/disable raiding
- `handleRaidScheduleModal()` - Shows schedule setup modal
- `handleRaidStatus()` - Displays current status
- `sendRaidAnnouncement()` - Posts @everyone announcement
- `calculateRaidCountdown()` - Calculates time to next state
- `getNextRestartTime()` - Shows next scheduled restart

### index.js
- Added modal submission handler for `raid_schedule_modal`
- `handleRaidScheduleSubmit()` - Processes schedule form
- Background scheduler (5-minute interval) in `bot.on('ready')`
- `automaticRaidToggle()` - Triggered by scheduler
- `calculateRaidCountdown()` - Shared countdown logic
- `getNextRestartTime()` - Shared restart time logic

### add_raid_schedule.js (NEW)
- Database migration script
- Adds 7 new columns to guild_configs table
- Run with: `node add_raid_schedule.js`

## Example Schedule

**Friday 6pm → Monday 6am EST Raid Weekend:**
```
Start Day: 5 (Friday)
Start Time: 18:00
End Day: 1 (Monday)
End Time: 06:00
Timezone: America/New_York
```

**Behavior:**
- Every Friday at 6pm: Raiding automatically enabled + announcement
- Every Monday at 6am: Raiding automatically disabled + announcement
- Changes take effect after next scheduled server restart
- Players see countdown timer showing time remaining

## Deployment Steps

1. **Deploy to Heroku:**
   ```
   git add .
   git commit -m "Add raid weekend management system"
   git push heroku master
   ```

2. **Run database migration:**
   ```
   heroku run node add_raid_schedule.js
   ```

3. **Check logs:**
   ```
   heroku logs --tail
   ```

4. **Test commands:**
   - `/admin killfeed raiding status` - Check current status
   - `/admin killfeed raiding schedule` - Set up automatic schedule
   - `/admin killfeed raiding enable` - Test manual enable
   - `/admin killfeed raiding disable` - Test manual disable

## Important Notes

⚠️ **Server Restart Required**
- Changes to cfggameplay.json only take effect after server restarts
- Bot does NOT trigger automatic restarts
- Relies on existing restart schedule (stored in `restart_hours`)
- Announcements always show next restart time

⚠️ **Timezone Awareness**
- Schedule uses guild's configured timezone
- Countdown timers adjust to timezone
- Use standard timezone names (e.g., America/New_York, Europe/London)

⚠️ **Automatic Scheduler**
- Checks every 5 minutes
- Only processes guilds with `raid_schedule_enabled = true`
- Requires valid start/end day/time configuration
- Logs all automatic triggers to console

## Troubleshooting

**Commands not showing up:**
- Run `node register-dev.js` to register commands
- Restart bot

**Schedule not triggering:**
- Check bot logs for `[RAID SCHEDULER]` messages
- Verify timezone is correct
- Ensure `raid_schedule_enabled = true` in database
- Check start/end times are in HH:MM format

**Announcements not posting:**
- Verify general channel exists (or killfeed_channel_id is set)
- Check bot has permission to post and @everyone

**cfggameplay.json not updating:**
- Verify Nitrado credentials in guild config
- Check FTP credentials are valid
- Check logs for `[AUTO RAID]` or `[RAIDING]` errors
