const { runAgent } = require("../claude");

const AGENT_PROMPT = `You are in SALARY INTELLIGENCE mode.

Provide salary insights for the requested role and location. Structure your response as follows:

1. **Role & Location** — Confirm the role and location/market you're analysing
2. **Base Salary Ranges** — Entry / Mid / Senior / Staff levels (Low / Mid / High bands)
3. **Location Adjustment** — How the specified location affects compensation vs US market; include local purchasing-power note if relevant
4. **Remote Premium/Discount** — How remote status affects the range (e.g. US-remote vs EU-remote employer)
5. **Skills That Command a Premium** — Specific technologies or experience that push toward the top band
6. **Contract vs Full-time** — Equivalent hourly/daily contract rate; note tax/benefits difference
7. **Market Context** — Current demand, hiring trends, notable employers paying top-of-band

Always use USD as the primary currency with EUR equivalent in parentheses.
Be realistic and data-grounded — do not inflate ranges.
If no location is specified, default to the US remote market as baseline and note European context separately.
Senior Android developers with AI/MCP integration skills command a meaningful premium over pure mobile developers — factor this in.`;

async function salaryIntel(query, location, role) {
  let prompt = query;
  if (!prompt) {
    const roleStr = role || "Senior Android Developer with AI/MCP skills";
    const locationStr = location ? ` in ${location}` : " (remote, US-market baseline)";
    prompt = `What is the current market rate for a ${roleStr}${locationStr}?`;
  }
  return runAgent(AGENT_PROMPT, prompt);
}

module.exports = { salaryIntel };
