import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Loader2 } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import { getDocument, signDocument, type LegalDocument } from "@/api";

type Props = {
  open: boolean;
  docType: string;
  signerRole: "client" | "artist" | "studio";
  bookingId?: string;
  studioId?: string;
  onSigned: () => void;
  onClose: () => void;
};

export default function DocumentSignModal({
  open,
  docType,
  signerRole,
  bookingId,
  studioId,
  onSigned,
  onClose,
}: Props) {
  const { getToken } = useAuth();
  const [doc, setDoc] = useState<LegalDocument | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDoc(await getDocument(docType));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load document", { theme: "dark" });
    } finally {
      setLoading(false);
    }
  }, [docType]);

  useEffect(() => {
    if (open) {
      setName("");
      load();
    }
  }, [open, load]);

  const sign = async () => {
    if (!name.trim()) return;
    setSigning(true);
    try {
      const token = (await getToken()) ?? undefined;
      await signDocument(
        docType,
        { signatureName: name.trim(), signerRole, bookingId, studioId },
        token
      );
      toast.success("Signed", { theme: "dark" });
      onSigned();
    } catch (e: any) {
      toast.error(e?.message || "Failed to sign", { theme: "dark" });
    } finally {
      setSigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-card border-app">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <FileText className="h-4 w-4" />
            {doc?.title || "Document"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-64 rounded-lg border border-app bg-elevated p-3">
              <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-app/80">
                {doc?.body}
              </p>
            </ScrollArea>

            <div className="mt-2">
              <label className="text-xs text-muted">
                Type your full legal name to sign
              </label>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="mt-1"
                onKeyDown={(e) => e.key === "Enter" && sign()}
              />
              <p className="mt-1 text-[10px] text-muted">
                By typing your name and signing, you agree to this document
                {doc?.version ? ` (version ${doc.version})` : ""}. Your signature,
                timestamp, and IP are recorded.
              </p>
            </div>
          </>
        )}

        <DialogFooter className="gap-2 sm:justify-center">
          <Button variant="outline" onClick={onClose} disabled={signing} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={sign} disabled={signing || !name.trim() || loading} className="rounded-xl">
            {signing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Sign &amp; agree
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
