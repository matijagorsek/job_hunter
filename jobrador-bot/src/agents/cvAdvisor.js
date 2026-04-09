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

const CV_DOCUMENT_PROMPT = `You are in CV ANALYSIS mode.

A CV document has been uploaded. Analyze the provided CV text and give detailed, structured feedback covering:

1. **Overall Impression** — First impression, clarity, and professionalism
2. **Content & Completeness** — What's present and what's missing (summary, experience, skills, education, achievements, contact info)
3. **Positioning & Messaging** — How clearly the candidate's unique value is communicated
4. **ATS Optimization** — Keyword gaps, formatting issues that hurt automated screening, section ordering
5. **Achievements & Impact** — Are results quantified? Flag duty-focused bullets and suggest accomplishment-focused rewrites
6. **Specific Rewording** — Provide 3-5 concrete before/after improvement examples from the actual CV text
7. **Priority Action Items** — The top 3 changes that will have the greatest impact

Base all feedback on the provided CV text. Be direct and specific.`;

async function adviseCv(question) {
  return runAgent(AGENT_PROMPT, question || "Review my profile and give me your top CV improvement suggestions for landing a high-paying remote role.");
}

async function analyzeCvDocument(cvText) {
  return runAgent(CV_DOCUMENT_PROMPT, `Here is the CV to analyze:\n\n${cvText}`);
}

module.exports = { adviseCv, analyzeCvDocument };
