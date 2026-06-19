import LegalPage from "@/components/legal/LegalPage";
import { TermsContent, LEGAL_UPDATED } from "@/components/legal/legalContent";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function Terms() {
  usePageMeta({
    title: "Terms of Service",
    description: "The terms that govern your use of Inkmity.",
  });
  return (
    <LegalPage title="Terms of Service" updated={LEGAL_UPDATED}>
      <TermsContent />
    </LegalPage>
  );
}
