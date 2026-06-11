import LegalPage from "@/components/legal/LegalPage";
import { TermsContent, LEGAL_UPDATED } from "@/components/legal/legalContent";

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" updated={LEGAL_UPDATED}>
      <TermsContent />
    </LegalPage>
  );
}
