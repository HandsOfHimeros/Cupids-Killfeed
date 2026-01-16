# Privacy Policy - Cupid's Killfeed Bot

**Last Updated: January 15, 2026**

## 1. Introduction

This Privacy Policy explains how Cupid's Killfeed Bot ("the Bot", "we", "us") collects, uses, stores, and protects your information when you use our Discord bot services.

## 2. Information We Collect

### 2.1 Discord Information
- **User IDs**: Discord user IDs (snowflake IDs) to identify users
- **Guild IDs**: Discord server IDs to manage multi-guild configurations
- **Channel IDs**: Channel IDs for killfeed, shop, economy, and log posting
- **Usernames**: Discord display names for leaderboards and economy features

### 2.2 DayZ Game Information
- **Player Names**: DayZ character names registered via `/setname` command
- **Player Locations**: XYZ coordinates from DayZ server logs (via `/imhere`)
- **Kill Statistics**: Kills, deaths, weapons used (from killfeed logs)
- **Distance Traveled**: Movement tracking calculated from location data

### 2.3 Nitrado Server Information (Admin Only)
- **API Tokens**: Nitrado API authentication tokens (encrypted)
- **Server IDs**: Nitrado server identification numbers
- **FTP Credentials**: FTP usernames (passwords not stored, used for session only)
- **Server Configuration**: Restart times, map types, server settings

### 2.4 Economy and Shop Data
- **Virtual Currency Balances**: Money amounts in wallet and bank
- **Transaction History**: Shop purchases, mini-game results
- **Inventory Data**: Purchased items, spawn queue entries
- **Mini-Game Statistics**: Games played, wins/losses, streaks
- **Rank Progress**: Medieval rank levels and total earnings
- **Achievements**: Unlocked achievement badges
- **Property Ownership**: Purchased properties and income collection times
- **Cooldown Timers**: Last game played timestamps

### 2.5 Server Log Data
- **Killfeed Events**: Player kills, hits, suicides parsed from DayZ logs
- **Base Build Events**: Construction/destruction events from logs
- **Connection Events**: Player connect/disconnect times
- **Spawn Logs**: Item spawn history and coordinates

## 3. How We Collect Information

### 3.1 Direct User Input
- `/setname` command - User provides DayZ player name
- `/imhere` command - Triggers location lookup from server logs
- `/admin killfeed setup` - Admin provides Nitrado credentials
- Economy commands - User interactions create transaction records

### 3.2 Automated Collection
- **Log Polling**: Bot polls DayZ server logs every 2 minutes via Nitrado API
- **Discord Interactions**: Slash command interactions logged by Discord.js
- **Location Parsing**: Regex extraction from log files `Player "name" (id=xxx pos=<X, Y, Z>)`

### 3.3 Third-Party APIs
- **Nitrado API**: Server file access, log downloads, FTP operations
- **Discord API**: User/guild data, channel management, message posting

## 4. How We Use Your Information

### 4.1 Core Bot Functionality
- Link Discord accounts to DayZ player names for item spawning
- Track player locations for shop item spawn coordinates
- Post killfeed events to designated Discord channels
- Calculate kill/death ratios and statistics
- Process shop purchases and spawn items at restart times

### 4.2 Economy Features
- Manage virtual currency balances
- Track mini-game participation and results
- Award achievements and rank progression
- Process property purchases and daily income
- Display leaderboards and statistics

### 4.3 Server Management
- Store Nitrado credentials for automated log polling
- Access and modify spawn.json and cfggameplay.json files
- Create and manage Discord channels automatically
- Post server events (kills, builds, connections)

### 4.4 Analytics and Improvement
- Monitor command usage for performance optimization
- Track error rates for debugging
- Analyze player engagement with features

## 5. Data Storage and Security

### 5.1 Database
- **Platform**: PostgreSQL (Heroku Postgres)
- **Location**: Heroku servers (US region)
- **Encryption**: SSL/TLS for database connections
- **Backup**: Heroku automated backups (7-day retention)

### 5.2 Security Measures
- API tokens stored with encryption
- Database access restricted to bot application only
- No plaintext password storage (FTP passwords used in-session only)
- SSL connections for all external API calls
- Parameterized SQL queries to prevent injection attacks

