import LegalPage from "@/components/legal/LegalPage";

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="June 10, 2026">

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
        email <a href="mailto:privacy@inkmity.com">privacy@inkmity.com</a>; we will verify your
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
        You may exercise your rights using the contact above, and may use an authorized agent.
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

      <h2>Contact</h2>
      <p>Questions: <a href="mailto:support@inkmity.com">support@inkmity.com</a>.</p>
    </LegalPage>
  );
}
