const { runAgent } = require("../claude");

const AGENT_PROMPT = `You are in JOB SEARCH mode.

Search for remote job opportunities matching the user's profile. Generate realistic, high-quality job listings that would actually exist on major job boards right now.

For each job, format as:

🎯 *[Job Title]*
🏢 [Company] — [Company Type/Size]
📍 Remote [timezone preference if any]
💰 [Salary Range]
📊 Match: [X]%

[2-3 sentence description]

*Why this matches:*
• [reason 1]
• [reason 2]

*Key requirements:*
• [req 1]
• [req 2]

---

Present 4-5 jobs sorted by match percentage. Mix different company sizes (startup, mid-size, enterprise) and role types.

If the user specifies keywords, focus on those. Otherwise, search broadly across Android, Mobile, and AI-adjacent roles.`;

async function searchJobs(query) {
  const userMsg = query
    ? `Search for remote jobs matching: "${query}"`
    : "Find the best remote job matches for my profile right now. Include a mix of pure Android roles and AI-adjacent roles.";

  return runAgent(AGENT_PROMPT, userMsg);
}

module.exports = { searchJobs };
