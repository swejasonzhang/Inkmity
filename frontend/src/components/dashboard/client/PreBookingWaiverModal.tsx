import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import { FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useScrollLock } from "@/hooks/useScrollLock";
import { getDocument, signDocument, type LegalDocument } from "@/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onSigned: () => void;
};

const DOC_TYPE = "client_waiver";

export default function PreBookingWaiverModal({ open, onClose, onSigned }: Props) {
  const { getToken } = useAuth();
  const [doc, setDoc] = useState<LegalDocument | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);

  useScrollLock(open);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDoc(await getDocument(DOC_TYPE));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load document");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setName("");
      load();
    }
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !signing && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, signing, onClose]);

  if (!open) return null;

  const sign = async () => {
    if (!name.trim()) return;
    setSigning(true);
    try {
      const token = (await getToken()) ?? undefined;
      await signDocument(DOC_TYPE, { signatureName: name.trim(), signerRole: "client" }, token);
      toast.success("Waiver signed.");
      onSigned();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Failed to sign");
    } finally {
      setSigning(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483646] grid place-items-center p-4 bg-black/60 backdrop-blur-sm ink-fade-in"
      onClick={() => !signing && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto ink-page-scroll rounded-3xl border border-app bg-card p-6 text-app shadow-2xl"
        style={{ boxShadow: "0 24px 70px -20px rgba(0,0,0,0.7)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid place-items-center h-11 w-11 shrink-0 rounded-2xl border border-app/60 bg-elevated">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h4 className="text-lg font-extrabold tracking-tight leading-tight">{doc?.title || "Consent & liability waiver"}</h4>
              <p className="text-xs text-subtle">Required before booking a tattoo session.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !signing && onClose()}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-subtle hover:text-app hover:bg-app/10 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-subtle">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            <div className="max-h-64 overflow-y-auto ink-page-scroll rounded-lg border border-app bg-elevated p-3">
              <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-app/80">{doc?.body}</p>
            </div>

            <div className="mt-3">
              <label className="text-xs text-subtle">Type your full legal name to sign</label>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="mt-1"
                onKeyDown={(e) => e.key === "Enter" && sign()}
              />
              <p className="mt-1 text-[10px] text-subtle">
                By typing your name and signing, you agree to this document
                {doc?.version ? ` (version ${doc.version})` : ""}. Your signature, timestamp, and IP are recorded.
              </p>
            </div>
          </>
        )}

        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            onClick={() => !signing && onClose()}
            disabled={signing}
            className="flex-1 bg-elevated border border-app text-app hover:bg-elevated/70 h-11 rounded-xl"
          >
            Cancel
          </Button>
          <Button type="button" onClick={sign} disabled={signing || !name.trim() || loading} className="flex-1 h-11 rounded-xl font-semibold">
            {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign & agree"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
