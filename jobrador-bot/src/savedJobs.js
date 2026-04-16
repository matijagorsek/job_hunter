const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const JOBS_FILE = path.join(__dirname, "../data/jobs.json");

function loadJobs() {
  try {
    return JSON.parse(fs.readFileSync(JOBS_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveJobsFile(jobs) {
  fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));
}

function saveJob(userId, title, company, jd) {
  const jobs = loadJobs();
  if (!jobs[userId]) jobs[userId] = {};
  const id = crypto.randomBytes(3).toString("hex");
  jobs[userId][id] = { id, title, company, jd, savedAt: new Date().toISOString() };
  saveJobsFile(jobs);
  return id;
}

function getJob(userId, jobId) {
  const jobs = loadJobs();
  return (jobs[userId] || {})[jobId] || null;
}

function listJobs(userId) {
  const jobs = loadJobs();
  return Object.values(jobs[userId] || {});
}

module.exports = { saveJob, getJob, listJobs };
