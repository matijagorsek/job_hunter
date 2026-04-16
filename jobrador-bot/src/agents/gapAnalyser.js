const { runAgent } = require("../claude");

const GAP_ANALYSER_PROMPT = `You are in CV-TO-JOB GAP ANALYSER mode.

The candidate's full profile is in your system context. You will receive a job description. Analyse the fit and return a structured report.

Respond ONLY in this exact format (no extra prose before or after):

🎯 *Fit Score: XX/100*

✅ *Matched Skills*
• [skill from profile that the JD explicitly or implicitly requires]
• ...

❌ *Missing / Weak Keywords*
• [keyword or skill the JD requires that is absent or underrepresented in the profile]
• ...

🔧 *3 CV Tweaks to Improve ATS Pass Rate*
1. [Concrete rewrite — quote the exact JD term and show where/how to add it to the CV]
2. [Concrete rewrite]
3. [Concrete rewrite]

📝 *Verdict*
[2–3 sentences: honest assessment of candidacy strength for this specific role, and whether to apply]

Be specific to the actual JD provided. No generic advice.`;

async function analyseJobFit(jdText) {
  return runAgent(GAP_ANALYSER_PROMPT, `Analyse this job description against my profile:\n\n${jdText}`);
}

module.exports = { analyseJobFit };
