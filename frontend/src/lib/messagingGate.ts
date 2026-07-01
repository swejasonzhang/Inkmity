export type GateStatus = "pending" | "accepted" | "declined";

export type MessageAccess = {
  status: GateStatus | null;
  canSend: boolean;
  isBlocked: boolean;
  needsApproval: boolean;
  isMessagingDisabled: boolean;
};

export function normalizeGateStatus(v: unknown): GateStatus | null {
  return v === "pending" || v === "accepted" || v === "declined" ? v : null;
}

export function resolveMessageAccess(params: {
  isClient: boolean;
  rawStatus: unknown;
  override?: unknown;
  allowed?: boolean;
  blocked?: boolean;
}): MessageAccess {
  const { isClient, rawStatus, override, allowed, blocked } = params;

  const computed = normalizeGateStatus(override ?? rawStatus);
  const status = isClient ? null : computed;
  const canSend = isClient
    ? true
    : status === "accepted" && (override === "accepted" || !!allowed);
  const isBlocked = !!blocked;
  const needsApproval = isClient ? false : status === "pending" && !canSend;
  const isMessagingDisabled = isClient && isBlocked;

  return { status, canSend, isBlocked, needsApproval, isMessagingDisabled };
}
