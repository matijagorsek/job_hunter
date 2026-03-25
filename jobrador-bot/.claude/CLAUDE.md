JobRadar Bot — Project Context
What This Is
AI-powered Telegram bot for remote job search, CV advice, cover letters, and salary intelligence.
Built for Matija Goršek — Senior Android Developer & AI Systems Architect, 12+ years experience, based in Osijek, Croatia.
Architecture
Telegram → Cloudflare Tunnel (private account) → Express Server (localhost:3847) → Claude API (private key)

Webhook-based (not polling) via Cloudflare Tunnel on Matija's private CF account
Claude API with private Anthropic API key (NOT enterprise/work)
Agents: jobSearch, cvAdvisor, coverLetter, salary — each with specialized system prompts
Conversation memory: in-memory per-user history (last 20 messages)
Profile data: data/profile.json contains full CV data used in all prompts

Tech Stack

Node.js + Express
@anthropic-ai/sdk (Claude Sonnet 4)
Cloudflare Tunnel (private account, separate from work)
Telegram Bot API (webhook mode)
macOS LaunchAgents for auto-start

Project Structure
src/
├── server.js          # Express + webhook + startup
├── bot.js             # Telegram message handling, command routing, conversation memory
├── claude.js          # Claude API client, system prompt with full profile
├── agents/
│   ├── jobSearch.js   # Remote job search agent
│   ├── cvAdvisor.js   # CV analysis & improvement tips
│   ├── coverLetter.js # Tailored cover letter generator
│   └── salary.js      # Salary market intelligence
data/
└── profile.json       # Matija's full profile (skills, experience, preferences)
launchd/               # macOS LaunchAgent plists (bot + tunnel)
Setup Status

 npm install
 Create Telegram bot via @BotFather, add token to .env
 Add private Anthropic API key to .env
 Configure Cloudflare Tunnel (cloudflared tunnel create jobrador)
 Set WEBHOOK_DOMAIN in .env
 Test with npm start

Key Design Decisions

Separate from Jarvis system (standalone project, private accounts only)
Webhook over polling for lower latency
Agent pattern: each feature is a separate agent with its own prompt
Profile is JSON file so it's easy to update without touching code
Telegram message chunking handles the 4096 char limit
Graceful shutdown deletes webhook to prevent stale hooks

Known TODOs / Next Steps

Add web search tool to Claude API calls for real-time job board scraping
Persist conversation history (SQLite or JSON file)
Add /save command to bookmark interesting jobs
Rate limiting for API calls
Support for multiple users (currently single-user focused)
Add inline keyboard buttons for job actions (save, apply, similar)
Cover letter PDF export
Weekly job digest via scheduled Telegram message