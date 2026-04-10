const { detectLanguage, t } = require("../../src/i18n");

describe("detectLanguage", () => {
  test("returns 'hr' for text with Croatian diacritics", () => {
    expect(detectLanguage("hvala što si tu")).toBe("hr");
  });

  test("returns 'hr' for common Croatian word 'posao'", () => {
    expect(detectLanguage("imam posao za tebe")).toBe("hr");
  });

  test("returns 'hr' for text with č diacritic", () => {
    expect(detectLanguage("dobar dan, lijepo jutro")).toBe("en"); // no diacritics
    expect(detectLanguage("čestitam")).toBe("hr");
  });

  test("returns 'en' for plain English text", () => {
    expect(detectLanguage("Hello, how can I help you today?")).toBe("en");
  });

  test("returns 'en' for empty string", () => {
    expect(detectLanguage("")).toBe("en");
  });

  test("returns 'en' for technical English", () => {
    expect(detectLanguage("Find me senior Android developer jobs")).toBe("en");
  });
});

describe("t", () => {
  test("returns English string for 'en' locale", () => {
    expect(t("en", "unauthorized")).toBe("Unauthorised");
  });

  test("returns Croatian string for 'hr' locale", () => {
    expect(t("hr", "unauthorized")).toBe("Neovlašteni pristup");
  });

  test("calls function messages with args for processingCv", () => {
    expect(t("en", "processingCv", "PDF")).toBe("📄 Processing your CV (PDF)...");
    expect(t("hr", "processingCv", "DOCX")).toBe("📄 Obrađujem tvoj životopis (DOCX)...");
  });

  test("calls function messages with args for profileUpdated", () => {
    expect(t("en", "profileUpdated", "skills")).toBe("✅ Profile updated: *skills*");
    expect(t("hr", "profileUpdated", "skills")).toBe("✅ Profil ažuriran: *skills*");
  });

  test("calls function messages with args for unknownField", () => {
    expect(t("en", "unknownField", "foo")).toContain("foo");
  });

  test("falls back to English for unknown locale", () => {
    expect(t("de", "unauthorized")).toBe("Unauthorised");
    expect(t("fr", "rateLimit")).toBe(t("en", "rateLimit"));
  });

  test("returns static string messages correctly", () => {
    expect(t("en", "scanningJobs")).toBe("🔍 Scanning job boards...");
    expect(t("hr", "scanningJobs")).toBe("🔍 Pretražujem oglase za posao...");
  });

  test("helpText function returns string containing name", () => {
    const result = t("en", "helpText", "Alice");
    expect(result).toContain("Alice");
    expect(result).toContain("/search");
  });
});
