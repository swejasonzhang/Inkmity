import { describe, test, expect, jest } from "@jest/globals";
import { sendError } from "../../lib/httpError.js";

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe("sendError", () => {
  test("preserves the message for explicit 4xx client errors", () => {
    const res = mockRes();
    sendError(res, { status: 400, message: "bad_input" });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "bad_input" });
  });

  test("hides the message for unexpected 500s", () => {
    const res = mockRes();
    sendError(res, new Error("Mongo: connection string e=secret"));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal error" });
  });

  test("uses the provided fallback on a 500", () => {
    const res = mockRes();
    sendError(res, new Error("x"), "Failed to join waitlist");
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to join waitlist" });
  });

  test("preserves customer-safe Stripe error messages", () => {
    const res = mockRes();
    sendError(res, { type: "StripeCardError", message: "Your card was declined" });
    expect(res.json).toHaveBeenCalledWith({ error: "Your card was declined" });
  });

  test("includes publicMessage when present", () => {
    const res = mockRes();
    sendError(res, { status: 402, message: "card_error", publicMessage: "Please use another card" });
    expect(res.json).toHaveBeenCalledWith({ error: "card_error", message: "Please use another card" });
  });
});
