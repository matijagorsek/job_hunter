const fs = require("fs");
const path = require("path");

const STATS_FILE = path.join(__dirname, "../data/stats.json");

function loadStats() {
  try {
    return JSON.parse(fs.readFileSync(STATS_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveStats(stats) {
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

function ensureUser(stats, userId) {
  if (!stats[userId]) {
    stats[userId] = {
      searches: 0,
      cvChecks: 0,
      coverLetters: 0,
      salaryChecks: 0,
      lastActive: null,
      recentSearches: [],
      reminder: false,
      chatId: null,
    };
  }
}

function trackUsage(userId, action, detail) {
  const stats = loadStats();
  ensureUser(stats, userId);
  stats[userId].lastActive = new Date().toISOString();
  if (action === "search") {
    stats[userId].searches = (stats[userId].searches || 0) + 1;
    if (detail) {
      const prev = stats[userId].recentSearches || [];
      stats[userId].recentSearches = [detail, ...prev].slice(0, 5);
    }
  } else if (action === "cv") {
    stats[userId].cvChecks = (stats[userId].cvChecks || 0) + 1;
  } else if (action === "cover") {
    stats[userId].coverLetters = (stats[userId].coverLetters || 0) + 1;
  } else if (action === "salary") {
    stats[userId].salaryChecks = (stats[userId].salaryChecks || 0) + 1;
  }
  saveStats(stats);
}

function getUserStats(userId) {
  const stats = loadStats();
  ensureUser(stats, userId);
  return stats[userId];
}

function setReminder(chatId, userId, enabled) {
  const stats = loadStats();
  ensureUser(stats, userId);
  stats[userId].reminder = enabled;
  stats[userId].chatId = chatId;
  saveStats(stats);
}

function getReminderChats() {
  const stats = loadStats();
  return Object.entries(stats)
    .filter(([, s]) => s.reminder && s.chatId)
    .map(([userId, s]) => ({ chatId: s.chatId, userId: parseInt(userId, 10) }));
}

module.exports = { trackUsage, getUserStats, setReminder, getReminderChats };
