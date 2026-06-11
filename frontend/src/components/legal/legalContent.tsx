// Single source of truth for the legal docs — rendered as full pages and in the
// in-app modal, so the wording can't drift between them.
export const LEGAL_UPDATED = "June 11, 2026";

export const LEGAL_SURFACE = "bg-card";

export const LEGAL_PROSE =
  "space-y-3 text-sm leading-relaxed text-app/90 [&_h2]:mt-6 [&_h2]:mb-1 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-app [&_strong]:text-app [&_a]:text-app [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1";

export function TermsContent() {
  return (
    <>
      <p>
        These Terms govern your use of Inkmity, operated by <strong>Inkmity LLC</strong>, a New York
        limited liability company (&ldquo;Inkmity,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;). By
        creating an account or using the service, you agree to them. Our registered contact for legal
        notices is <a href="mailto:legal@inkmity.com">legal@inkmity.com</a>.
      </p>

      <h2>Eligibility</h2>
      <p>
        You must be 18 or older to use Inkmity. This is a legal requirement, not only a policy: under
        New York Penal Law &sect; 260.21 it is a crime to tattoo anyone under 18, and there is no
        parental-consent exception. We do not knowingly permit minors to book, receive, or perform
        tattoo services through the platform.
      </p>

      <h2>Your account</h2>
      <p>
        You agree to provide accurate, current information and to keep it up to date. You are
        responsible for safeguarding your login credentials and for all activity that occurs under
        your account, and you must notify us promptly at{" "}
        <a href="mailto:support@inkmity.com">support@inkmity.com</a> of any unauthorized use. You may
        not share, sell, or transfer your account, create more than one account to evade
        restrictions, or impersonate another person or business. We may refuse, suspend, or reclaim
        any account or username at our discretion.
      </p>

      <h2>Our role (marketplace)</h2>
      <p>
        Inkmity is a marketplace and payment facilitator that connects clients with independent
        tattoo artists and studios. <strong>We do not provide tattoo services and do not warrant the
        artistic outcome of any session.</strong> Artists and studios are independent businesses, not
        our employees or agents, and are solely responsible for the work they perform and their
        compliance with applicable laws and licensing. Artists and studios operating in New York City
        represent that they hold a current tattoo license issued by the NYC Department of Health and
        Mental Hygiene (DOHMH), and elsewhere that they hold any license or permit their jurisdiction
        requires.
      </p>

      <h2>Payments, deposits &amp; payouts</h2>
      <ul>
        <li>Payments are processed by Stripe. Inkmity facilitates the transaction and collects funds on behalf of artists and studios, then remits their share (net of the platform fee) to their connected Stripe accounts.</li>
        <li>A non-refundable deposit holds your appointment; the remaining balance is charged on completion once both parties confirm.</li>
        <li>Payouts are transferred to artists and studios (split by commission for studio bookings), less the platform fee.</li>
        <li>Chargebacks may be deducted from the responsible artist's/studio's payouts.</li>
        <li>You are responsible for any taxes on amounts you earn or pay through the platform; artists and studios are responsible for reporting and remitting their own taxes.</li>
      </ul>

      <h2 id="refunds">Cancellations &amp; refunds</h2>
      <p>
        <strong>Refund policy (disclosed before purchase):</strong> Deposits are non-refundable once
        an appointment is held, except where required by law. Cancellation, reschedule, and refund
        eligibility follow each artist's policy and the cutoffs shown to you at booking before you
        pay. Subjective dissatisfaction with completed work is generally not refundable; genuine
        disputes are handled through the dispute process described below. This refund policy is
        presented at the point of sale in accordance with applicable New York consumer-protection
        law (including N.Y. General Business Law &sect; 218-a).
      </p>

      <h2>Disputes &amp; resolution</h2>
      <p>
        If you have a problem with a booking, payment, or another user, contact us first at{" "}
        <a href="mailto:support@inkmity.com">support@inkmity.com</a> so we can attempt to resolve it.
        For payment disputes, Inkmity reviews the booking record, intake form, signed documents, and
        messages and makes a good-faith determination; deposits and balances may be refunded,
        partially refunded, or released to the artist/studio based on that review. This process does
        not limit any rights you have under applicable law.
      </p>

      <h2>Consent &amp; waivers</h2>
      <p>
        Tattoo sessions require a signed consent/liability waiver. Tattoos are permanent; you confirm
        you have reviewed and approved the design, placement, and size.
      </p>

      <h2>Assumption of risk</h2>
      <p>
        You understand that tattooing is an invasive procedure that carries inherent risks &mdash;
        including pain, swelling, bleeding, infection, allergic or adverse reactions to inks or
        products, scarring, bloodborne-pathogen exposure, imperfect or unexpected results, color or
        design variation, fading over time, and permanent alteration of your skin. You voluntarily
        assume these risks. You are responsible for disclosing relevant health information to your
        artist, for following aftercare instructions, and for seeking medical care if needed. Inkmity
        does not control and is not responsible for an artist's or studio's sterilization, technique,
        materials, premises, or health-and-safety practices.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Do not misuse the platform: no fraud, harassment, infringement, circumventing payments, or
        unlawful activity. You are solely responsible for the content you submit, and you may not post
        content that is illegal, infringing, defamatory, hateful, sexually exploitative, or that
        depicts a tattoo on a minor. We may suspend accounts that violate these Terms.
      </p>

      <h2>Your content &amp; license to us</h2>
      <p>
        You retain ownership of the content you upload &mdash; including portfolio photos, flash and
        custom designs, reference images, profile details, messages, and reviews
        (&ldquo;User Content&rdquo;). You represent that you own or have the rights to your User
        Content and that it does not infringe anyone else's rights. By submitting User Content, you
        grant Inkmity a non-exclusive, worldwide, royalty-free license to host, store, display,
        reproduce, and distribute it solely to operate, promote, and improve the service. This
        license ends when you delete the content or close your account, except for copies retained
        for legal, backup, or dispute-resolution purposes and content others have already shared.
      </p>

      <h2>Content moderation &amp; removal</h2>
      <p>
        We may, but are not obligated to, review User Content. We may remove or restrict any content,
        listing, review, or account, and may suspend or terminate access, at our discretion &mdash;
        including for violations of these Terms, suspected unlawful activity, or risk to the platform
        or its users. Where practical we will give notice, but we may act immediately when needed to
        protect users or comply with law.
      </p>

      <h2>Copyright &amp; DMCA</h2>
      <p>
        We respect intellectual property rights. If you believe content on Inkmity infringes your
        copyright, send a notice to our designated agent at{" "}
        <a href="mailto:legal@inkmity.com">legal@inkmity.com</a> including: identification of the
        copyrighted work, the infringing material and its location, your contact information, a
        statement of good-faith belief that the use is unauthorized, a statement under penalty of
        perjury that your notice is accurate and that you are the owner or authorized to act, and your
        physical or electronic signature. We will respond to valid notices, may remove the material,
        and will terminate repeat infringers. Affected users may submit a counter-notice.
      </p>

      <h2>Third-party services</h2>
      <p>
        The service relies on third-party providers &mdash; including Stripe (payments), Clerk
        (authentication), Cloudinary (image hosting), and mapping providers. Your use of those
        features is also subject to the providers' own terms and privacy policies, and Inkmity is not
        responsible for their acts, omissions, availability, or content. Links to third-party sites
        are provided for convenience and are not endorsements.
      </p>

      <h2>Indemnification</h2>
      <p>
        To the maximum extent permitted by law, you agree to defend, indemnify, and hold harmless
        Inkmity and its officers, members, and employees from any claims, damages, liabilities, and
        expenses (including reasonable attorneys' fees) arising out of or related to: your use of the
        service; your User Content; the tattoo, consultation, or other services you provide or
        receive; your violation of these Terms or of any law; or your infringement of any third
        party's rights. Artists and studios specifically agree to indemnify Inkmity for any claim
        arising from the work they perform, their licensing or health-and-safety compliance, and
        their interactions with clients.
      </p>

      <h2>Electronic agreements &amp; signatures</h2>
      <p>
        You consent to receive agreements, disclosures, and notices electronically, and you agree
        that typing your name to sign a document in the platform creates a legally binding electronic
        signature under the federal E-SIGN Act and the New York Electronic Signatures and Records Act
        (ESRA). We record the signed version, a timestamp, and your IP address as proof of agreement.
      </p>

      <h2>Disclaimers &amp; liability</h2>
      <p>
        The service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
        warranties of any kind. To the maximum extent permitted by law, Inkmity is not liable for the
        acts, omissions, or work of artists/studios, or for indirect, incidental, special, punitive,
        or consequential damages, or for lost profits, data, or goodwill. To the extent Inkmity is
        found liable, our total aggregate liability for any claim is limited to the greater of the
        platform fees we earned on the transaction giving rise to the claim or US $100. Nothing in
        these Terms limits liability that cannot be limited under New York law.
      </p>

      <h2>Dispute resolution &amp; arbitration</h2>
      <p>
        <strong>Please read this section carefully &mdash; it affects how disputes are resolved and
        limits your right to go to court or have a jury trial.</strong> Except for the matters carved
        out below, any dispute, claim, or controversy between you and Inkmity arising out of or
        relating to the service or these Terms will first go through the informal resolution process
        above, and if it is not resolved within 30 days, will be resolved by{" "}
        <strong>binding individual arbitration</strong> administered by the American Arbitration
        Association under its Consumer Arbitration Rules, seated in New York County, New York. Each of
        us waives the right to a jury trial. <strong>Claims may be brought only on an individual
        basis and not as a plaintiff or class member in any class, consolidated, or representative
        action.</strong> Either party may instead bring a qualifying claim in small-claims court, and
        either party may seek injunctive or equitable relief in court to protect intellectual
        property or stop unauthorized use of the service. You may opt out of this arbitration
        agreement within 30 days of first accepting these Terms by emailing{" "}
        <a href="mailto:legal@inkmity.com">legal@inkmity.com</a> with your name and account email; if
        you opt out, the Governing law &amp; venue section applies instead.
      </p>

      <h2>Governing law &amp; venue</h2>
      <p>
        These Terms are governed by the laws of the State of New York, without regard to its
        conflict-of-laws rules. For any matter not subject to arbitration (or if the arbitration
        agreement is found unenforceable or you opted out), you agree that the dispute will be brought
        exclusively in the state or federal courts located in New York County, New York, and you
        consent to the personal jurisdiction of those courts.
      </p>

      <h2>Force majeure</h2>
      <p>
        Inkmity is not liable for any delay or failure to perform caused by events beyond our
        reasonable control, including acts of God, natural disasters, outages, network or
        third-party-provider failures, labor disputes, war, terrorism, civil unrest, governmental
        action, or public-health emergencies.
      </p>

      <h2>General</h2>
      <p>
        These Terms, together with the documents you sign in the platform, are the entire agreement
        between you and Inkmity regarding the service. If any provision is held unenforceable, the
        rest remains in effect. Our failure to enforce a provision is not a waiver. You may not
        assign these Terms; we may assign them to a successor or affiliate. Provisions that by their
        nature should survive termination &mdash; including payment obligations, content licenses,
        disclaimers, limitations of liability, indemnification, and dispute resolution &mdash; survive
        the end of your account.
      </p>

      <h2>Changes &amp; termination</h2>
      <p>
        We may update these Terms; material changes will be posted here with an updated date. You may
        stop using the service at any time; we may suspend or terminate accounts for violations.
      </p>

      <h2>Contact</h2>
      <p>Questions: <a href="mailto:support@inkmity.com">support@inkmity.com</a>.</p>
    </>
  );
}

export function PrivacyContent() {
  return (
    <>
      <p>
        This Privacy Policy explains how Inkmity ("we", "us") collects, uses, and
        shares information when you use inkmity.com and our services.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account &amp; profile:</strong> name, email, role (client/artist/studio), location, portfolio images, and profile details you provide.</li>
        <li><strong>Bookings &amp; intake:</strong> appointment details, intake/health-consent information, references, and messages.</li>
        <li><strong>Payments:</strong> processed by Stripe; we store transaction metadata (amounts, status, payout records) but not full card numbers.</li>
        <li><strong>Usage &amp; device:</strong> log data, IP address, and basic analytics to operate and secure the service.</li>
      </ul>

      <h2>How we use information</h2>
      <ul>
        <li>To provide discovery, messaging, booking, payments, payouts, and rewards.</li>
        <li>To verify identity, prevent fraud, and secure the platform.</li>
        <li>To send transactional emails and, where permitted, product updates (you may opt out of marketing).</li>
        <li>To comply with legal obligations and enforce our Terms.</li>
      </ul>

      <h2>Service providers</h2>
      <p>
        We share data with providers strictly to run the service: <strong>Stripe</strong> (payments
        &amp; Connect payouts), <strong>Clerk</strong> (authentication), <strong>Cloudinary</strong>
        (image hosting), <strong>MongoDB Atlas</strong> (database), and <strong>Resend</strong> (email).
        We do not sell your personal information.
      </p>

      <h2>Cookies</h2>
      <p>
        We use necessary cookies for authentication and session management, and limited analytics
        cookies. You can control cookies through your browser; some features require them.
      </p>

      <h2>Data retention &amp; security</h2>
      <p>
        We retain information for as long as your account is active or as needed for legal,
        accounting, and dispute-resolution purposes. We maintain reasonable administrative,
        technical, and physical safeguards designed to protect the private information of New York
        residents, consistent with the New York SHIELD Act, including encryption in transit, access
        controls, and signed payment webhooks. No method of transmission or storage is 100% secure.
        If a breach affecting your private information occurs, we will notify affected users as
        required by applicable law.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on your location, you may request access, correction, deletion, or export of your
        data, and may object to or restrict certain processing. To exercise any of these rights,
        email <a href="mailto:legal@inkmity.com">legal@inkmity.com</a>; we will verify your
        identity before acting and respond within the time required by applicable law. You will not
        be discriminated against for exercising these rights.
      </p>

      <h2>Health information</h2>
      <p>
        Some bookings involve health-related intake information (such as allergies, medications, skin
        conditions, or pregnancy status) that you choose to provide so an artist can tattoo you
        safely. We collect only what is needed for the booking, share it only with the artist or
        studio you book and our service providers, and do not use it for advertising. Inkmity is not
        a healthcare provider and this information is not protected by HIPAA; provide only what is
        necessary.
      </p>

      <h2>California residents</h2>
      <p>
        If you are a California resident, the CCPA/CPRA gives you the right to know what personal
        information we collect, to access and delete it, to correct it, and to opt out of any
        &ldquo;sale&rdquo; or &ldquo;sharing&rdquo; of personal information. <strong>We do not sell
        or share your personal information</strong> as those terms are defined under California law.
        You may exercise your rights using the contact above, and may use an authorized agent. We
        honor Global Privacy Control (GPC) and similar opt-out preference signals where required.
      </p>

      <h2>Other U.S. states</h2>
      <p>
        Residents of states with comprehensive privacy laws (such as Colorado, Connecticut, Virginia,
        Utah, Texas, and others) have similar rights to access, correct, delete, and obtain a copy of
        their personal data, and to opt out of targeted advertising and profiling. Contact us at the
        address above to exercise them.
      </p>

      <h2>International users</h2>
      <p>
        Inkmity is operated from the United States and your information will be processed there. If
        you access the service from outside the U.S., you understand that U.S. data-protection laws
        may differ from those in your country, and you consent to this transfer and processing.
      </p>

      <h2>Children</h2>
      <p>Inkmity is for adults 18+. We do not knowingly collect data from anyone under 18.</p>

      <h2>Changes</h2>
      <p>
        We may update this Policy; material changes will be posted here with a new &ldquo;last
        updated&rdquo; date.
      </p>

      <h2>Contact</h2>
      <p>Questions: <a href="mailto:support@inkmity.com">support@inkmity.com</a>.</p>
    </>
  );
}
