const { runAgent } = require("../claude");

const QUESTIONS_PROMPT = `You are in INTERVIEW PREP mode.
Given a job description, generate exactly 8-10 interview questions tailored to the role.
Categorise each question as one of: Technical, Behavioural, or Situational.

Return ONLY a JSON array with this exact format — no markdown fences, no explanation, just the array:
[
  {"category": "Technical", "question": "..."},
  {"category": "Behavioural", "question": "..."}
]

Make the questions highly specific to the JD requirements. Mix technical depth with behavioural insight.`;

async function generateQuestions(title, company, jd) {
  const raw = await runAgent(QUESTIONS_PROMPT, `Role: ${title} at ${company}\n\nJob Description:\n${jd}`);
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Failed to parse interview questions from Claude response");
  return JSON.parse(match[0]);
}

async function generateModelAnswer(title, company, question) {
  const prompt = `You are an interview coach providing a model answer for a ${title} role at ${company}.
Structure: direct answer (1-2 sentences) + supporting evidence or example + why it matters for this role.
Max 120 words. Use Telegram-friendly formatting (*bold* for key points).`;
  return runAgent(prompt, question);
}

async function evaluateAnswer(question, userAnswer, jobTitle) {
  const prompt = `You are an interview coach evaluating a candidate's answer for a ${jobTitle} interview.
Interview question: ${question}

Evaluate the answer below. Provide:
- What was strong
- What could be improved
- Score: ⭐ to ⭐⭐⭐⭐⭐

Keep feedback under 100 words total.`;
  return runAgent(prompt, userAnswer);
}

module.exports = { generateQuestions, generateModelAnswer, evaluateAnswer };
