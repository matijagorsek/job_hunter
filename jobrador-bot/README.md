# JobRadar Bot 🎯

AI-powered Telegram bot for remote job search, CV advice, cover letters, and salary intelligence — built on Claude API.

## Architecture

```
Telegram ←→ Cloudflare Tunnel ←→ Express Server (localhost:3847) ←→ Claude API
```

## Quick Setup (macOS)

### 1. Prerequisites

```bash
# Node.js (if not already installed)
brew install node

# Cloudflare Tunnel
brew install cloudflared
```

### 2. Clone & Install

```bash
cd ~/Projects  # or wherever you keep personal projects
mkdir jobrador-bot && cd jobrador-bot

# Copy all project files here, then:
npm install
```

### 3. Create Telegram Bot

1. Open Telegram, search for **@BotFather**
2. Send `/newbot`
3. Name it something like `JobRadar AI`
4. Copy the bot token

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
ANTHROPIC_API_KEY=your_private_anthropic_api_key_here
WEBHOOK_DOMAIN=your-tunnel-subdomain.cfargotunnel.com
PORT=3847
```

### 5. Cloudflare Tunnel Setup

```bash
# Login to your PRIVATE Cloudflare account
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create jobrador

# Get tunnel UUID from output, then create config:
mkdir -p ~/.cloudflared
```

Add to `~/.cloudflared/config.yml`:
```yaml
tunnel: YOUR_TUNNEL_UUID
credentials-file: /Users/YOUR_USER/.cloudflared/YOUR_TUNNEL_UUID.json

ingress:
  - hostname: jobrador.YOUR_DOMAIN.com
    service: http://localhost:3847
  - service: http_status:404
```

Create DNS route:
```bash
cloudflared tunnel route dns jobrador jobrador.YOUR_DOMAIN.com
```

### 6. Run

```bash
# Terminal 1: Start tunnel
cloudflared tunnel run jobrador

# Terminal 2: Start bot
npm start

# Or for development:
npm run dev
```

### 7. (Optional) Run as LaunchAgent

To auto-start on login, see `launchd/` folder for plist files.

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome & help |
| `/search` | Search remote jobs matching your profile |
| `/search kotlin senior` | Search with specific keywords |
| `/cv` | Get CV improvement tips |
| `/cover` | Generate a cover letter for a job |
| `/salary` | Get salary insights for a role |
| `/profile` | View/update your profile |
| `/help` | Show all commands |

## Chat Mode

Just type naturally! The bot understands context:
- "Find me Android jobs paying over $150k"
- "Write a cover letter for a Staff Android role at Spotify"
- "Is my CV good enough for FAANG?"
- "What's the market rate for a Senior Android dev in Europe?"

## Project Structure

```
jobrador-bot/
├── src/
│   ├── server.js          # Express + webhook handler + startup validation
│   ├── bot.js             # Telegram message handling, command routing, rate limiting
│   ├── claude.js          # Claude API client + system prompt
│   ├── i18n.js            # English / Croatian translations
│   ├── logger.js          # Winston structured logging
│   └── agents/
│       ├── jobSearch.js   # Job search agent
│       ├── cvAdvisor.js   # CV analysis & tips
│       ├── coverLetter.js # Cover letter generator
│       └── salary.js      # Salary intelligence
├── tests/
│   ├── unit/
│   │   ├── bot.test.js    # splitMessage, parseFilters, handleUpdate
│   │   └── i18n.test.js   # detectLanguage, t()
│   └── integration/
│       └── webhook.test.js # HTTP webhook auth + health check
├── data/
│   └── profile.json       # Your profile data
├── launchd/               # macOS auto-start configs
├── .env.example
├── package.json
└── README.md
```

## Development & Testing

### Running tests

```bash
npm test
```

Tests use [Jest](https://jestjs.io/) for unit tests and [supertest](https://github.com/ladjs/supertest) for HTTP integration tests. All external services (Telegram API, Claude API) are mocked — no real credentials are needed to run the suite.

### Test layout

| File | What it covers |
|------|---------------|
| `tests/unit/i18n.test.js` | Language detection, translation lookups, function messages |
| `tests/unit/bot.test.js` | Message splitting, filter parsing, auth enforcement, rate limiting |
| `tests/integration/webhook.test.js` | Webhook 401/200 responses, `handleUpdate` dispatch |

### Key modules for contributors

| Module | Responsibility |
|--------|---------------|
| `src/server.js` | Fail-fast env-var validation, Express setup, webhook registration |
| `src/bot.js` | Chat ID allowlist, rate limiting, command routing, document handling |
| `src/claude.js` | Claude API client; `chat()` for conversation, `runAgent()` for one-shot agents |
| `src/agents/*.js` | Each agent owns its own system-prompt fragment and calls `runAgent()` |
| `src/i18n.js` | All user-facing strings; add keys here when adding new messages |
