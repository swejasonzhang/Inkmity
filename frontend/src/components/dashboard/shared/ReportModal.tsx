import { useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import { Flag, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useScrollLock } from "@/hooks/useScrollLock";
import { createReport, type ReportTargetType } from "@/api";

type Props = {
  open: boolean;
  targetType: ReportTargetType;
  targetRef: string;
  targetOwnerClerkId?: string;
  onClose: () => void;
};

const REASONS: { value: string; label: string }[] = [
  { value: "inappropriate", label: "Inappropriate or explicit" },
  { value: "spam", label: "Spam or misleading" },
  { value: "harassment", label: "Harassment or hate" },
  { value: "copyright", label: "Copyright / stolen work" },
  { value: "impersonation", label: "Impersonation / fake artist" },
  { value: "other", label: "Something else" },
];

export default function ReportModal({ open, targetType, targetRef, targetOwnerClerkId, onClose }: Props) {
  const { getToken } = useAuth();
  const [reason, setReason] = useState("inappropriate");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useScrollLock(open);

  if (!open) return null;

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      await createReport({ targetType, targetRef, targetOwnerClerkId, reason, details: details.trim() }, token);
      toast.success("Thanks — our team will review this.");
      setDetails("");
      setReason("inappropriate");
      onClose();
    } catch (err: any) {
      toast.error(err?.body?.message || err?.message || "Couldn't submit the report");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483646] grid place-items-center p-4 bg-black/60 backdrop-blur-sm ink-fade-in"
      onClick={() => !submitting && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-app bg-card p-6 text-app shadow-2xl"
        style={{ boxShadow: "0 24px 70px -20px rgba(0,0,0,0.7)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid place-items-center h-11 w-11 shrink-0 rounded-2xl border border-app/60 bg-elevated">
              <Flag className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h4 className="text-lg font-extrabold tracking-tight leading-tight">Report this</h4>
              <p className="text-xs text-subtle">Reports are confidential and reviewed by our team.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-subtle hover:text-app hover:bg-app/10 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-2.5 cursor-pointer text-sm">
              <input
                type="radio"
                name="report-reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="h-4 w-4 accent-[var(--fg)]"
              />
              <span>{r.label}</span>
            </label>
          ))}
        </div>

        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Add any details (optional)"
          className="mt-3"
        />

        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className="flex-1 bg-elevated border border-app text-app hover:bg-elevated/70 h-11 rounded-xl"
          >
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={submitting} className="flex-1 h-11 rounded-xl font-semibold">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit report"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
