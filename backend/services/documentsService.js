import crypto from "crypto";

const DOC_VERSION = "2026-06-16";

const SHARED_LEGAL = `Limitation of liability. To the maximum extent permitted by law,
Inkmity and its owners, members, employees, and agents are not liable for
indirect, incidental, special, consequential, exemplary, or punitive damages, or
for lost profits, data, or goodwill. Inkmity's total aggregate liability arising
out of or relating to the service is limited to the greater of (a) the total
platform fees you paid to Inkmity in the six (6) months before the event giving
rise to the claim, or (b) one hundred US dollars ($100). Some jurisdictions do
not allow certain limitations, so parts of this section may not apply to you.

Binding arbitration; class-action and jury waiver. Except for small-claims
matters and requests for injunctive relief, any dispute arising out of or
relating to the service or these documents will be resolved by final and binding
individual arbitration administered under the rules of a recognized arbitration
provider, seated in New York County, New York, and governed by the Federal
Arbitration Act. You and Inkmity each waive the right to a jury trial and the
right to participate in a class, collective, or representative action; disputes
must be brought in an individual capacity only.

Severability; entire agreement; no waiver. If any provision is held
unenforceable, it will be limited or severed to the minimum extent necessary and
the remaining provisions stay in full force. These documents, together with any
policies referenced in them, are the entire agreement on their subject matter and
supersede prior understandings. Inkmity's failure to enforce a provision is not a
waiver of it.

Changes; assent. Inkmity may update these documents; material changes will be
re-presented for acceptance and require a new signature before continued use of
the affected feature. Your typed name, the document version, a content hash, and
your timestamp and IP address are recorded as evidence of your agreement.

Governing law. These documents are governed by the laws of the State of New York,
without regard to conflict-of-laws rules.`;

