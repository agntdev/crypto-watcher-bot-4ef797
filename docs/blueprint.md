# Crypto Watcher Bot — Bot specification

**Archetype:** finance

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

Personal Telegram bot for tracking crypto prices with private watchlists, customizable alerts, and a dashboard for usage analytics. Features include threshold/percent alerts, quiet hours, morning summaries, and anti-spam cooldowns.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- individual crypto traders
- crypto hobbyists

## Success criteria

- Users receive accurate price alerts based on configured rules
- Morning summaries are delivered at user-specified local times
- Owner dashboard shows real-time usage metrics and top alerts

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open main menu with Add Coin, /price, and Settings options
- **/price** (command, actor: user, command: /price) — Check price of watchlist or specific ticker
- **Add Coin** (button, actor: user, callback: add_coin:start) — Initiate coin addition flow with common ticker suggestions
- **Manage Watchlist** (button, actor: user, callback: watchlist:view) — Display current watchlist entries with edit/remove options

## Flows

### Onboarding
_Trigger:_ /start

1. Greet user
2. Show quick-help message
3. Display empty watchlist interface

_Data touched:_ User

### Add Threshold Alert
_Trigger:_ add_coin:threshold

1. Request ticker symbol
2. Collect price threshold and direction
3. Validate and confirm rule

_Data touched:_ WatchlistEntry, AlertRule

### Morning Summary
_Trigger:_ scheduled_local_time

1. Check current prices
2. Format summary with percent changes
3. Send to user if enabled

_Data touched:_ User, AlertEvent

### Alert Trigger
_Trigger:_ price_threshold_reached

1. Generate alert message
2. Check quiet hours/cooldowns
3. Send alert if conditions met

_Data touched:_ AlertEvent, User

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Telegram user preferences and settings
  - fields: telegram_id, timezone, quiet_hours, morning_summary_time, cooldown_length
- **WatchlistEntry** _(retention: persistent)_ — User's tracked crypto assets
  - fields: user_id, ticker, display_name, alert_rules
- **AlertRule** _(retention: persistent)_ — Price alert conditions
  - fields: type, direction, value, window
- **AlertEvent** _(retention: persistent)_ — Triggered alert records
  - fields: user_id, ticker, old_price, new_price, percent_change, timestamp

## Integrations

- **Telegram** (required) — Bot API messaging and inline buttons
- **Crypto Price API** (required) — Price data polling
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- /dashboard - View total users and top alerts
- /refresh_data - Manually update usage metrics

## Notifications

- Price alert notifications with percent change
- Morning summary with watchlist updates
- Quiet hours alert queue summaries

## Permissions & privacy

- All user data private and scoped to Telegram ID
- No third-party data sharing
- Owner dashboard accessible only to bot owner

## Edge cases

- Invalid ticker symbols during addition
- Price API failures during polling
- Alert triggering during quiet hours
- Multiple alert rules for same ticker

## Required tests

- End-to-end alert trigger with cooldown suppression
- Morning summary delivery during active hours
- Quiet hours alert queuing and post-quiet delivery

## Assumptions

- Price API failures are retried silently
- Default cooldown of 1 hour prevents alert spam
- Morning summary uses 24h price reference point
