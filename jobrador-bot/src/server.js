require("dotenv").config();

const express = require("express");
const { handleUpdate } = require("./bot");
const logger = require("./logger");

const app = express();
app.use(express.json());

const REQUIRED_ENV_VARS = ["TELEGRAM_BOT_TOKEN", "ALLOWED_CHAT_IDS", "ANTHROPIC_API_KEY", "WEBHOOK_DOMAIN"];
const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
if (missing.length > 0) {
  logger.error(`FATAL: Missing required env vars: ${missing.join(", ")}. Refusing to start.`);
  process.exit(1);
}

const PORT = process.env.PORT || 3847;
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const WEBHOOK_URL = `https://${process.env.WEBHOOK_DOMAIN}/webhook`;
const webhookSecret = process.env.WEBHOOK_SECRET;

// Health check
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    bot: "JobRadar AI",
    uptime: process.uptime(),
  });
});

// Telegram webhook endpoint
app.post("/webhook", async (req, res) => {
  if (!webhookSecret || req.headers["x-telegram-bot-api-secret-token"] !== webhookSecret) {
    return res.sendStatus(401);
  }
  // Respond immediately so Telegram doesn't retry
  res.sendStatus(200);

  try {
    await handleUpdate(req.body);
  } catch (error) {
    logger.error("Webhook error", { message: error.message, stack: error.stack });
  }
});

// Set webhook on startup
async function setupWebhook() {
  try {
    // Delete any existing webhook first
    await fetch(`${TELEGRAM_API}/deleteWebhook`);

    const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        allowed_updates: ["message"],
        drop_pending_updates: true,
        ...(webhookSecret && { secret_token: webhookSecret }),
      }),
    });

    const data = await response.json();

    if (data.ok) {
      logger.info("Webhook set", { url: WEBHOOK_URL });
    } else {
      logger.error("Webhook setup failed", { description: data.description });
    }
  } catch (error) {
    logger.error("Webhook setup error", { message: error.message });
  }
}

// Set bot commands menu
async function setBotCommands() {
  await fetch(`${TELEGRAM_API}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commands: [
        { command: "search", description: "🔍 Search remote jobs" },
        { command: "cv", description: "📄 CV improvement advice" },
        { command: "cover", description: "✉️ Generate cover letter" },
        { command: "salary", description: "💰 Salary market insights" },
        { command: "profile", description: "👤 View your profile" },
        { command: "help", description: "❓ Show all commands" },
      ],
    }),
  }).catch(() => {});
}

// Start server
app.listen(PORT, async () => {
  logger.info("JobRadar AI Bot started", { port: PORT, webhook: WEBHOOK_URL });

  await setupWebhook();
  await setBotCommands();
});

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down");
  await fetch(`${TELEGRAM_API}/deleteWebhook`).catch(() => {});
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await fetch(`${TELEGRAM_API}/deleteWebhook`).catch(() => {});
  process.exit(0);
});
