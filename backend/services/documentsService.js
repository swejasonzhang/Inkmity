import crypto from "crypto";

// NOTE: These are PLACEHOLDER templates and MUST be replaced with
// attorney-drafted, jurisdiction-aware text before production use. Tattoo
// consent/liability law is state-specific. Bumping `version` invalidates prior
// signatures (signers must re-sign), so version every material text change.

export const DOCUMENTS = {
  platform_terms: {
    version: "2026-06-07",
    title: "Inkmity Platform Terms of Service",
    roles: ["client", "artist", "studio"],
    body: `[LEGAL REVIEW REQUIRED] Inkmity is a marketplace and payment
facilitator, not the provider of tattoo services. Inkmity does not warrant the
artistic outcome of any session. Payments are processed via Stripe; the platform
acts as merchant of record and remits funds to artists and studios per the
agreed split. By accepting, you agree to the platform terms, acceptable use, and
dispute process.`,
  },

  client_waiver: {
    version: "2026-06-07",
    title: "Client Consent & Liability Waiver",
    roles: ["client"],
    body: `[LEGAL REVIEW REQUIRED] I confirm I am of legal age and consent to be
tattooed. I understand a tattoo is permanent and results vary. I have reviewed
and approved the design, size, and placement. Subjective dissatisfaction or
later regret is not grounds for a refund. I disclose relevant health conditions
and accept responsibility for aftercare. The non-refundable deposit holds my
appointment; the balance is charged on completion once both parties confirm.`,
  },

  studio_agreement: {
    version: "2026-06-07",
    title: "Studio Partner Agreement",
    roles: ["studio"],
    body: `[LEGAL REVIEW REQUIRED] The studio agrees to the platform commission
split, that payouts settle to the studio's connected Stripe account, and that
chargebacks on its artists' bookings may be deducted from future payouts
(clawback). The studio is responsible for its artists' compliance, licensing,
and health/safety obligations.`,
  },

  artist_agreement: {
    version: "2026-06-07",
    title: "Artist Agreement",
    roles: ["artist"],
    body: `[LEGAL REVIEW REQUIRED] The artist is solely responsible for the
tattoo work and its outcome. The artist agrees to the platform/studio commission
split, that payouts settle to their connected Stripe account, and that
chargebacks on their bookings may be deducted from future payouts (clawback).
The artist confirms they are licensed/permitted to operate where they work,
including any studio agreement that governs accepting platform deposits.`,
  },
};

export function getDocument(docType) {
  const doc = DOCUMENTS[docType];
  if (!doc) return null;
  return {
    docType,
    version: doc.version,
    title: doc.title,
    body: doc.body,
    roles: doc.roles,
    contentHash: hashDocument(doc.version, doc.body),
  };
}

export function hashDocument(version, body) {
  return crypto
    .createHash("sha256")
    .update(`${version}\n${body}`)
    .digest("hex");
}

export function listDocTypes() {
  return Object.keys(DOCUMENTS);
}
