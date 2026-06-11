import crypto from "crypto";

// NOTE: These are self-drafted, NY-aligned documents intended to cover the most
// common risks for a tattoo marketplace. They are a strong starting point but
// should still be reviewed by a New York attorney before/soon after launch,
// especially the payout/clawback terms (Freelance Isn't Free Act) and the
// merchant-of-record / Stripe Connect flow. Bump `version` on any material edit.
export const DOCUMENTS = {
  platform_terms: {
    version: "2026-06-10",
    title: "Inkmity Platform Terms of Service",
    roles: ["client", "artist", "studio"],
    body: `Inkmity LLC ("Inkmity") operates an online marketplace that connects
clients with independent tattoo artists and studios. Inkmity is a marketplace
and payment facilitator only. It does not provide tattoo services, is not the
employer of any artist or studio, and does not warrant the artistic outcome of
any session.

Eligibility. You must be 18 or older. Tattooing a person under 18 is a crime in
New York (Penal Law § 260.21); minors may not book, receive, or perform tattoo
services through the platform.

Payments. Payments are processed by Stripe. Inkmity facilitates the transaction
and collects funds on behalf of artists and studios, then remits their share
(net of the platform fee) to their connected Stripe accounts. A non-refundable
deposit holds an appointment; the balance is charged on completion once both
parties confirm. Chargebacks may be deducted from the responsible party's
payouts.

Your content. You keep ownership of content you upload (portfolio images,
designs, profile details, messages, reviews) and grant Inkmity a non-exclusive,
royalty-free license to host and display it to operate and promote the service.
You are responsible for your content and must have the rights to it.

Acceptable use & moderation. No fraud, harassment, infringement, circumventing
payments, or unlawful content. Inkmity may remove content and suspend or
terminate accounts at its discretion, including for violations or risk to users.

Indemnification. To the maximum extent permitted by law, you agree to indemnify
and hold Inkmity harmless from claims arising out of your use of the service,
your content, the services you provide or receive, or your violation of these
terms or any law.

Disclaimers, disputes & law. The service is provided "as is." Disputes are first
handled through Inkmity's review process; these terms are governed by New York
law, with venue in New York County, New York. By accepting, you agree to the
platform terms, acceptable use, and dispute process.`,
  },

  client_waiver: {
    version: "2026-06-10",
    title: "Client Consent & Liability Waiver",
    roles: ["client"],
    body: `I confirm I am 18 or older and voluntarily consent to be tattooed. I
understand a tattoo is permanent, that results vary, and that risks include pain,
infection, allergic reaction, and scarring. I have reviewed and approved the
design, size, and placement, and subjective dissatisfaction or later regret is
not grounds for a refund.

I have disclosed relevant health conditions (including allergies, medications,
skin conditions, bleeding disorders, pregnancy, and recent surgery) truthfully,
and I accept responsibility for following aftercare instructions. I understand
Inkmity is a marketplace, not a healthcare or tattoo provider, and that the
artist alone performs and is responsible for the work.

The non-refundable deposit holds my appointment; the balance is charged on
completion once both parties confirm. To the maximum extent permitted by law, I
release and hold harmless Inkmity from claims arising out of the tattoo services
I receive.`,
  },

  studio_agreement: {
    version: "2026-06-10",
    title: "Studio Partner Agreement",
    roles: ["studio"],
    body: `The studio is an independent business, not an employee, agent, or
partner of Inkmity. The studio agrees to the platform commission split, that
payouts settle to the studio's connected Stripe account, and that chargebacks on
its artists' bookings may be deducted from future payouts (clawback), subject to
applicable law.

The studio represents that it and its artists hold all licenses and permits
required where they operate — including, in New York City, a current tattoo
license from the Department of Health and Mental Hygiene (DOHMH) — and that they
comply with all applicable health, safety, and sanitation requirements. The
studio is responsible for its artists' compliance.

The studio grants Inkmity a license to display content it uploads to operate and
promote the service, and agrees to indemnify and hold Inkmity harmless from
claims arising out of the work performed, licensing or health-and-safety
compliance, and interactions with clients. This agreement is governed by New
York law.`,
  },

  artist_agreement: {
    version: "2026-06-10",
    title: "Artist Agreement",
    roles: ["artist"],
    body: `The artist is an independent contractor, not an employee or agent of
Inkmity, and is solely responsible for the tattoo work and its outcome. The
artist agrees to the platform/studio commission split, that payouts settle to
their connected Stripe account, and that chargebacks on their bookings may be
deducted from future payouts (clawback), subject to applicable law.

The artist represents that they are licensed and permitted to operate where they
work — including, in New York City, a current tattoo license from the Department
of Health and Mental Hygiene (DOHMH) — that they comply with all applicable
health, safety, and sanitation requirements, and that they honor any studio
agreement governing acceptance of platform deposits.

The artist keeps ownership of portfolio images and designs they upload and grants
Inkmity a non-exclusive, royalty-free license to display them to operate and
promote the service. The artist agrees to indemnify and hold Inkmity harmless
from claims arising out of the work they perform, their licensing or
health-and-safety compliance, and their interactions with clients. This
agreement is governed by New York law.`,
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
