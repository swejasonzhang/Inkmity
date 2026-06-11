import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  TermsContent,
  PrivacyContent,
  LEGAL_UPDATED,
  LEGAL_PROSE,
  LEGAL_SURFACE,
} from "@/components/legal/legalContent";

type LegalDoc = "terms" | "privacy";

const META: Record<LegalDoc, { title: string; Body: () => React.ReactElement }> = {
  terms: { title: "Terms of Service", Body: TermsContent },
  privacy: { title: "Privacy Policy", Body: PrivacyContent },
};

/**
 * Inline text trigger that opens the chosen legal document in a scrollable modal.
 * Use in place of an <a href="/terms"> link.
 */
export default function LegalLink({
  doc,
  children,
  className,
}: {
  doc: LegalDoc;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { title, Body } = META[doc];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={
            className ?? "font-semibold text-app underline underline-offset-2 hover:opacity-80"
          }
        >
          {children}
        </button>
      </DialogTrigger>
      <DialogContent
        showCloseButton
        className={`sm:max-w-2xl max-h-[85vh] p-0 text-left justify-items-stretch overflow-hidden ${LEGAL_SURFACE}`}
      >
        <div className="flex flex-col max-h-[85vh] min-h-0">
          <DialogHeader className="px-5 sm:px-6 pt-5 pb-3 border-b border-[color:var(--border)] text-left">
            <DialogTitle className="text-xl font-bold text-app">{title}</DialogTitle>
            <DialogDescription className="text-xs text-muted">
              Last updated: {LEGAL_UPDATED}
            </DialogDescription>
          </DialogHeader>
          <div className={`min-h-0 overflow-y-auto px-5 sm:px-6 py-4 ${LEGAL_PROSE}`}>
            <Body />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
