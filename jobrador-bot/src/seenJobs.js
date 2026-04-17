const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SEEN_JOBS_FILE = path.join(__dirname, "../data/seen_jobs.json");
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function load() {
  try {
    return JSON.parse(fs.readFileSync(SEEN_JOBS_FILE, "utf8"));
  } catch {
    return {};
  }
}

function save(data) {
  fs.writeFileSync(SEEN_JOBS_FILE, JSON.stringify(data, null, 2));
}

function jobIdFromSection(section) {
  const titleMatch = section.match(/🎯\s+\*([^*]+)\*/);
  const companyMatch = section.match(/🏢\s+([^—\n]+)/);
  if (!titleMatch || !companyMatch) return null;
  return crypto
    .createHash("sha1")
    .update(`${titleMatch[1].trim()}|${companyMatch[1].trim()}`)
    .digest("hex")
    .slice(0, 12);
}

function splitSections(text) {
  return text
    .split(/\n\s*-{3,}\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Returns only the job sections not yet seen by this user, and marks them as seen.
function filterAndMarkNew(userId, text) {
  const data = load();
  if (!data[userId]) data[userId] = {};
  const now = Date.now();

  // Purge expired entries
  for (const id of Object.keys(data[userId])) {
    if (now - data[userId][id] > TTL_MS) delete data[userId][id];
  }

  const sections = splitSections(text);
  const newSections = [];

  for (const section of sections) {
    const id = jobIdFromSection(section);
    if (!id || !data[userId][id]) {
      newSections.push(section);
      if (id) data[userId][id] = now;
    }
  }

  save(data);
  return newSections.join("\n\n---\n\n");
}

module.exports = { filterAndMarkNew };
