// Set env vars before any module is required
process.env.TELEGRAM_BOT_TOKEN = "test-token-unit";
process.env.ALLOWED_CHAT_IDS = "100,200";
process.env.ANTHROPIC_API_KEY = "test-key-unit";
process.env.WEBHOOK_DOMAIN = "test.example.com";

jest.mock("../../src/claude", () => ({
  chat: jest.fn().mockResolvedValue("AI response"),
  profile: {
    name: "Test User",
    title: "Senior Developer",
    location: "Zagreb",
    yearsExperience: 10,
    skills: { primary: ["Kotlin"], ai: ["MCP"], frameworks: ["Compose"] },
    preferredRoles: ["Senior Android Developer"],
    preferences: {
      salaryRange: { min: 100000, max: 200000 },
      timezone: "CET",
      contractType: ["full-time"],
    },
    currentRole: { title: "Android Dev", company: "Kickbase" },
    aiProjects: [{ details: ["Built Jarvis"] }],
    experience: [],
  },
  saveProfile: jest.fn(),
}));
jest.mock("../../src/agents/jobSearch", () => ({
  searchJobs: jest.fn().mockResolvedValue("Jobs result"),
}));
jest.mock("../../src/agents/cvAdvisor", () => ({
  adviseCv: jest.fn().mockResolvedValue("CV advice"),
}));
jest.mock("../../src/agents/coverLetter", () => ({
  generateCoverLetter: jest.fn().mockResolvedValue("Cover letter"),
}));
jest.mock("../../src/agents/salary", () => ({
  salaryIntel: jest.fn().mockResolvedValue("Salary info"),
}));
jest.mock("../../src/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));
jest.mock("pdf-parse", () => jest.fn().mockResolvedValue({ text: "" }));
jest.mock("mammoth", () => ({
  extractRawText: jest.fn().mockResolvedValue({ value: "" }),
}));

const { splitMessage, parseFilters, handleUpdate } = require("../../src/bot");

describe("splitMessage", () => {
  test("returns single-element array for short text", () => {
    expect(splitMessage("Hello", 4000)).toEqual(["Hello"]);
  });

  test("returns single-element array when text equals max length", () => {
    const text = "a".repeat(4000);
    expect(splitMessage(text, 4000)).toEqual([text]);
  });

  test("splits at newline when possible", () => {
    const line1 = "a".repeat(3000);
    const line2 = "b".repeat(3000);
    const chunks = splitMessage(`${line1}\n${line2}`, 4000);
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toBe(line1);
    expect(chunks[1]).toBe(line2);
  });

  test("hard-splits when no good break point exists", () => {
    const text = "x".repeat(5000);
    const chunks = splitMessage(text, 4000);
    expect(chunks.length).toBe(2);
    expect(chunks[0].length).toBe(4000);
    expect(chunks[1].length).toBe(1000);
  });

  test("produces chunks all within max length", () => {
    const text = "word ".repeat(1500); // ~7500 chars
    const chunks = splitMessage(text, 4000);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(4000);
    }
  });

  test("reassembled chunks contain all original content", () => {
    const text = "Hello World\nFoo Bar\nBaz Qux";
    const chunks = splitMessage(text, 10);
    const rejoined = chunks.join(" ").replace(/\s+/g, " ").trim();
    expect(rejoined).toContain("Hello");
    expect(rejoined).toContain("World");
  });
});

describe("parseFilters", () => {
  test("returns empty filters and original query for plain text", () => {
    const result = parseFilters("senior android developer");
    expect(result.query).toBe("senior android developer");
    expect(result.filters).toEqual({});
  });

  test("extracts --location filter", () => {
    const result = parseFilters("android --location europe");
    expect(result.filters.location).toBe("europe");
    expect(result.query.trim()).toBe("android");
  });

  test("extracts --type filter", () => {
    const result = parseFilters("kotlin --type fulltime");
    expect(result.filters.type).toBe("fulltime");
    expect(result.query.trim()).toBe("kotlin");
  });

  test("extracts --industry filter", () => {
    const result = parseFilters("developer --industry fintech");
    expect(result.filters.industry).toBe("fintech");
    expect(result.query.trim()).toBe("developer");
  });

  test("extracts multiple filters from one string", () => {
    const result = parseFilters("android --location europe --type fulltime --industry fintech");
    expect(result.filters.location).toBe("europe");
    expect(result.filters.type).toBe("fulltime");
    expect(result.filters.industry).toBe("fintech");
    expect(result.query.trim()).toBe("android");
  });

  test("handles empty string", () => {
    const result = parseFilters("");
    expect(result.query).toBe("");
    expect(result.filters).toEqual({});
  });

  test("handles filter-only input with no query", () => {
    const result = parseFilters("--location usa");
    expect(result.filters.location).toBe("usa");
    expect(result.query.trim()).toBe("");
  });
});

describe("handleUpdate - authorization", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("ignores updates with no message field", async () => {
    await handleUpdate({ edited_message: { text: "edit" } });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("rejects messages from unauthorised chat IDs", async () => {
    const update = {
      message: {
        chat: { id: 999 },
        from: { id: 999 },
        text: "hello",
      },
    };

    await handleUpdate(update);

    const sendCall = global.fetch.mock.calls.find((args) =>
      args[0].includes("/sendMessage"),
    );
    expect(sendCall).toBeDefined();
    expect(sendCall[1].body).toContain("Unauthorised");
  });

  test("sends typing indicator for messages from allowed chat IDs", async () => {
    const update = {
      message: {
        chat: { id: 100 },
        from: { id: 101 }, // unique userId to avoid rate limit state from other tests
        text: "/help",
      },
    };

    await handleUpdate(update);

    const typingCall = global.fetch.mock.calls.find((args) =>
      args[0].includes("/sendChatAction"),
    );
    expect(typingCall).toBeDefined();
    expect(typingCall[1].body).toContain("typing");
  });

  test("sends help message for /start command", async () => {
    const update = {
      message: {
        chat: { id: 200 },
        from: { id: 201 }, // unique userId
        text: "/start",
      },
    };

    await handleUpdate(update);

    const sendCall = global.fetch.mock.calls.find((args) =>
      args[0].includes("/sendMessage"),
    );
    expect(sendCall).toBeDefined();
    expect(sendCall[1].body).toContain("JobRadar AI");
  });

  test("sends rate limit message when user exceeds request limit", async () => {
    const userId = 555; // unique userId for rate limit test
    const chatId = 100;
    const makeUpdate = () => ({
      message: { chat: { id: chatId }, from: { id: userId }, text: "hi" },
    });

    // Exhaust the rate limit (5 requests per window)
    for (let i = 0; i < 5; i++) {
      await handleUpdate(makeUpdate());
      jest.clearAllMocks();
    }

    // 6th request should be rate limited
    await handleUpdate(makeUpdate());

    const sendCall = global.fetch.mock.calls.find((args) =>
      args[0].includes("/sendMessage"),
    );
    expect(sendCall).toBeDefined();
    expect(sendCall[1].body).toContain("too many requests");
  });
});
