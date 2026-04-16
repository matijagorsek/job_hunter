const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BOARD_FILE = path.join(__dirname, '../data/jobboard.json');

const STATUSES = ['saved', 'applied', 'interview', 'offer', 'rejected'];

function load() {
  try {
    if (!fs.existsSync(BOARD_FILE)) return { jobs: [] };
    return JSON.parse(fs.readFileSync(BOARD_FILE, 'utf8'));
  } catch {
    return { jobs: [] };
  }
}

function persist(data) {
  fs.writeFileSync(BOARD_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function urlHash(url) {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 8);
}

function saveJob(url, title, company) {
  const data = load();
  const id = urlHash(url);
  const existing = data.jobs.find(j => j.id === id);
  if (existing) return { job: existing, created: false };
  const job = {
    id,
    url,
    title: title || 'Untitled',
    company: company || '',
    status: 'saved',
    savedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  data.jobs.push(job);
  persist(data);
  return { job, created: true };
}

function updateStatus(id, status) {
  if (!STATUSES.includes(status)) return null;
  const data = load();
  const job = data.jobs.find(j => j.id === id);
  if (!job) return null;
  job.status = status;
  job.updatedAt = new Date().toISOString();
  persist(data);
  return job;
}

function getBoard() {
  const data = load();
  const board = {};
  for (const status of STATUSES) {
    board[status] = data.jobs.filter(j => j.status === status);
  }
  return board;
}

function getJob(id) {
  return load().jobs.find(j => j.id === id) || null;
}

module.exports = { saveJob, updateStatus, getBoard, getJob, STATUSES };
