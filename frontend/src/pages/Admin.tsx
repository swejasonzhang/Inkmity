import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import Header from "@/components/header/Header";
import { Button } from "@/components/ui/button";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ShieldAlert, Flag, Loader2 } from "lucide-react";
import {
  getMe,
  getNoShowDisputes,
  resolveArtistNoShow,
  listReports,
  updateReportStatus,
  type NoShowDispute,
  type AdminReport,
} from "@/api";

export default function Admin() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [disputes, setDisputes] = useState<NoShowDispute[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const me = await getMe({ token: token ?? undefined });
      if (!me?.isAdmin) {
        setIsAdmin(false);
        return;
      }
      setIsAdmin(true);
      const [d, r] = await Promise.all([
        getNoShowDisputes(token).catch(() => ({ items: [] })),
        listReports({ status: "open" }, token).catch(() => ({ reports: [] })),
      ]);
      setDisputes(d?.items ?? []);
      setReports(r?.reports ?? []);
    } catch {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const resolveDispute = async (id: string, refund: boolean) => {
    setBusy(id);
    try {
      const token = await getToken();
      await resolveArtistNoShow(id, refund, token);
      toast.success(refund ? "Refunded the client." : "Dispute dismissed.", { hideProgressBar: true });
      setDisputes((prev) => prev.filter((d) => d._id !== id));
    } catch (e: any) {
      toast.error(e?.body?.message || e?.message || "Couldn't resolve");
    } finally {
      setBusy(null);
    }
  };

  const actionReport = async (id: string, status: string) => {
    setBusy(id);
    try {
      const token = await getToken();
      await updateReportStatus(id, status, token);
      toast.success("Report updated.", { hideProgressBar: true });
      setReports((prev) => prev.filter((r) => r._id !== id));
    } catch (e: any) {
      toast.error(e?.body?.message || e?.message || "Couldn't update");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div id="dashboard-scope" className="ink-scope theme-smooth min-h-dvh bg-app text-app flex flex-col">
      <Header />
      <ToastContainer position="top-center" newestOnTop hideProgressBar style={{ zIndex: 2147483647 }} />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center gap-2 mb-6">
          <ShieldAlert className="h-5 w-5" />
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Admin review</h1>
        </div>

        {loading ? (
          <div className="grid place-items-center py-20 text-subtle">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !isAdmin ? (
          <div className="rounded-2xl border border-app bg-card p-8 text-center text-subtle">
            You don't have access to this page.
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wide text-subtle mb-3">
                Artist no-show disputes ({disputes.length})
              </h2>
              {disputes.length === 0 ? (
                <p className="text-sm text-subtle">No open disputes.</p>
              ) : (
                <div className="space-y-3">
                  {disputes.map((d) => (
                    <div key={d._id} className="rounded-2xl border border-app bg-card p-4">
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <span className="text-sm font-bold">
                          {d.client?.username || "Client"} vs {d.artist?.username || "Artist"}
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
                          {d.artistNoShowStatus}
                        </span>
                      </div>
                      <div className="text-xs text-subtle">
                        Appointment: {new Date(d.startAt).toLocaleString()}
                      </div>
                      {d.artistNoShowReason && (
                        <p className="mt-1.5 text-xs"><span className="text-subtle">Client:</span> "{d.artistNoShowReason}"</p>
                      )}
                      {d.artistNoShowArtistNote && (
                        <p className="mt-1 text-xs"><span className="text-subtle">Artist:</span> "{d.artistNoShowArtistNote}"</p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <Button
                          onClick={() => resolveDispute(d._id, false)}
                          disabled={busy === d._id}
                          variant="outline"
                          className="flex-1 h-9 text-sm"
                          style={{ borderColor: "var(--border)", color: "var(--fg)", background: "var(--card)" }}
                        >
                          Dismiss (no refund)
                        </Button>
                        <Button
                          onClick={() => resolveDispute(d._id, true)}
                          disabled={busy === d._id}
                          className="flex-1 h-9 text-sm font-semibold"
                          style={{ background: "var(--fg)", color: "var(--bg)" }}
                        >
                          Refund client
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-subtle mb-3">
                <Flag className="h-3.5 w-3.5" /> Content reports ({reports.length})
              </h2>
              {reports.length === 0 ? (
                <p className="text-sm text-subtle">No open reports.</p>
              ) : (
                <div className="space-y-3">
                  {reports.map((r) => (
                    <div key={r._id} className="rounded-2xl border border-app bg-card p-4">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="text-sm font-bold capitalize">{r.targetType} · {r.reason}</span>
                        <span className="text-[11px] text-subtle">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-subtle break-all">{r.targetRef}</p>
                      {r.details && <p className="mt-1.5 text-xs">{r.details}</p>}
                      <div className="mt-3 flex gap-2">
                        <Button
                          onClick={() => actionReport(r._id, "dismissed")}
                          disabled={busy === r._id}
                          variant="outline"
                          className="flex-1 h-9 text-sm"
                          style={{ borderColor: "var(--border)", color: "var(--fg)", background: "var(--card)" }}
                        >
                          Dismiss
                        </Button>
                        <Button
                          onClick={() => actionReport(r._id, "actioned")}
                          disabled={busy === r._id}
                          className="flex-1 h-9 text-sm font-semibold"
                          style={{ background: "var(--fg)", color: "var(--bg)" }}
                        >
                          Mark actioned
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
