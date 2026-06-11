import LegalPage from "@/components/legal/LegalPage";
import { PrivacyContent, LEGAL_UPDATED } from "@/components/legal/legalContent";

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated={LEGAL_UPDATED}>
      <PrivacyContent />
    </LegalPage>
  );
}
