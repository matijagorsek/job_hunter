// Set env vars before any module is required
process.env.TELEGRAM_BOT_TOKEN = "test-token-integration";
process.env.ALLOWED_CHAT_IDS = "100";
process.env.ANTHROPIC_API_KEY = "test-key-integration";
process.env.WEBHOOK_DOMAIN = "test.example.com";
process.env.WEBHOOK_SECRET = "test-webhook-secret";

jest.mock("../../src/bot", () => ({
  handleUpdate: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../src/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const request = require("supertest");
const { app } = require("../../src/server");

describe("GET /", () => {
  test("returns 200 with health status", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.bot).toBe("JobRadar AI");
    expect(typeof res.body.uptime).toBe("number");
  });
});

describe("POST /webhook - authentication", () => {
  test("returns 401 when secret token header is absent", async () => {
    const res = await request(app).post("/webhook").send({ update_id: 1 });
    expect(res.status).toBe(401);
  });

  test("returns 401 when secret token is incorrect", async () => {
    const res = await request(app)
      .post("/webhook")
      .set("x-telegram-bot-api-secret-token", "wrong-secret")
      .send({ update_id: 1 });
    expect(res.status).toBe(401);
  });

  test("returns 200 and calls handleUpdate when secret is correct", async () => {
    const { handleUpdate } = require("../../src/bot");

    const update = { update_id: 42, message: { text: "hello", chat: { id: 100 } } };
    const res = await request(app)
      .post("/webhook")
      .set("x-telegram-bot-api-secret-token", "test-webhook-secret")
      .send(update);

    expect(res.status).toBe(200);
    // handleUpdate is called asynchronously after response; wait briefly
    await new Promise((resolve) => setImmediate(resolve));
    expect(handleUpdate).toHaveBeenCalledWith(update);
  });

  test("returns 200 even when handleUpdate throws", async () => {
    const { handleUpdate } = require("../../src/bot");
    handleUpdate.mockRejectedValueOnce(new Error("simulated failure"));

    const res = await request(app)
      .post("/webhook")
      .set("x-telegram-bot-api-secret-token", "test-webhook-secret")
      .send({ update_id: 99 });

    expect(res.status).toBe(200);
  });
});

describe("POST /webhook - replay protection", () => {
  const validToken = process.env.WEBHOOK_SECRET;

  test("drops duplicate update_id without calling handleUpdate again", async () => {
    const { handleUpdate } = require("../../src/bot");
    handleUpdate.mockClear();

    const update = { update_id: 1001, message: { text: "hi", chat: { id: 100 }, date: Math.floor(Date.now() / 1000) } };

    await request(app)
      .post("/webhook")
      .set("x-telegram-bot-api-secret-token", validToken)
      .send(update);

    await new Promise((resolve) => setImmediate(resolve));
    expect(handleUpdate).toHaveBeenCalledTimes(1);

    handleUpdate.mockClear();

    const res = await request(app)
      .post("/webhook")
      .set("x-telegram-bot-api-secret-token", validToken)
      .send(update);

    await new Promise((resolve) => setImmediate(resolve));
    expect(res.status).toBe(200);
    expect(handleUpdate).not.toHaveBeenCalled();
  });
});

describe("POST /webhook - timestamp validation", () => {
  const validToken = process.env.WEBHOOK_SECRET;

  test("drops update with stale timestamp and returns 200 without calling handleUpdate", async () => {
    const { handleUpdate } = require("../../src/bot");
    handleUpdate.mockClear();

    const staleDate = Math.floor(Date.now() / 1000) - 400; // 400 sec ago
    const update = { update_id: 2001, message: { text: "old", chat: { id: 100 }, date: staleDate } };

    const res = await request(app)
      .post("/webhook")
      .set("x-telegram-bot-api-secret-token", validToken)
      .send(update);

    await new Promise((resolve) => setImmediate(resolve));
    expect(res.status).toBe(200);
    expect(handleUpdate).not.toHaveBeenCalled();
  });

  test("processes update with fresh timestamp", async () => {
    const { handleUpdate } = require("../../src/bot");
    handleUpdate.mockClear();

    const freshDate = Math.floor(Date.now() / 1000) - 10;
    const update = { update_id: 2002, message: { text: "fresh", chat: { id: 100 }, date: freshDate } };

    const res = await request(app)
      .post("/webhook")
      .set("x-telegram-bot-api-secret-token", validToken)
      .send(update);

    await new Promise((resolve) => setImmediate(resolve));
    expect(res.status).toBe(200);
    expect(handleUpdate).toHaveBeenCalledWith(update);
  });
});
