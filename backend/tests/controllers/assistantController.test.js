import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";

const mockStream = {
  _textCb: null,
  on: jest.fn((evt, cb) => {
    if (evt === "text") mockStream._textCb = cb;
    return mockStream;
  }),
  finalMessage: jest.fn(),
  abort: jest.fn(),
};
const mockMessagesStream = jest.fn(() => mockStream);
class MockAnthropic {
  constructor() {
    this.messages = { stream: mockMessagesStream };
  }
}
const mockConfig = { anthropic: { apiKey: "sk-ant-test" } };

jest.unstable_mockModule("@anthropic-ai/sdk", () => ({ default: MockAnthropic }));
jest.unstable_mockModule("../../config/index.js", () => ({ config: mockConfig }));

const { chatAssistant } = await import("../../controllers/assistantController.js");

const app = express();
app.use(express.json());
app.post("/assistant", chatAssistant);

const userMsg = [{ role: "user", content: "Help me design a sleeve" }];

beforeEach(() => {
  jest.clearAllMocks();
  mockConfig.anthropic.apiKey = "sk-ant-test";
  mockStream._textCb = null;
  mockStream.on.mockImplementation((evt, cb) => {
    if (evt === "text") mockStream._textCb = cb;
    return mockStream;
  });
  mockStream.finalMessage.mockImplementation(async () => {
    mockStream._textCb?.("Here is a brief.");
    return {};
  });
  mockMessagesStream.mockReturnValue(mockStream);
});

describe("chatAssistant", () => {
  test("503 when the assistant isn't configured", async () => {
    mockConfig.anthropic.apiKey = null;
    const res = await request(app).post("/assistant").send({ messages: userMsg });
    expect(res.status).toBe(503);
    expect(res.body.error).toBe("assistant_unavailable");
  });

  test("400 when there is no trailing user message", async () => {
    const res = await request(app).post("/assistant").send({ messages: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_messages");
  });

  test("drops a leading assistant message and trims to a valid history", async () => {
    const res = await request(app)
      .post("/assistant")
      .send({ messages: [{ role: "assistant", content: "hi" }, { role: "user", content: "go" }] });
    expect(res.status).toBe(200);
    expect(mockMessagesStream).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [{ role: "user", content: "go" }] })
    );
  });

  test("streams the model's text back to the client", async () => {
    const res = await request(app).post("/assistant").send({ messages: userMsg });
    expect(res.status).toBe(200);
    expect(res.text).toContain("Here is a brief.");
    expect(mockMessagesStream).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-opus-4-8", system: expect.any(String) })
    );
  });

  test("500 when the stream fails before headers are sent", async () => {
    mockMessagesStream.mockImplementation(() => {
      throw new Error("anthropic_down");
    });
    const res = await request(app).post("/assistant").send({ messages: userMsg });
    expect(res.status).toBe(500);
    expect(res.text).toContain("assistant_failed");
  });
});
