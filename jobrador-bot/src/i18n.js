const messages = {
  en: {
    unauthorized: "Unauthorised",
    rateLimit: "⏳ You're sending too many requests. Please wait a moment before trying again.",
    errorGeneric: "⚠️ Something went wrong. Try again in a moment.",
    errorAiBusy: "⚠️ AI service is busy right now. Please wait a moment and try again.",
    errorTimeout: "⚠️ Request timed out. Please try again.",
    errorUnavailable: "⚠️ AI service is temporarily unavailable. Please try again later.",
    unsupportedFile: "Unsupported file format. Please send a PDF or DOCX file.",
    processingCv: (fmt) => `📄 Processing your CV (${fmt})...`,
    cvExtractError: "Could not extract text from the file. Please ensure it contains readable text.",
    scanningJobs: "🔍 Scanning job boards...",
    analyzingCv: "📄 Analyzing your CV...",
    writingCoverLetter: "✉️ Writing your cover letter...",
    coverLetterPrompt: "✉️ Tell me the role! Example:\n`/cover Staff Android Engineer at Spotify`",
    researchingRates: "💰 Researching market rates...",
    profileUpdated: (field) => `✅ Profile updated: *${field}*`,
    profileUsage:
      "`/profile set title <title>`\n" +
      "`/profile set skills <skill1, skill2, ...>`\n" +
      "`/profile set roles <role1, role2, ...>`\n" +
      "`/profile set salary <min>-<max>` (USD)\n" +
      "`/profile set location <location>`",
    invalidSalary: "Invalid salary format. Use: `/profile set salary 100000-200000`",
    unknownField: (field) =>
      `Unknown field: \`${field}\`. Valid fields: title, location, skills, roles, salary`,
    unknownCommand: "Unknown command. Try /help to see what I can do.",
    statsText: (s) =>
      `📊 *Your Job Search Stats*\n\n` +
      `🔍 Searches run: ${s.searches || 0}\n` +
      `📄 CV reviews: ${s.cvChecks || 0}\n` +
      `✉️ Cover letters: ${s.coverLetters || 0}\n` +
      `💰 Salary checks: ${s.salaryChecks || 0}\n` +
      ((s.recentSearches || []).length > 0
        ? `\n*Recent searches:* ${s.recentSearches.join(", ")}`
        : ""),
    reminderEnabled: "🔔 Daily reminder enabled! I'll ping you at 9am CET each morning.",
    reminderDisabled: "🔕 Daily reminder disabled.",
    reminderUsage: "Usage: `/remind on` or `/remind off`",
    dailyReminder: (recentSearch) =>
      `👋 Good morning! Ready for today's job hunt?\n\n` +
      (recentSearch ? `💡 Last search: _${recentSearch}_\n` : "") +
      `Use /search to find new opportunities, or just chat!`,
    searchTip: "💡 _Tip: Use /cv for profile tips or /cover to draft a cover letter._",
    helpText: (name) =>
      `🎯 *JobRadar AI* — Your Career Assistant\n\n` +
      `Hey ${name}! Here's what I can do:\n\n` +
      `🔍 /search — Find remote jobs for your profile\n` +
      `🔍 /search _keywords_ — Search with specific terms\n` +
      `🔍 /search --location europe --type fulltime --industry fintech\n` +
      `📄 /cv — Get CV improvement advice\n` +
      `📎 Send a PDF or DOCX file to analyze that CV\n` +
      `✉️ /cover — Generate a cover letter\n` +
      `💰 /salary — Salary market insights\n` +
      `💰 /salary --role <role> --location <location>\n` +
      `👤 /profile — View your profile summary\n` +
      `👤 /profile set skills <list> — Update skills\n` +
      `👤 /profile set roles <list> — Update preferred roles\n` +
      `👤 /profile set salary <min>-<max> — Update salary range\n\n` +
      `Or just chat naturally! I understand context.\n\n` +
      `_Examples:_\n` +
      `• "Find Android jobs paying over $150k"\n` +
      `• "Write a cover letter for Spotify"\n` +
      `• "Is my CV good for FAANG?"\n` +
      `• "What should I charge as a contractor?"`,
  },
  hr: {
    unauthorized: "Neovlašteni pristup",
    rateLimit: "⏳ Šalješ previše zahtjeva. Molim pričekaj trenutak prije nego pokušaš ponovo.",
    errorGeneric: "⚠️ Nešto je pošlo po krivu. Pokušaj ponovo za trenutak.",
    errorAiBusy: "⚠️ AI servis je trenutno zauzet. Molim pričekaj trenutak i pokušaj ponovo.",
    errorTimeout: "⚠️ Zahtjev je istekao. Molim pokušaj ponovo.",
    errorUnavailable: "⚠️ AI servis je privremeno nedostupan. Molim pokušaj ponovo kasnije.",
    unsupportedFile: "Nepodržani format datoteke. Molim pošalji PDF ili DOCX datoteku.",
    processingCv: (fmt) => `📄 Obrađujem tvoj životopis (${fmt})...`,
    cvExtractError:
      "Nije moguće izvući tekst iz datoteke. Molim provjeri da li sadrži čitljivi tekst.",
    scanningJobs: "🔍 Pretražujem oglase za posao...",
    analyzingCv: "📄 Analiziram tvoj životopis...",
    writingCoverLetter: "✉️ Pišem tvoje motivacijsko pismo...",
    coverLetterPrompt:
      "✉️ Reci mi za koju poziciju! Primjer:\n`/cover Staff Android Engineer at Spotify`",
    researchingRates: "💰 Istražujem tržišne cijene...",
    profileUpdated: (field) => `✅ Profil ažuriran: *${field}*`,
    profileUsage:
      "`/profile set title <naslov>`\n" +
      "`/profile set skills <vještina1, vještina2, ...>`\n" +
      "`/profile set roles <uloga1, uloga2, ...>`\n" +
      "`/profile set salary <min>-<max>` (USD)\n" +
      "`/profile set location <lokacija>`",
    invalidSalary: "Nevažeći format plaće. Koristi: `/profile set salary 100000-200000`",
    unknownField: (field) =>
      `Nepoznato polje: \`${field}\`. Valjana polja: title, location, skills, roles, salary`,
    unknownCommand: "Nepoznata naredba. Pokušaj /help da vidiš što mogu.",
    statsText: (s) =>
      `📊 *Tvoja statistika*\n\n` +
      `🔍 Pretrage: ${s.searches || 0}\n` +
      `📄 Pregledi životopisa: ${s.cvChecks || 0}\n` +
      `✉️ Motivacijska pisma: ${s.coverLetters || 0}\n` +
      `💰 Provjere plaće: ${s.salaryChecks || 0}\n` +
      ((s.recentSearches || []).length > 0
        ? `\n*Nedavne pretrage:* ${s.recentSearches.join(", ")}`
        : ""),
    reminderEnabled: "🔔 Dnevni podsjetnik uključen! Javit ću ti se u 9h CET.",
    reminderDisabled: "🔕 Dnevni podsjetnik isključen.",
    reminderUsage: "Koristi: `/remind on` ili `/remind off`",
    dailyReminder: (recentSearch) =>
      `👋 Dobro jutro! Spreman za danas?\n\n` +
      (recentSearch ? `💡 Zadnja pretraga: _${recentSearch}_\n` : "") +
      `Koristi /search za nove prilike, ili samo chataj!`,
    searchTip: "💡 _Savjet: Koristi /cv za savjete o životopisu ili /cover za motivacijsko pismo._",
    helpText: (name) =>
      `🎯 *JobRadar AI* — Tvoj karijerski asistent\n\n` +
      `Hej ${name}! Evo što mogu:\n\n` +
      `🔍 /search — Pronađi remote poslove za tvoj profil\n` +
      `🔍 /search _ključne_riječi_ — Pretraži s određenim pojmovima\n` +
      `🔍 /search --location europe --type fulltime --industry fintech\n` +
      `📄 /cv — Savjeti za poboljšanje životopisa\n` +
      `📎 Pošalji PDF ili DOCX datoteku za analizu životopisa\n` +
      `✉️ /cover — Generiraj motivacijsko pismo\n` +
      `💰 /salary — Uvid u tržišne plaće\n` +
      `💰 /salary --role <uloga> --location <lokacija>\n` +
      `👤 /profile — Pogledaj sažetak profila\n` +
      `👤 /profile set skills <lista> — Ažuriraj vještine\n` +
      `👤 /profile set roles <lista> — Ažuriraj željene uloge\n` +
      `👤 /profile set salary <min>-<max> — Ažuriraj raspon plaće\n\n` +
      `Ili samo chataj prirodno! Razumijem kontekst.\n\n` +
      `_Primjeri:_\n` +
      `• "Pronađi Android poslove s plaćom iznad 150k$"\n` +
      `• "Napiši motivacijsko pismo za Spotify"\n` +
      `• "Je li moj životopis dobar za FAANG?"\n` +
      `• "Koliko bih trebao naplaćivati kao konzultant?"`,
  },
};

// Detect Croatian by diacritics or common Croatian words
const CROATIAN_PATTERN =
  /[čćšđžČĆŠĐŽ]|\b(je|u|na|za|da|se|što|koji|koja|koje|ali|ili|ako|jer|kad|kao|već|sve|samo|imam|mogu|hoću|želim|hvala|posao|posla|plaća)\b/i;

function detectLanguage(text) {
  return CROATIAN_PATTERN.test(text) ? "hr" : "en";
}

function t(lang, key, ...args) {
  const locale = messages[lang] || messages.en;
  const value = key in locale ? locale[key] : messages.en[key];
  return typeof value === "function" ? value(...args) : value;
}

module.exports = { detectLanguage, t };
