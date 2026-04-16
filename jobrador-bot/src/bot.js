const { chat, profile, saveProfile } = require("./claude");
const { searchJobs } = require("./agents/jobSearch");
const { adviseCv, analyzeCvDocument } = require("./agents/cvAdvisor");
const { generateCoverLetter } = require("./agents/coverLetter");
const { salaryIntel } = require("./agents/salary");
const { saveJob, updateStatus, getBoard } = require("./jobBoard");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

const STATUS_EMOJI  = { saved: '📌', applied: '✅', interview: '🎙', offer: '🎉', rejected: '❌' };
const STATUS_LABEL  = { saved: 'Saved', applied: 'Applied', interview: 'Interview', offer: 'Offer', rejected: 'Rejected' };
const ACTION_TO_STATUS = { apply: 'applied', reject: 'rejected', interview: 'interview', offer: 'offer' };

function formatJobLine(job) {
  const company = job.company ? ` @ ${job.company}` : '';
  return `• \`${job.id}\` — ${job.title}${company}\n  ${job.url}`;
}

function buildJobInlineKeyboard(job) {
  const transitions = {
    saved:     [['✅ Applied', 'applied'], ['❌ Reject', 'rejected']],
    applied:   [['🎙 Interview', 'interview'], ['❌ Reject', 'rejected']],
    interview: [['🎉 Offer', 'offer'], ['❌ Reject', 'rejected']],
    offer:     [],
    rejected:  [['↩️ Restore', 'saved']],
  };
  const buttons = (transitions[job.status] || []).map(([text, action]) => ({
    text,
    callback_data: `board_${action}_${job.id}`,
  }));
  if (!buttons.length) return undefined;
  return { inline_keyboard: [buttons] };
}

const ALLOWED_CHAT_IDS = process.env.ALLOWED_CHAT_IDS
  ? process.env.ALLOWED_CHAT_IDS.split(",").map((id) => parseInt(id.trim(), 10))
  : [];

// Per-user conversation history (in-memory, resets on restart)
const conversations = new Map();
const MAX_HISTORY = 20; // keep last 20 messages per user

// Rate limiting: max 5 requests per 60 seconds per user
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(userId) {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (timestamps.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(userId, timestamps);
    return true;
  }
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return false;
}

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

async function answerCallbackQuery(queryId, text = '') {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: queryId, text }),
  }).catch(() => {});
}

async function handleCallbackQuery(query) {
  const chatId = query.message.chat.id;
  if (!ALLOWED_CHAT_IDS.includes(chatId)) {
    await answerCallbackQuery(query.id, 'Unauthorised');
    return;
  }

  const parts = query.data.split('_');
  if (parts[0] !== 'board' || parts.length !== 3) {
    await answerCallbackQuery(query.id);
    return;
  }

  const [, action, id] = parts;
  const job = updateStatus(id, action);
  if (!job) {
    await answerCallbackQuery(query.id, 'Job not found');
    return;
  }

  await answerCallbackQuery(query.id, `Moved to ${STATUS_LABEL[action]}`);
  const company = job.company ? ` @ ${job.company}` : '';
  const keyboard = buildJobInlineKeyboard(job);
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: `${STATUS_EMOJI[job.status]} *${job.title}*${company} → *${STATUS_LABEL[job.status]}*`,
      parse_mode: 'Markdown',
      ...(keyboard && { reply_markup: keyboard }),
    }),
  }).catch(() => {});
}

const SUPPORTED_CV_MIME_TYPES = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

