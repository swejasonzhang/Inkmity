import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import { ClipboardList, Loader2, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollLock } from "@/hooks/useScrollLock";
import { getIntakeForm, submitIntakeForm } from "@/api";
import {
  type FormState,
  EMPTY_INTAKE,
  REQUIRED_CONSENT,
  fromIntake,
  toPayload,
  IntakeFields,
} from "./intakeFormShared";

type Props = {
  bookingId: string;
  isClient: boolean;
};

export default function IntakeFormPanel({ bookingId, isClient }: Props) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_INTAKE);
  const [saving, setSaving] = useState(false);

  useScrollLock(open);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const existing = await getIntakeForm(bookingId, token);
      if (existing) {
        setSubmittedAt(existing.submittedAt ?? null);
        setForm(fromIntake(existing));
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [bookingId, getToken]);

  useEffect(() => {
    if (!isClient) {
      setLoading(false);
      return;
    }
    load();
  }, [isClient, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving]);

  if (!isClient || loading) return null;

  const canSubmit = REQUIRED_CONSENT.every((k) => form[k] === true) && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const token = await getToken();
      const saved = await submitIntakeForm(bookingId, toPayload(form), token);
      setSubmittedAt(saved?.submittedAt ?? new Date().toISOString());
      toast.success("Intake form submitted.");
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.body?.message || err?.message || "Couldn't submit your intake form");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-2 border-t" style={{ borderColor: "color-mix(in srgb, var(--border) 50%, transparent)" }}>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="w-full h-9 text-sm font-medium"
        style={{ borderColor: "var(--border)", color: "var(--fg)", background: "var(--card)" }}
      >
        {submittedAt ? (
          <>
            <CheckCircle2 className="h-4 w-4 mr-2" /> Intake form submitted — edit
          </>
        ) : (
          <>
            <ClipboardList className="h-4 w-4 mr-2" /> Complete intake form
          </>
        )}
      </Button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[2147483600] grid place-items-center p-4 bg-black/60 backdrop-blur-sm ink-fade-in"
            onClick={() => !saving && setOpen(false)}
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
                    <p className="text-xs text-subtle">Helps your artist prepare and keeps your session safe.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !saving && setOpen(false)}
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
                  onClick={() => !saving && setOpen(false)}
                  disabled={saving}
                  className="flex-1 bg-elevated border border-app text-app hover:bg-elevated/70 h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button type="button" onClick={submit} disabled={!canSubmit} className="flex-1 h-11 rounded-xl font-semibold">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit intake"}
                </Button>
              </div>
              {!canSubmit && !saving && (
                <p className="mt-2 text-[11px] text-subtle text-center">All consent boxes (except photo) are required to submit.</p>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
