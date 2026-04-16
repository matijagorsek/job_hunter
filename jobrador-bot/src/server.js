require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const { handleUpdate, sendMessage } = require("./bot");
const { getReminderChats, getUserStats } = require("./stats");
const { t } = require("./i18n");
const logger = require("./logger");

const app = express();
app.use(express.json());

if (!process.env.ALLOWED_CHAT_IDS) {
  console.error("FATAL: ALLOWED_CHAT_IDS env var is not set. Refusing to start.");
  process.exit(1);
}

const PORT = process.env.PORT || 3847;
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const WEBHOOK_URL = `https://${process.env.WEBHOOK_DOMAIN}/webhook`;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

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
  if (!WEBHOOK_SECRET || req.headers["x-telegram-bot-api-secret-token"] !== WEBHOOK_SECRET) {
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
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true,
        ...(WEBHOOK_SECRET && { secret_token: WEBHOOK_SECRET }),
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
        { command: "stats", description: "📊 Your job search statistics" },
        { command: "remind", description: "🔔 Toggle daily job search reminder" },
        { command: "save", description: "💾 Save a job to your board" },
        { command: "board", description: "📋 View your job pipeline board" },
        { command: "apply", description: "✅ Mark a job as Applied" },
        { command: "interview", description: "🎙 Mark a job as Interview" },
        { command: "offer", description: "🎉 Mark a job as Offer" },
        { command: "reject", description: "❌ Mark a job as Rejected" },
        { command: "help", description: "❓ Show all commands" },
      ],
    }),
  }).catch(() => {});
}

function scheduleReminders() {
  function msUntilNextUTCHour(hour) {
    const now = new Date();
    const target = new Date(now);
    target.setUTCHours(hour, 0, 0, 0);
    if (target <= now) target.setUTCDate(target.getUTCDate() + 1);
    return target.getTime() - now.getTime();
  }

  async function sendReminders() {
    const reminders = getReminderChats();
    for (const { chatId, userId } of reminders) {
      const stat = getUserStats(userId);
      const recentSearch = (stat.recentSearches || [])[0] || null;
      await sendMessage(chatId, t("en", "dailyReminder", recentSearch)).catch(() => {});
    }
    setTimeout(sendReminders, 24 * 60 * 60 * 1000);
  }

  // 9am CET = 8am UTC
  setTimeout(sendReminders, msUntilNextUTCHour(8));
  logger.info("Daily reminder scheduler initialized");
}

if (require.main === module) {
  // Start server
  app.listen(PORT, async () => {
    logger.info("JobRadar AI Bot started", { port: PORT, webhook: WEBHOOK_URL });

    await setupWebhook();
    await setBotCommands();
    scheduleReminders();
  });

  // Global error handlers for clean PM2 restarts
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { message: err.message, stack: err.stack });
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason: reason instanceof Error ? { message: reason.message, stack: reason.stack } : reason });
    process.exit(1);
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
}

module.exports = { app };
