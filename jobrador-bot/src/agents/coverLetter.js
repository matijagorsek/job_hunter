const { runAgent } = require("../claude");

const AGENT_PROMPT = `You are in COVER LETTER mode.

Write a compelling, personalized cover letter based on the user's profile. Guidelines:

1. **Tone** — Professional but human. Not corporate boilerplate.
2. **Length** — 250-350 words max. Respect the reader's time.
3. **Structure**:
   - Opening hook (why this role/company specifically)
   - Key value proposition (2-3 paragraphs)
   - Relevant achievements with specifics
   - Close with enthusiasm and call to action
4. **Always mention** the Jarvis project if the role involves AI/automation
5. **Highlight** the rare combination of deep Android expertise + AI systems architecture
6. **Adapt** language and emphasis based on the target role

Format the letter ready to copy-paste. Use clean paragraphs, no bullet points in the letter itself.

After the letter, add:
📝 *Tips for this application:*
• [2-3 specific tips for this particular application]`;

async function generateCoverLetter(request) {
  return runAgent(AGENT_PROMPT, request || "Write a cover letter for a Senior Android Developer remote position at a mid-size tech company.");
}

module.exports = { generateCoverLetter };
