# Teleport System Documentation

## Overview
The teleport system allows Discord administrators to create teleport zones and routes on DayZ servers using the Player Restricted Area (PRA) system. When a player enters a zone, they are instantly teleported to the destination.

## How It Works

### Zones
- **Zones** are named locations with X, Y, Z coordinates
- Zones are auto-created during route creation
- Zones can be reused across multiple routes
- Each zone has a detection box (27 x 5.2 x 11) with rotation (108, 0, 0)

### Routes
- **Routes** connect two zones (from → to)
- Each route creates a JSON file in the Nitrado `custom/` folder
- Routes are automatically added to `cfggameplay.json`
- Format: `teleport-{from}2{to}.json` (e.g., `teleport-krona2devil.json`)

## Commands

### `/admin teleport`
Opens a dropdown menu with 6 actions:

#### 📍 Create Route
1. Select "Create Route"
2. Enter **from zone name** and **server name** (chernarusplus, enoch, or sakhal)
3. Enter **to zone name**
4. System checks if zones exist:
   - If both exist: Creates route immediately
   - If one missing: Uses your last `/imhere` coordinates to create it
   - If both missing: Asks you to use `/imhere` at first location

**Zone Naming Rules:**
- Lowercase only
- Alphanumeric characters
- Underscores and dashes allowed
- No spaces
- Max 50 characters

**Example:**
```
From: krona
To: devil
Server: chernarusplus
Result: teleport-krona2devil.json
```

#### ✏️ Update Zone
1. Select "Update Zone"
2. Use `/imhere` at the new location
3. Select the zone to update
4. All routes using that zone are automatically updated

#### 🗑️ Delete Route
1. Select "Delete Route"
2. Choose the route from the dropdown
3. Deletes the JSON file from Nitrado
4. Removes entry from cfggameplay.json

#### 🗑️ Delete Zone
⚠️ **WARNING**: This deletes the zone AND all routes using it!
1. Select "Delete Zone"
2. Choose the zone
3. All associated routes and files are deleted

#### 📋 List Zones
Shows all zones grouped by server with coordinates

#### 📋 List Routes
Shows all routes grouped by server

## Workflow Example

### Creating Your First Teleport

1. **Go to starting location** (e.g., Krona base)
   - Use `/imhere` to register coordinates

2. **Start route creation**
   - `/admin teleport`
   - Select "📍 Create Route"

3. **Enter zone names**
   - From: `krona`
   - Server: `chernarusplus`
   - To: `devil`

4. **System creates first zone**
   - Uses your `/imhere` coordinates for "krona"
   - Asks you to go to "devil" location

5. **Go to destination** (Devil's Castle)
   - Use `/imhere` again
   - Run `/admin teleport` → "📍 Create Route"
   - Enter same zone names again

6. **Route created!**
   - System creates "devil" zone with new coordinates
   - Generates `teleport-krona2devil.json`
   - Uploads to Nitrado `custom/` folder
   - Updates `cfggameplay.json`

7. **Restart server** to activate teleport

### Creating a Two-Way Teleport

To create a return route:

1. `/admin teleport` → "📍 Create Route"
2. From: `devil`, To: `krona`, Server: `chernarusplus`
3. Both zones already exist, so route is created instantly!
4. Creates `teleport-devil2krona.json`

Now players can teleport both ways!

## Technical Details

### Database Tables

**teleport_zones**
```sql
id SERIAL PRIMARY KEY
guild_id VARCHAR(255)
server VARCHAR(50)        -- chernarusplus, enoch, sakhal
zone_name VARCHAR(100)
x, y, z FLOAT            -- Coordinates
box_size_x, y, z FLOAT   -- Detection box dimensions
created_by VARCHAR(255)
created_at, updated_at TIMESTAMP
UNIQUE(guild_id, server, zone_name)
```

**teleport_routes**
```sql
id SERIAL PRIMARY KEY
guild_id VARCHAR(255)
server VARCHAR(50)
from_zone_name VARCHAR(100)
to_zone_name VARCHAR(100)
file_name VARCHAR(255)
created_by VARCHAR(255)
created_at, updated_at TIMESTAMP
UNIQUE(guild_id, server, from_zone_name, to_zone_name)
```

### JSON File Format

```json
{
  "PRABoxes": [
    {
      "type": "Box",
      "points": [
        { "x": 11447.5, "z": 191.2, "y": 11255.8 }
      ],
      "size": { "x": 27, "z": 5.2, "y": 11 },
      "rotation": { "x": 108, "z": 0, "y": 0 },
      "display": "krona to devil",
      "allowedWeapons": 0,
      "schedule": 0,
      "trespassWarning": 1,
      "bannedWeapons": [],
      "safePositions3D": [
        { "x": 6835.2, "z": 320.5, "y": 2710.4 }
      ]
    }
  ]
}
```

### Coordinate Caching

- `/imhere` coordinates are cached for 5 minutes
- Stored in memory (cleared on bot restart)
- One coordinate set per user at a time
- New `/imhere` overwrites previous coordinates

### Nitrado Integration

**File Upload:**
- Path: `/games/servers/{server_id}/dayzps/config/ServerDZ/custom/{filename}`
- Method: POST to Nitrado file upload API

**cfggameplay.json Update:**
- Downloads current file
- Adds `custom/{filename}` to `playerRestrictedAreaFiles` array
- Uploads modified file

**File Deletion:**
- Removes file from `custom/` folder
- Removes entry from `cfggameplay.json`

## Permissions

- Requires **Discord Administrator** permission
- All teleport management commands are admin-only
- Regular users can only use the teleports (automatically when entering zones)

## Important Notes

⚠️ **Server Restart Required**: After creating, updating, or deleting teleports, you MUST restart the server for changes to take effect.

📍 **Use /imhere**: Always use `/imhere` at the exact location you want the teleport zone. The coordinates are cached for 5 minutes.

🔄 **Coordinate Format**: DayZ uses Y for elevation, but the system handles the conversion automatically.

🗑️ **Cascade Delete**: Deleting a zone deletes ALL routes using that zone. Be careful!

📦 **File Management**: All teleport files are stored in the Nitrado `custom/` folder alongside `spawn.json` and other custom files.

## Troubleshooting

**"No recent coordinates found!"**
- Use `/imhere` before creating or updating zones
- Coordinates expire after 5 minutes

**"Route already exists!"**
- You can't create duplicate routes
- Delete the old route first if you want to recreate it

**"Failed to upload file to Nitrado server!"**
- Check Nitrado API token is valid
- Verify server ID is correct
- Ensure bot has internet connectivity

**Teleport not working in-game:**
- Did you restart the server after creating the route?
- Check that the JSON file exists in the `custom/` folder
- Verify `cfggameplay.json` includes the file path

## Migration

To set up the teleport system on a new bot installation:

1. Run the migration script:
   ```bash
   node add_teleport_tables.js
   ```

2. Restart the bot to load the teleport command

3. Use `/admin teleport` to start creating zones and routes

## Files Modified

- `add_teleport_tables.js` - Database migration
- `commands/teleport.js` - Main teleport management module
- `commands/admin.js` - Added teleport subcommand
- `commands/economy.js` - Modified `/imhere` to cache coordinates
- `index.js` - Added interaction handlers for select menus and modals
