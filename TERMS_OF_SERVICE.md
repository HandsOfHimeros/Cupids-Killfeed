# Terms of Service - Cupid's Killfeed Bot

**Last Updated: January 15, 2026**

## 1. Acceptance of Terms

By inviting Cupid's Killfeed Bot ("the Bot") to your Discord server or using any of its features, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Bot.

## 2. Description of Service

Cupid's Killfeed Bot provides the following services:
- Real-time DayZ server killfeed tracking (kills, hits, suicides, base builds)
- In-game item shop and spawn system integration with Nitrado servers
- Medieval economy mini-games and currency system
- Player location tracking and statistics
- Multi-guild support across unlimited Discord servers

## 3. User Requirements

### 3.1 Server Administrator Responsibilities
- Must have valid Nitrado server credentials (API token, Server ID, FTP credentials)
- Must have "Manage Server" permissions in Discord
- Responsible for configuring bot settings via `/admin killfeed setup`
- Must ensure restart times are accurately configured

### 3.2 Player Responsibilities
- Must register exact DayZ username via `/setname` command (case-sensitive)
- Must be online in DayZ server when using `/imhere` location tracking
- Must comply with server rules and economy system guidelines
- Responsible for managing own economy balance and shop purchases

## 4. Bot Permissions and Access

The Bot requires the following Discord permissions:
- View Channels
- Send Messages
- Embed Links
- Manage Messages
- Read Message History
- Manage Channels (for auto-channel creation)
- Use Application Commands

The Bot accesses:
- Nitrado API using provided credentials (read/write server files)
- DayZ server log files via FTP
- Server spawn.json and cfggameplay.json files

## 5. Acceptable Use

You agree NOT to:
- Use the Bot to violate any laws or Discord Terms of Service
- Attempt to exploit, hack, or reverse engineer the Bot
- Use the Bot to harass, spam, or harm other users
- Provide false Nitrado credentials or server information
- Attempt to manipulate economy balances or shop system
- Use automated scripts or bots to interact with economy commands
- Abuse mini-games or rank progression systems

## 6. Service Availability

- The Bot is provided "as is" without guarantees of uptime
- We reserve the right to modify, suspend, or discontinue the Bot at any time
- Server restarts, maintenance, or Heroku dyno cycles may cause temporary downtime
- Nitrado API rate limits may affect bot functionality

## 7. Item Spawning and Shop System

- Items spawn at configured server restart times only
- Shop purchases require `/setname` registration and valid `/imhere` location
- Spawned items appear on tables within 5 meters of saved location
- We are not responsible for:
  - Items not spawning due to incorrect setup
  - Items lost due to server wipes or restarts
  - DayZ game bugs affecting spawned items
  - Nitrado API failures or FTP connection issues

## 8. Economy and Virtual Currency

- Economy "money" is virtual and has no real-world value
- Balances are stored in PostgreSQL database (may be reset without notice)
- Mini-game outcomes are determined by randomization algorithms
- We reserve the right to adjust balances, prices, or reset economy at any time
- No refunds for virtual currency or shop purchases

## 9. Data and Privacy

Please refer to our separate Privacy Policy for information on data collection, storage, and usage.

## 10. Intellectual Property

- The Bot, its code, and features are proprietary
- DayZ item names, classes, and game data belong to Bohemia Interactive
- Discord branding and API belong to Discord Inc.
- Nitrado API and services belong to Nitrado.net

## 11. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW:
- The Bot is provided "AS IS" without warranties of any kind
- We are not liable for any damages, including but not limited to:
  - Data loss or corruption
  - Server damage or file corruption
  - Lost virtual currency or items
  - Downtime or service interruptions
  - Third-party service failures (Nitrado, Discord, Heroku)
  - DayZ server issues or game bugs

## 12. Indemnification

You agree to indemnify and hold harmless the Bot developers from any claims, damages, or expenses arising from:
- Your use of the Bot
- Your violation of these Terms
- Your violation of any rights of another user
- Your Nitrado server configuration or credentials

## 13. Termination

We reserve the right to:
- Terminate or suspend Bot access for any server at any time
- Remove data associated with terminated servers
- Ban users from economy features for abuse or violations

You may terminate use by:
- Removing the Bot from your Discord server
- Requesting data deletion via support channels

## 14. Changes to Terms

We reserve the right to modify these Terms at any time. Continued use of the Bot after changes constitutes acceptance of new Terms. Check this page periodically for updates.

## 15. Governing Law

These Terms are governed by the laws of your jurisdiction. Any disputes shall be resolved through good faith negotiation.

## 16. Third-Party Services

The Bot integrates with:
- **Discord**: Subject to Discord Terms of Service
- **Nitrado**: Subject to Nitrado Terms and Conditions
- **Heroku**: Subject to Salesforce/Heroku Terms
- **PostgreSQL**: Database services subject to hosting provider terms

## 17. Contact

For questions, support, or to report violations:
- Join our official Discord server
- Use #general-support channel
- Report bugs in #bug-reports

## 18. Severability

If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full effect.

---

**By using Cupid's Killfeed Bot, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.**