async function downloadTelegramFile(fileId) {
  const res = await fetch(`${TELEGRAM_API}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const data = await res.json();
  const filePath = data.result.file_path;
  const fileRes = await fetch(
    `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`,
  );
  return Buffer.from(await fileRes.arrayBuffer());
}

async function extractTextFromBuffer(buffer, format) {
  if (format === "pdf") {
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (format === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  return null;
}

async function handleDocument(chatId, userId, document) {
  const format = SUPPORTED_CV_MIME_TYPES[document.mime_type];
  if (!format) {
    await sendMessage(chatId, "Unsupported file format. Please send a PDF or DOCX file.");
    return;
  }

  await sendMessage(chatId, `📄 Processing your CV (${format.toUpperCase()})...`);
  await sendTyping(chatId);

  const buffer = await downloadTelegramFile(document.file_id);
  const text = await extractTextFromBuffer(buffer, format);

  if (!text || text.trim().length < 50) {
    await sendMessage(chatId, "Could not extract text from the file. Please ensure it contains readable text.");
    return;
  }

  const advice = await adviseCv(`Analyze this CV:\n\n${text}`);
  addToHistory(userId, "user", `Uploaded CV (${format.toUpperCase()}): ${document.file_name || "cv"}`);
  addToHistory(userId, "assistant", advice);
  await sendMessage(chatId, advice);
}

async function handleUpdate(update) {
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return;
  }

  const message = update.message;
  if (!message) return;

  const chatId = message.chat.id;
  if (!ALLOWED_CHAT_IDS.includes(chatId)) {
    await sendMessage(chatId, "Unauthorised");
    return;
  }
  const userId = message.from.id;

  if (isRateLimited(userId)) {
    await sendMessage(
      chatId,
      `⏳ You're sending too many requests. Please wait a moment before trying again.`,
    );
    return;
  }

  await sendTyping(chatId);

  try {
    if (message.document) {
      await handleDocument(chatId, userId, message.document);
    } else if (message.text) {
      const text = message.text.trim();
      if (text.startsWith("/")) {
        await handleCommand(chatId, userId, text);
      } else {
        await handleChat(chatId, userId, text);
      }
    }
  } catch (error) {
    console.error("Error handling message:", { userId, chatId, error: error.message, stack: error.stack });
    let userMessage = "⚠️ Something went wrong. Try again in a moment.";
    if (error?.status === 429 || error?.message?.toLowerCase().includes("rate limit")) {
      userMessage = "⚠️ AI service is busy right now. Please wait a moment and try again.";
    } else if (error?.code === "ECONNRESET" || error?.message?.toLowerCase().includes("timeout")) {
      userMessage = "⚠️ Request timed out. Please try again.";
    } else if (error?.status >= 500) {
      userMessage = "⚠️ AI service is temporarily unavailable. Please try again later.";
    }
    await sendMessage(chatId, userMessage);
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
          `📎 Send a PDF or DOCX file to analyze that CV\n` +
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
      trackUsage(userId, "search", searchQuery || "general");
      await sendMessage(chatId, jobs);
      await sendMessage(chatId, t(lang, "searchTip"));
      break;
    }

    case "/cv":
      await sendMessage(chatId, t(lang, "analyzingCv"));
      await sendTyping(chatId);
      const cvAdvice = await adviseCv(rawArgs);
      addToHistory(userId, "user", `CV advice: ${rawArgs || "general review"}`);
      addToHistory(userId, "assistant", cvAdvice);
      trackUsage(userId, "cv");
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
      await sendMessage(chatId, t(lang, "writingCoverLetter"));
      await sendTyping(chatId);
      const letter = await generateCoverLetter(rawArgs);
      addToHistory(userId, "user", `Cover letter: ${rawArgs}`);
      addToHistory(userId, "assistant", letter);
      trackUsage(userId, "cover");
      await sendMessage(chatId, letter);
      break;

    case "/salary": {
      const salaryFilterPattern = /--?(location|role)\s+([^\s-][^\s]*(?:\s+[^\s-][^\s]*)*?)(?=\s+--|$)/gi;
      let salaryMatch;
      const salaryFilters = {};
      let salaryFilterInput = rawArgs;
      while ((salaryMatch = salaryFilterPattern.exec(rawArgs)) !== null) {
        salaryFilters[salaryMatch[1].toLowerCase()] = salaryMatch[2].trim();
      }
      const salaryQuery = salaryFilterInput.replace(/--?(location|role)\s+\S+/gi, "").trim();
      await sendMessage(chatId, t(lang, "researchingRates"));
      await sendTyping(chatId);
      const salary = await salaryIntel(rawArgs);
      addToHistory(userId, "user", `Salary info: ${rawArgs || "general"}`);
      addToHistory(userId, "assistant", salary);
      trackUsage(userId, "salary");
      await sendMessage(chatId, salary);
      break;
    }

    case "/profile": {
      const subCmd = args[0];
      if (subCmd === "set") {
        const field = args[1];
        const value = args.slice(2).join(" ").trim();
        if (!field || !value) {
          await sendMessage(chatId, t(lang, "profileUsage"));
          break;
        }
        switch (field.toLowerCase()) {
          case "title":
            profile.title = value;
            break;
          case "location":
            profile.location = value;
            break;
          case "skills":
            profile.skills.primary = value.split(",").map((s) => s.trim()).filter(Boolean);
            break;
          case "roles":
            profile.preferredRoles = value.split(",").map((s) => s.trim()).filter(Boolean);
            break;
          case "salary": {
            const parts = value.split("-").map((s) => parseInt(s.trim(), 10));
            if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
              await sendMessage(chatId, t(lang, "invalidSalary"));
              break;
            }
            profile.preferences.salaryRange.min = parts[0];
            profile.preferences.salaryRange.max = parts[1];
            break;
          }
          default:
            await sendMessage(chatId, t(lang, "unknownField", field));
            break;
        }
        saveProfile();
        await sendMessage(chatId, t(lang, "profileUpdated", field));
        break;
      }

      const profileSkills = [
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
          `*Key Skills:* ${profileSkills.join(", ")}\n\n` +
          `*Looking for:* ${profile.preferredRoles.slice(0, 4).join(", ")}\n` +
          `*Salary:* $${profile.preferences.salaryRange.min / 1000}k-$${profile.preferences.salaryRange.max / 1000}k\n` +
          `*Type:* Full remote, ${profile.preferences.contractType.join(" or ")}\n\n` +
          `_Use /profile set <field> <value> to update_`,
      );
      break;
    }

    case "/stats": {
      const userStat = getUserStats(userId);
      await sendMessage(chatId, t(lang, "statsText", userStat));
      break;
    }

    case "/remind": {
      const subCmd = args[0]?.toLowerCase();
      if (subCmd === "on") {
        setReminder(chatId, userId, true);
        await sendMessage(chatId, t(lang, "reminderEnabled"));
      } else if (subCmd === "off") {
        setReminder(chatId, userId, false);
        await sendMessage(chatId, t(lang, "reminderDisabled"));
      } else {
        await sendMessage(chatId, t(lang, "reminderUsage"));
      }
      break;
    }

    case "/save": {
      if (!rawArgs.trim()) {
        await sendMessage(chatId, '💾 Usage: `/save <url> [title] [at company]`\nExample: `/save https://jobs.example.com/123 Senior Android at Spotify`');
        return;
      }
      const urlMatch = rawArgs.trim().match(/^(https?:\/\/\S+)(.*)?$/);
      if (!urlMatch) {
        await sendMessage(chatId, '⚠️ Please provide a valid URL starting with http:// or https://');
        return;
      }
      const url = urlMatch[1];
      const rest = (urlMatch[2] || '').trim();
      let title = '';
      let company = '';
      const atIdx = rest.toLowerCase().lastIndexOf(' at ');
      if (atIdx !== -1) {
        title = rest.slice(0, atIdx).trim();
        company = rest.slice(atIdx + 4).trim();
      } else {
        title = rest;
      }
      const { job, created } = saveJob(url, title, company);
      if (!created) {
        await sendMessage(chatId, `ℹ️ Already saved as \`${job.id}\` (status: *${STATUS_LABEL[job.status]}*)`);
        return;
      }
      const saveCompany = job.company ? ` @ ${job.company}` : '';
      const saveKeyboard = buildJobInlineKeyboard(job);
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `💾 Saved *${job.title}*${saveCompany}\nID: \`${job.id}\`\n${job.url}`,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
          ...(saveKeyboard && { reply_markup: saveKeyboard }),
        }),
      }).catch(() => {});
      break;
    }

    case "/board": {
      const board = getBoard();
      const total = Object.values(board).reduce((sum, jobs) => sum + jobs.length, 0);
      if (!total) {
        await sendMessage(chatId, '📋 *Job Board*\n\nNo saved jobs yet.\n\nUse `/save <url> [title] [at company]` to save a job.');
        return;
      }
      const lines = ['📋 *Job Board*\n'];
      for (const status of ['saved', 'applied', 'interview', 'offer', 'rejected']) {
        const jobs = board[status];
        lines.push(`${STATUS_EMOJI[status]} *${STATUS_LABEL[status]}* (${jobs.length})`);
        if (jobs.length) lines.push(jobs.map(formatJobLine).join('\n'));
      }
      lines.push('\n_Use /apply, /reject, /interview, /offer <id> to move jobs_');
      await sendMessage(chatId, lines.join('\n'));
      break;
    }

    case "/apply":
    case "/reject":
    case "/interview":
    case "/offer": {
      const cmdName = command.toLowerCase().replace(/^\//, '').replace(/@\w+$/, '');
      const newStatus = ACTION_TO_STATUS[cmdName];
      const jobId = rawArgs.trim();
      if (!jobId) {
        await sendMessage(chatId, `⚠️ Usage: \`${command} <id>\`\nUse /board to see job IDs.`);
        return;
      }
      const updatedJob = updateStatus(jobId, newStatus);
      if (!updatedJob) {
        await sendMessage(chatId, `⚠️ Job \`${jobId}\` not found. Use /board to see your saved jobs.`);
        return;
      }
      const updCompany = updatedJob.company ? ` @ ${updatedJob.company}` : '';
      const updKeyboard = buildJobInlineKeyboard(updatedJob);
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `${STATUS_EMOJI[updatedJob.status]} *${updatedJob.title}*${updCompany} → *${STATUS_LABEL[updatedJob.status]}*`,
          parse_mode: 'Markdown',
          ...(updKeyboard && { reply_markup: updKeyboard }),
        }),
      }).catch(() => {});
      break;
    }

    default:
      await sendMessage(chatId, t(lang, "unknownCommand"));
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

module.exports = { handleUpdate, sendMessage, splitMessage, parseFilters };
