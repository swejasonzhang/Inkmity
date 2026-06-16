import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ClipboardList, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollLock } from "@/hooks/useScrollLock";
import type { IntakeForm } from "@/api";
import {
  type FormState,
  EMPTY_INTAKE,
  IntakeFields,
  intakeIsComplete,
  toPayload,
} from "./intakeFormShared";

type Props = {
  open: boolean;
  onClose: () => void;
  onComplete: (payload: Partial<IntakeForm>) => void;
  initial?: FormState;
};

export default function PreBookingIntakeModal({ open, onClose, onComplete, initial }: Props) {
  const [form, setForm] = useState<FormState>(initial ?? EMPTY_INTAKE);

  useScrollLock(open);

  useEffect(() => {
    if (open) setForm(initial ?? EMPTY_INTAKE);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  if (!open) return null;

  const canSave = intakeIsComplete(form);

  const save = () => {
    if (!canSave) return;
    onComplete(toPayload(form));
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483646] grid place-items-center p-4 bg-black/60 backdrop-blur-sm ink-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto ink-page-scroll rounded-3xl border border-app bg-card p-6 text-app shadow-2xl"
        style={{ boxShadow: "0 24px 70px -20px rgba(0,0,0,0.7)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid place-items-center h-11 w-11 shrink-0 rounded-2xl border border-app/60 bg-elevated">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h4 className="text-lg font-extrabold tracking-tight leading-tight">Pre-appointment intake</h4>
              <p className="text-xs text-subtle">Required before booking — helps your artist prepare and keeps your session safe.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-subtle hover:text-app hover:bg-app/10 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <IntakeFields form={form} set={set} />

        <div className="mt-6 flex gap-2">
          <Button
            type="button"
            onClick={onClose}
            className="flex-1 bg-elevated border border-app text-app hover:bg-elevated/70 h-11 rounded-xl"
          >
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={!canSave} className="flex-1 h-11 rounded-xl font-semibold">
            Save intake
          </Button>
        </div>
        {!canSave && (
          <p className="mt-2 text-[11px] text-subtle text-center">All consent boxes (except photo) are required to continue.</p>
        )}
      </div>
    </div>,
    document.body
  );
}