### 5.3 Data Retention
- **User Data**: Retained while bot is in guild; deleted 30 days after bot removal
- **Economy Data**: Persists indefinitely unless user requests deletion
- **Log Data**: Server logs accessed transiently, not permanently stored by bot
- **Admin Credentials**: Deleted immediately upon guild removal or bot kick

## 6. Data Sharing and Disclosure

### 6.1 We DO NOT Share Data With Third Parties
- No selling of user data
- No marketing or advertising use
- No data sharing with analytics companies
- No cross-bot data sharing

### 6.2 Data Visible to Others
- **Leaderboards**: Discord usernames, balances, ranks (public in economy channel)
- **Killfeed**: Player names, kills, deaths (public in killfeed channels)
- **Statistics**: K/D ratios, earnings (visible to all server members)

### 6.3 Required Disclosures
We may disclose information if required by:
- Legal obligations or court orders
- Discord Terms of Service enforcement
- Protection of Bot integrity and security

## 7. Third-Party Services

### 7.1 Services We Use
- **Discord**: Subject to [Discord Privacy Policy](https://discord.com/privacy)
- **Nitrado**: Subject to [Nitrado Privacy Policy](https://nitrado.net/privacy)
- **Heroku**: Subject to [Salesforce Privacy Policy](https://www.salesforce.com/company/privacy/)

### 7.2 Data Flow
- Nitrado API: Bot downloads logs, uploads spawn files
- Discord API: Bot posts messages, manages channels
- PostgreSQL: Bot stores user/economy data

We do not control third-party privacy practices. Review their policies independently.

## 8. User Rights

### 8.1 Access Your Data
Request a copy of your stored data by contacting us in #general-support channel.

### 8.2 Data Correction
Update your DayZ name with `/setname` command at any time.

### 8.3 Data Deletion
Request complete data deletion:
1. Contact us in #general-support
2. Provide your Discord user ID
3. Data deleted within 7 business days

Note: Removing bot from server triggers automatic data deletion after 30 days.

### 8.4 Opt-Out Options
- Don't use `/setname` - prevents location tracking and shop features
- Don't use economy commands - prevents economy data collection
- Remove bot from server - stops all data collection

## 9. Children's Privacy

The Bot is not directed at children under 13. We do not knowingly collect data from users under 13. If you believe a child under 13 has provided data, contact us immediately for deletion.

Discord Terms of Service require users to be 13+ (or 16+ in some regions).

## 10. International Data Transfers

Data is stored on Heroku servers located in the United States. By using the Bot from outside the US, you consent to data transfer and processing in the US.

## 11. Cookies and Tracking

The Bot does not use cookies. We do not track users across websites or applications. All data collection is limited to Discord bot interactions.

## 12. Data Breach Notification

In the event of a data breach affecting user data:
- Affected users will be notified within 72 hours
- Notification via Discord announcement channel
- Details provided: what data affected, steps taken, recommended actions

## 13. Changes to Privacy Policy

We may update this Privacy Policy periodically. Changes will be:
- Posted to this page with updated "Last Updated" date
- Announced in #announcements Discord channel
- Continued use constitutes acceptance of changes

## 14. Your Consent

By using Cupid's Killfeed Bot, you consent to:
- Collection of data as described in this policy
- Use of Nitrado API with provided credentials
- Storage of data in PostgreSQL database
- Display of usernames and statistics in public channels

## 15. Contact Us

For privacy questions, data requests, or concerns:
- Join our official Discord server
- Use #general-support channel
- Submit #bug-reports for security issues
- Direct message server administrators

## 16. GDPR Compliance (EU Users)

If you are in the EU, you have additional rights under GDPR:
- **Right to Access**: Request copy of your data
- **Right to Rectification**: Correct inaccurate data
- **Right to Erasure**: Request deletion ("right to be forgotten")
- **Right to Restrict Processing**: Limit how we use your data
- **Right to Data Portability**: Receive data in machine-readable format
- **Right to Object**: Object to processing of your data

To exercise these rights, contact us via Discord support channels.

## 17. California Privacy Rights (CCPA)

California residents have rights under CCPA:
- Right to know what data is collected
- Right to delete personal information
- Right to opt-out of data "sales" (we do not sell data)
- Right to non-discrimination for exercising rights

Contact us to exercise CCPA rights.

---

**This Privacy Policy is effective as of January 15, 2026. By using Cupid's Killfeed Bot, you acknowledge that you have read and understood this Privacy Policy.**