export const DOCUMENTS = {
  platform_terms: {
    version: DOC_VERSION,
    title: "Inkmity Platform Terms of Service",
    roles: ["client", "artist", "studio"],
    body: `Inkmity ("Inkmity," "we," "us") operates an online marketplace that
connects clients with independent tattoo artists and studios. Inkmity is a
marketplace and payment facilitator only. It does not provide tattoo services, is
not the employer, partner, or agent of any artist or studio, does not supervise
or control the work, and does not warrant the artistic outcome, safety, or
quality of any session. Artists and studios are independent third parties solely
responsible for the services they provide.

Eligibility. You must be 18 or older to use the platform. Tattooing a person
under 18 is a crime in New York (Penal Law § 260.21); minors may not book,
receive, or perform tattoo services through the platform. You are responsible for
the accuracy of the information you provide.

Payments. Payments are processed by Stripe. Inkmity facilitates the transaction
and collects funds on behalf of artists and studios, then remits their share (net
of the platform fee) to their connected Stripe accounts. A deposit, where
required, holds an appointment; the balance is charged on completion once both
parties confirm. Tips are optional and are paid in full to the artist. Chargebacks
and refunds may be deducted from the responsible party's payouts, subject to
applicable law.

No professional advice; assumption of risk. The platform, including any AI
features, provides information and tools only and is not medical, legal, or
professional advice. Tattooing carries inherent risks. You assume all risks of
using the service and of any services you provide or receive through it.

Your content. You keep ownership of content you upload (portfolio images,
designs, profile details, messages, reviews) and grant Inkmity a non-exclusive,
royalty-free, worldwide license to host, display, and promote it to operate the
service. You are responsible for your content and represent that you have the
rights to it.

Acceptable use & moderation. No fraud, harassment, infringement, circumventing
payments, off-platform solicitation to evade fees, or unlawful content. Inkmity
may remove content and suspend or terminate accounts at its discretion, including
for violations or risk to users.

Disclaimers. The service is provided "as is" and "as available," without
warranties of any kind, express or implied, including merchantability, fitness
for a particular purpose, and non-infringement. Inkmity does not warrant that the
service will be uninterrupted, secure, or error-free.

Indemnification. To the maximum extent permitted by law, you agree to indemnify,
defend, and hold harmless Inkmity from any claims, damages, liabilities, and
expenses (including reasonable attorneys' fees) arising out of your use of the
service, your content, the services you provide or receive, or your violation of
these terms or any law.

${SHARED_LEGAL}`,
  },

  client_waiver: {
    version: DOC_VERSION,
    title: "Client Consent & Liability Waiver",
    roles: ["client"],
    body: `I confirm I am 18 or older and that I voluntarily and of my own free
will consent to be tattooed. I am not under the influence of alcohol or drugs,
and I am making this decision myself.

Assumption of risk. I understand a tattoo is permanent, that results vary by
individual, and that the risks include (without limitation) pain, swelling,
bleeding, infection, allergic reaction, scarring, granulomas, keloids,
dissatisfaction with the appearance, color, healing, or placement, and the
possibility that future medical procedures (such as MRI) may be affected. I
knowingly and voluntarily accept all of these risks.

Design approval; no refund for regret. I have reviewed and approved the design,
size, color, and placement. Subjective dissatisfaction, change of mind, or later
regret is not a defect and is not grounds for a refund or claim.

Health disclosure. I have truthfully disclosed relevant health conditions,
including allergies, medications, skin conditions, bleeding disorders or blood
thinners, pregnancy or nursing, and recent surgery. I understand the artist relies
on this information, and I release Inkmity and the artist from harm arising from
conditions I failed to disclose. I accept sole responsibility for following the
aftercare instructions provided.

Health information & privacy. I consent to Inkmity and my artist collecting and
storing the health and intake information I provide for the purpose of safely
performing my appointment, handled in accordance with Inkmity's Privacy Policy.

Marketplace role. I understand Inkmity is a marketplace and payment facilitator,
not a healthcare, medical, or tattoo provider, and that the artist alone performs
and is solely responsible for the work. Any photo or likeness release is optional
and governed by my intake-form selection.

Payments. Any required deposit holds my appointment; the balance is charged on
completion once both parties confirm. Tips I choose to add are optional and go
entirely to my artist.

Release. To the maximum extent permitted by law, I release, waive, and hold
harmless Inkmity and its owners, members, employees, and agents from any and all
claims, demands, and causes of action arising out of or relating to the tattoo
services I receive through the platform, except to the extent caused by Inkmity's
own gross negligence or willful misconduct.

${SHARED_LEGAL}`,
  },

  studio_agreement: {
    version: DOC_VERSION,
    title: "Studio Partner Agreement",
    roles: ["studio"],
    body: `The studio is an independent business, not an employee, agent, or
partner of Inkmity. The studio agrees to the platform commission split, that
payouts settle to the studio's connected Stripe account, and that chargebacks,
refunds, and clawbacks on its artists' bookings may be deducted from future
payouts, subject to applicable law.

Licensing & compliance. The studio represents that it and its artists hold all
licenses and permits required where they operate — including, in New York City, a
current tattoo license from the Department of Health and Mental Hygiene (DOHMH) —
and that they comply with all applicable health, safety, sanitation, and
record-keeping requirements. The studio is responsible for its artists'
compliance and conduct on the platform.

Insurance. The studio represents that it maintains, or will maintain,
commercially reasonable liability insurance appropriate to its operations.

Content license. The studio grants Inkmity a non-exclusive, royalty-free license
to display content it uploads to operate and promote the service.

Indemnification. To the maximum extent permitted by law, the studio agrees to
indemnify, defend, and hold harmless Inkmity from any claims, damages,
liabilities, and expenses (including reasonable attorneys' fees) arising out of
the work performed, its or its artists' licensing or health-and-safety
compliance, and interactions with clients.

${SHARED_LEGAL}`,
  },

  artist_agreement: {
    version: DOC_VERSION,
    title: "Artist Agreement",
    roles: ["artist"],
    body: `The artist is an independent contractor, not an employee, agent, or
partner of Inkmity, and is solely responsible for the tattoo work and its
outcome. The artist agrees to the platform/studio commission split, that payouts
settle to their connected Stripe account, and that chargebacks, refunds, and
clawbacks on their bookings may be deducted from future payouts, subject to
applicable law.

Licensing & compliance. The artist represents that they are licensed and
permitted to operate where they work — including, in New York City, a current
tattoo license from DOHMH — that they comply with all applicable health, safety,
and sanitation requirements, and that they honor any studio agreement governing
acceptance of platform deposits.

Insurance. The artist represents that they maintain, or will maintain,
commercially reasonable liability insurance appropriate to their work.

Standard of care. The artist will perform services in a professional, sanitary
manner consistent with industry standards and will obtain appropriate client
consent and intake before tattooing.

Content license. The artist keeps ownership of portfolio images and designs they
upload and grants Inkmity a non-exclusive, royalty-free license to display them to
operate and promote the service.

Indemnification. To the maximum extent permitted by law, the artist agrees to
indemnify, defend, and hold harmless Inkmity from any claims, damages,
liabilities, and expenses (including reasonable attorneys' fees) arising out of
the work they perform, their licensing or health-and-safety compliance, and their
interactions with clients.

${SHARED_LEGAL}`,
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
