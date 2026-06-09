import LegalPage from "@/components/legal/LegalPage";

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="June 9, 2026">
      <p className="text-xs italic text-muted">
        Template for review — have an attorney review and tailor this before launch.
      </p>

      <p>
        These Terms govern your use of Inkmity. By creating an account or using the service, you
        agree to them.
      </p>

      <h2>Eligibility</h2>
      <p>You must be 18 or older to use Inkmity.</p>

      <h2>Our role (marketplace)</h2>
      <p>
        Inkmity is a marketplace and payment facilitator that connects clients with independent
        tattoo artists and studios. <strong>We do not provide tattoo services and do not warrant the
        artistic outcome of any session.</strong> Artists and studios are solely responsible for the
        work they perform and their compliance with applicable laws and licensing.
      </p>

      <h2>Payments, deposits &amp; payouts</h2>
      <ul>
        <li>Payments are processed by Stripe; Inkmity acts as merchant of record.</li>
        <li>A non-refundable deposit holds your appointment; the remaining balance is charged on completion once both parties confirm.</li>
        <li>Payouts are transferred to artists and studios (split by commission for studio bookings), less the platform fee.</li>
        <li>Chargebacks may be deducted from the responsible artist's/studio's payouts.</li>
      </ul>

      <h2>Cancellations &amp; refunds</h2>
      <p>
        Cancellation, reschedule, and refund eligibility follow each artist's policy and the cutoffs
        shown at booking. Subjective dissatisfaction with completed work is generally not refundable;
        genuine disputes are handled through our dispute process.
      </p>

      <h2>Consent &amp; waivers</h2>
      <p>
        Tattoo sessions require a signed consent/liability waiver. Tattoos are permanent; you confirm
        you have reviewed and approved the design, placement, and size.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Do not misuse the platform: no fraud, harassment, infringement, circumventing payments, or
        unlawful activity. We may suspend accounts that violate these Terms.
      </p>

      <h2>Disclaimers &amp; liability</h2>
      <p>
        The service is provided "as is." To the maximum extent permitted by law, Inkmity is not liable
        for the acts, omissions, or work of artists/studios, or for indirect or consequential damages.
      </p>

      <h2>Changes &amp; termination</h2>
      <p>
        We may update these Terms; material changes will be posted here. You may stop using the
        service at any time; we may suspend or terminate accounts for violations.
      </p>

      <h2>Contact</h2>
      <p>Questions: <a href="mailto:support@inkmity.com">support@inkmity.com</a>.</p>
    </LegalPage>
  );
}
