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
