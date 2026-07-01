import { describe, test, expect } from "@jest/globals";
import { normalizeGateStatus, resolveMessageAccess } from "@/lib/messagingGate";

describe("normalizeGateStatus", () => {
  test("passes through the three real statuses", () => {
    expect(normalizeGateStatus("pending")).toBe("pending");
    expect(normalizeGateStatus("accepted")).toBe("accepted");
    expect(normalizeGateStatus("declined")).toBe("declined");
  });
  test("maps anything else to null", () => {
    for (const v of [null, undefined, "", "blocked", 1, {}]) {
      expect(normalizeGateStatus(v)).toBeNull();
    }
  });
});

describe("resolveMessageAccess — client side", () => {
  test("a client can always send and never sees the request gate", () => {
    const a = resolveMessageAccess({ isClient: true, rawStatus: "pending" });
    expect(a).toEqual({
      status: null,
      canSend: true,
      isBlocked: false,
      needsApproval: false,
      isMessagingDisabled: false,
    });
  });

  test("a blocked client has messaging disabled", () => {
    const a = resolveMessageAccess({ isClient: true, rawStatus: "accepted", blocked: true });
    expect(a.canSend).toBe(true);
    expect(a.isBlocked).toBe(true);
    expect(a.isMessagingDisabled).toBe(true);
  });
});

describe("resolveMessageAccess — artist side", () => {
  test("a pending request needs approval and cannot be replied to yet", () => {
    const a = resolveMessageAccess({ isClient: false, rawStatus: "pending" });
    expect(a.status).toBe("pending");
    expect(a.canSend).toBe(false);
    expect(a.needsApproval).toBe(true);
  });

  test("accepted + allowed lets the artist send", () => {
    const a = resolveMessageAccess({ isClient: false, rawStatus: "accepted", allowed: true });
    expect(a.canSend).toBe(true);
    expect(a.needsApproval).toBe(false);
  });

  test("accepted status alone (not yet allowed) still cannot send", () => {
    const a = resolveMessageAccess({ isClient: false, rawStatus: "accepted", allowed: false });
    expect(a.canSend).toBe(false);
  });

  test("an optimistic 'accepted' override unlocks sending before allowed lands", () => {
    const a = resolveMessageAccess({
      isClient: false,
      rawStatus: "pending",
      override: "accepted",
    });
    expect(a.status).toBe("accepted");
    expect(a.canSend).toBe(true);
  });

  test("a declined request is not sendable and not pending approval", () => {
    const a = resolveMessageAccess({ isClient: false, rawStatus: "declined" });
    expect(a.status).toBe("declined");
    expect(a.canSend).toBe(false);
    expect(a.needsApproval).toBe(false);
  });

  test("isMessagingDisabled is client-only, never set for artists", () => {
    const a = resolveMessageAccess({ isClient: false, rawStatus: "accepted", blocked: true });
    expect(a.isBlocked).toBe(true);
    expect(a.isMessagingDisabled).toBe(false);
  });
});
