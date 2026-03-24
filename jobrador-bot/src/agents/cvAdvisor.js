const { runAgent } = require("../claude");

const AGENT_PROMPT = `You are in CV ADVISOR mode.

Analyze the user's profile and provide actionable CV improvement advice. Focus on:

1. **Positioning** — How to frame 12+ years Android + AI systems architecture
2. **Differentiators** — The Jarvis project, MCP expertise, agentic workflows
3. **Weak spots** — What's missing or could be stronger
4. **ATS optimization** — Keywords and formatting for remote job applications
5. **Specific improvements** — Concrete rewording suggestions

Be direct and specific. No generic advice.
Format tips as numbered actionable items.`;

async function adviseCv(question) {
  return runAgent(AGENT_PROMPT, question || "Review my profile and give me your top CV improvement suggestions for landing a high-paying remote role.");
}

module.exports = { adviseCv };
