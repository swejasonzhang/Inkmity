import { describe, test, expect } from "@jest/globals";
import { buildRequestMessage } from "@/lib/bookingMessage";

describe("buildRequestMessage", () => {
  test("always opens with a greeting, states the budget, and closes with a prompt", () => {
    const msg = buildRequestMessage({ budgetMin: 100, budgetMax: 300 });
    expect(msg.startsWith("Hi! I'm interested in getting a tattoo.")).toBe(true);
    expect(msg).toContain("My budget is around $100–$300.");
    expect(msg.endsWith("Let me know if you're available and interested!")).toBe(true);
  });

  test("mentions references only when the client attached some", () => {
    expect(buildRequestMessage({ budgetMin: 100, budgetMax: 300, hasReferences: true })).toContain(
      "I've attached a few references"
    );
    expect(buildRequestMessage({ budgetMin: 100, budgetMax: 300, hasReferences: false })).not.toContain(
      "references"
    );
  });

  test("includes piece type with the correct article (a/an)", () => {
    expect(buildRequestMessage({ budgetMin: 1, budgetMax: 2, pieceType: "Portrait" })).toContain(
      "I'm interested in a portrait."
    );
    expect(buildRequestMessage({ budgetMin: 1, budgetMax: 2, pieceType: "Abstract" })).toContain(
      "I'm interested in an abstract."
    );
  });

  test("omits piece type / placement when they are 'none' or missing", () => {
    const msg = buildRequestMessage({ budgetMin: 1, budgetMax: 2, pieceType: "none", placement: "none" });
    expect(msg).not.toContain("I'm interested in a"); // the piece-type sentence (not the greeting)
    expect(msg).not.toContain("I'd like it on my");
  });

  test("includes placement lower-cased", () => {
    expect(buildRequestMessage({ budgetMin: 1, budgetMax: 2, placement: "Forearm" })).toContain(
      "I'd like it on my forearm."
    );
  });

  test("maps a known size to its phrase and ignores unknown sizes", () => {
    expect(buildRequestMessage({ budgetMin: 1, budgetMax: 2, size: "medium" })).toContain(
      "I'm thinking a medium-sized piece."
    );
    expect(buildRequestMessage({ budgetMin: 1, budgetMax: 2, size: "gigantic" })).not.toContain(
      "I'm thinking"
    );
  });
});
