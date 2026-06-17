import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useScrollLock } from "@/hooks/useScrollLock";

export type PromptConfig = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  input?: { label?: string; placeholder?: string; required?: boolean };
  onConfirm: (value: string) => void | Promise<void>;
};

export default function PromptModal({
  config,
  onClose,
}: {
  config: PromptConfig | null;
  onClose: () => void;
}) {
  const open = config !== null;
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  useScrollLock(open);

  useEffect(() => {
    if (open) {
      setValue("");
      setBusy(false);
    }
  }, [open, config]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open || !config) return null;

  const canConfirm = !busy && (!config.input?.required || value.trim().length > 0);

  const confirm = async () => {
    if (!canConfirm) return;
    setBusy(true);
    try {
      await config.onConfirm(value.trim());
      onClose();
    } catch {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483646] grid place-items-center p-4 bg-black/60 backdrop-blur-sm ink-fade-in"
      onClick={() => !busy && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-app bg-card p-6 text-app shadow-2xl"
        style={{ boxShadow: "0 24px 70px -20px rgba(0,0,0,0.7)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-lg font-extrabold tracking-tight leading-tight">{config.title}</h4>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-subtle hover:text-app hover:bg-app/10 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {config.message && <p className="mt-1.5 text-sm text-subtle leading-relaxed">{config.message}</p>}

        {config.input && (
          <div className="mt-3">
            {config.input.label && <label className="text-xs text-subtle">{config.input.label}</label>}
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={3}
              placeholder={config.input.placeholder}
              className="mt-1"
              autoFocus
            />
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="flex-1 bg-elevated border border-app text-app hover:bg-elevated/70 h-11 rounded-xl"
          >
            {config.cancelLabel || "Cancel"}
          </Button>
          <Button
            type="button"
            onClick={confirm}
            disabled={!canConfirm}
            className="flex-1 h-11 rounded-xl font-semibold"
            style={{ background: "var(--fg)", color: "var(--bg)" }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : config.confirmLabel || "Confirm"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
