import LegalPage from "@/components/legal/LegalPage";
import { PrivacyContent, LEGAL_UPDATED } from "@/components/legal/legalContent";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function Privacy() {
  usePageMeta({
    title: "Privacy Policy",
    description: "How Inkmity collects, uses, and protects your data.",
  });
  return (
    <LegalPage title="Privacy Policy" updated={LEGAL_UPDATED}>
      <PrivacyContent />
    </LegalPage>
  );
}
