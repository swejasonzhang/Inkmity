import LegalPage from "@/components/legal/LegalPage";

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="June 9, 2026">
      <p className="text-xs italic text-muted">
        Template for review — have an attorney review and tailor this before launch.
      </p>

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
        accounting, and dispute-resolution purposes. We apply industry-standard safeguards
        (encryption in transit, access controls, signed payment webhooks), but no method is 100% secure.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on your location, you may request access, correction, deletion, or export of your
        data, and may object to certain processing. Contact us to exercise these rights.
      </p>

      <h2>Children</h2>
      <p>Inkmity is for adults 18+. We do not knowingly collect data from anyone under 18.</p>

      <h2>Contact</h2>
      <p>Questions: <a href="mailto:support@inkmity.com">support@inkmity.com</a>.</p>
    </LegalPage>
  );
}
