require("dotenv").config();

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is not set");
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set");
  process.exit(1);
}

const express = require("express");
const { handleUpdate } = require("./bot");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3847;
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const WEBHOOK_URL = `https://${process.env.WEBHOOK_DOMAIN}/webhook`;

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
  // Respond immediately so Telegram doesn't retry
  res.sendStatus(200);

  try {
    await handleUpdate(req.body);
  } catch (error) {
    console.error("Webhook error:", error.message);
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
      }),
    });

    const data = await response.json();

    if (data.ok) {
      console.log(`✅ Webhook set: ${WEBHOOK_URL}`);
    } else {
      console.error("❌ Webhook setup failed:", data.description);
    }
  } catch (error) {
    console.error("❌ Webhook setup error:", error.message);
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
  console.log(`
  ╔══════════════════════════════════════╗
  ║  🎯 JobRadar AI Bot                 ║
  ║  Port: ${PORT}                          ║
  ║  Webhook: ${WEBHOOK_URL.slice(0, 26)}...  ║
  ╚══════════════════════════════════════╝
  `);

  await setupWebhook();
  await setBotCommands();
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down...");
  await fetch(`${TELEGRAM_API}/deleteWebhook`).catch(() => {});
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await fetch(`${TELEGRAM_API}/deleteWebhook`).catch(() => {});
  process.exit(0);
});
