const { chat, profile } = require("./claude");
const { searchJobs } = require("./agents/jobSearch");
const { adviseCv } = require("./agents/cvAdvisor");
const { generateCoverLetter } = require("./agents/coverLetter");
const { salaryIntel } = require("./agents/salary");

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

const ALLOWED_CHAT_IDS = process.env.ALLOWED_CHAT_IDS
  ? process.env.ALLOWED_CHAT_IDS.split(",").map((id) => parseInt(id.trim(), 10))
  : [];

// Per-user conversation history (in-memory, resets on restart)
const conversations = new Map();
const MAX_HISTORY = 20; // keep last 20 messages per user

function getHistory(userId) {
  if (!conversations.has(userId)) {
    conversations.set(userId, []);
  }
  return conversations.get(userId);
}

function addToHistory(userId, role, content) {
  const history = getHistory(userId);
  history.push({ role, content });
  // Trim to keep memory bounded
  if (history.length > MAX_HISTORY * 2) {
    conversations.set(userId, history.slice(-MAX_HISTORY * 2));
  }
}

async function sendMessage(chatId, text, options = {}) {
  // Telegram has a 4096 char limit per message
  const chunks = splitMessage(text, 4000);

  for (const chunk of chunks) {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: chunk,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
        ...options,
      }),
    }).catch(async () => {
      // Fallback without Markdown if parsing fails
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
          disable_web_page_preview: true,
          ...options,
        }),
      });
    });
  }
}

function splitMessage(text, maxLength) {
  if (text.length <= maxLength) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Try to split at newline
    let splitIdx = remaining.lastIndexOf("\n", maxLength);
    if (splitIdx < maxLength * 0.3) {
      // No good newline break, split at space
      splitIdx = remaining.lastIndexOf(" ", maxLength);
    }
    if (splitIdx < maxLength * 0.3) {
      // No good break at all, hard split
      splitIdx = maxLength;
    }

    chunks.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx).trimStart();
  }

  return chunks;
}

async function sendTyping(chatId) {
  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  }).catch(() => {});
}

async function handleUpdate(update) {
  const message = update.message;
  if (!message?.text) return;

  const chatId = message.chat.id;
  if (!ALLOWED_CHAT_IDS.includes(chatId)) {
    await sendMessage(chatId, "Unauthorised");
    return;
  }
  const userId = message.from.id;
  const text = message.text.trim();

  // Show typing indicator
  await sendTyping(chatId);

  try {
    // Command routing
    if (text.startsWith("/")) {
      await handleCommand(chatId, userId, text);
    } else {
      await handleChat(chatId, userId, text);
    }
  } catch (error) {
    console.error("Error handling message:", error);
    await sendMessage(chatId, "⚠️ Something went wrong. Try again in a moment.");
  }
}

function parseFilters(input) {
  const filters = {};
  const filterPattern = /--?(location|type|industry)\s+([^\s-][^\s]*)/gi;
  let match;
  while ((match = filterPattern.exec(input)) !== null) {
    filters[match[1].toLowerCase()] = match[2];
  }
  const query = input.replace(/--?(location|type|industry)\s+\S+/gi, "").trim();
  return { query, filters };
}

async function handleCommand(chatId, userId, text) {
  const [command, ...args] = text.split(" ");
  const rawArgs = args.join(" ");

  switch (command.toLowerCase().replace(/@\w+/, "")) {
    case "/start":
    case "/help":
      await sendMessage(
        chatId,
        `🎯 *JobRadar AI* — Your Career Assistant\n\n` +
          `Hey ${profile.name}! Here's what I can do:\n\n` +
          `🔍 /search — Find remote jobs for your profile\n` +
          `🔍 /search _keywords_ — Search with specific terms\n` +
          `🔍 /search --location europe --type fulltime --industry fintech\n` +
          `📄 /cv — Get CV improvement advice\n` +
          `✉️ /cover — Generate a cover letter\n` +
          `💰 /salary — Salary market insights\n` +
          `👤 /profile — View your profile summary\n\n` +
          `Or just chat naturally! I understand context.\n\n` +
          `_Examples:_\n` +
          `• "Find Android jobs paying over $150k"\n` +
          `• "Write a cover letter for Spotify"\n` +
          `• "Is my CV good for FAANG?"\n` +
          `• "What should I charge as a contractor?"`,
      );
      break;

    case "/search": {
      const { query: searchQuery, filters } = parseFilters(rawArgs);
      await sendMessage(chatId, "🔍 Scanning job boards...");
      await sendTyping(chatId);
      const jobs = await searchJobs(searchQuery, filters);
      addToHistory(userId, "user", `Search for jobs: ${searchQuery || "general search"}`);
      addToHistory(userId, "assistant", jobs);
      await sendMessage(chatId, jobs);
      break;
    }

    case "/cv":
      await sendMessage(chatId, "📄 Analyzing your CV...");
      await sendTyping(chatId);
      const cvAdvice = await adviseCv(rawArgs);
      addToHistory(userId, "user", `CV advice: ${rawArgs || "general review"}`);
      addToHistory(userId, "assistant", cvAdvice);
      await sendMessage(chatId, cvAdvice);
      break;

    case "/cover":
      if (!rawArgs) {
        await sendMessage(
          chatId,
          "✉️ Tell me the role! Example:\n`/cover Staff Android Engineer at Spotify`",
        );
        return;
      }
      await sendMessage(chatId, "✉️ Writing your cover letter...");
      await sendTyping(chatId);
      const letter = await generateCoverLetter(rawArgs);
      addToHistory(userId, "user", `Cover letter: ${rawArgs}`);
      addToHistory(userId, "assistant", letter);
      await sendMessage(chatId, letter);
      break;

    case "/salary":
      await sendMessage(chatId, "💰 Researching market rates...");
      await sendTyping(chatId);
      const salary = await salaryIntel(rawArgs);
      addToHistory(userId, "user", `Salary info: ${rawArgs || "general"}`);
      addToHistory(userId, "assistant", salary);
      await sendMessage(chatId, salary);
      break;

    case "/profile":
      const skills = [
        ...profile.skills.primary,
        ...profile.skills.ai.slice(0, 3),
      ];
      await sendMessage(
        chatId,
        `👤 *Your Profile*\n\n` +
          `*${profile.name}*\n` +
          `${profile.title}\n` +
          `📍 ${profile.location}\n` +
          `💼 ${profile.yearsExperience}+ years experience\n` +
          `🏢 Currently: ${profile.currentRole.title} @ ${profile.currentRole.company}\n\n` +
          `*Key Skills:* ${skills.join(", ")}\n\n` +
          `*Looking for:* ${profile.preferredRoles.slice(0, 4).join(", ")}\n` +
          `*Salary:* $${profile.preferences.salaryRange.min / 1000}k-$${profile.preferences.salaryRange.max / 1000}k\n` +
          `*Type:* Full remote, ${profile.preferences.contractType.join(" or ")}`,
      );
      break;

    default:
      await sendMessage(chatId, "Unknown command. Try /help to see what I can do.");
  }
}

async function handleChat(chatId, userId, text) {
  // Add user message to history
  addToHistory(userId, "user", text);

  // Keep typing indicator alive for long requests
  const typingInterval = setInterval(() => sendTyping(chatId), 4000);

  try {
    const history = getHistory(userId);
    const response = await chat(history);

    addToHistory(userId, "assistant", response);
    await sendMessage(chatId, response);
  } finally {
    clearInterval(typingInterval);
  }
}

module.exports = { handleUpdate, sendMessage };
