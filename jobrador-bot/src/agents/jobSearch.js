const { runAgent, profile } = require("../claude");

function buildAgentPrompt() {
  const allSkills = [
    ...profile.skills.primary,
    ...profile.skills.frameworks,
    ...profile.skills.ai,
    ...profile.skills.infrastructure,
    ...(profile.skills.other || []),
  ];

  const salaryMin = profile.preferences.salaryRange.min / 1000;
  const salaryMax = profile.preferences.salaryRange.max / 1000;

  return `You are in JOB SEARCH mode with enhanced NLP matching.

## Candidate Profile for Matching
- **Skills**: ${allSkills.join(", ")}
- **Preferred roles**: ${profile.preferredRoles.join(", ")}
- **Experience**: ${profile.yearsExperience}+ years
- **Salary target**: $${salaryMin}k–$${salaryMax}k USD
- **Contract types**: ${profile.preferences.contractType.join(" or ")}
- **Timezone**: ${profile.preferences.timezone}
- **Remote**: required (no relocation)
- **Key differentiator**: Android + MCP/agentic AI systems (rare combo)

## Matching Criteria (use these dimensions to score each job)
1. **Skills alignment** (35%) — how many required skills overlap with candidate's skill set
2. **Role level fit** (20%) — seniority and responsibilities match 12+ yrs experience
3. **Salary fit** (20%) — offered range overlaps $${salaryMin}k–$${salaryMax}k
4. **Remote & timezone** (15%) — fully remote, CET-compatible hours
5. **Contract type** (10%) — full-time or contract

Compute a weighted match % from these five dimensions. Show the breakdown.

## Output Format (per job)

🎯 *[Job Title]*
🏢 [Company] — [Company Type/Size]
📍 Remote [timezone note]
💰 [Salary Range]
📊 Match: [X]% _(Skills: X% · Level: X% · Salary: X% · Remote: X% · Contract: X%)_

[2-3 sentence description]

*Why this matches:*
• [skill or experience overlap reason]
• [role/level alignment reason]

*Key requirements:*
• [req 1]
• [req 2]

---

Present 4-5 jobs sorted by match % descending. Mix company sizes (startup, mid-size, enterprise) and role types (pure Android + AI-adjacent).`;
}

async function searchJobs(query, filters = {}) {
  let userMsg = query
    ? `Search for remote jobs matching: "${query}"`
    : "Find the best remote job matches for my profile right now. Include a mix of pure Android roles and AI-adjacent roles.";

  const constraints = [];
  if (filters.location) constraints.push(`Location preference: ${filters.location}`);
  if (filters.type) constraints.push(`Job type: ${filters.type}`);
  if (filters.industry) constraints.push(`Industry/sector: ${filters.industry}`);

  if (constraints.length > 0) {
    userMsg += `\n\nFilters to apply:\n${constraints.map((c) => `- ${c}`).join("\n")}`;
  }

  return runAgent(buildAgentPrompt(), userMsg);
}

module.exports = { searchJobs };
