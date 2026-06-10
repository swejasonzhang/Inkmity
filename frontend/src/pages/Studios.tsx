import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import {
  Building2,
  Plus,
  Loader2,
  UserPlus,
  CheckCircle2,
  Wallet,
  Trash2,
  Mail,
  Bot,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createStudio,
  getMyStudios,
  updateStudio,
  listStudioMembers,
  inviteArtistToStudio,
  updateStudioMember,
  removeStudioMember,
  getMyStudioMemberships,
  respondToStudioInvite,
  getStudioConnectStatus,
  startStudioConnectOnboarding,
  API_URL,
  type Studio,
  type StudioMembership,
  type ConnectStatus,
} from "@/api";
import DocumentSignModal from "@/components/dashboard/shared/DocumentSignModal";
import Header from "@/components/header/Header";
import FloatingBar from "@/components/dashboard/shared/FloatingBar";
import ChatWindow from "@/components/dashboard/shared/ChatWindow";
import { useMessaging } from "@/hooks/useMessaging";
import { useRole } from "@/hooks/useRole";

const pctToWhole = (frac: number | null | undefined) =>
  frac === null || frac === undefined ? "" : String(Math.round(frac * 100));
const wholeToFrac = (whole: string) => {
  const n = Number(whole);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n / 100));
};

function useToken() {
  const { getToken } = useAuth();
  return useCallback(async () => (await getToken()) ?? undefined, [getToken]);
}

const Section: React.FC<{ title: string; children: React.ReactNode; right?: React.ReactNode }> = ({
  title,
  children,
  right,
}) => (
  <div className="rounded-xl border border-app bg-card p-4">
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-bold uppercase tracking-wide text-app">{title}</h3>
      {right}
    </div>
    {children}
  </div>
);

export default function Studios() {
  const token = useToken();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { role } = useRole();
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const base = API_URL.replace(/\/+$/g, "");
      const full = url.startsWith("http")
        ? url
        : `${base}${url.startsWith("/") ? url : `/${url}`}`;
      const tok = await getToken();
      const headers = new Headers(options.headers || {});
      if (tok) headers.set("Authorization", `Bearer ${tok}`);
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      return fetch(full, { ...options, headers, credentials: "include" });
    },
    [getToken]
  );
  const { unreadState, pendingRequestIds, pendingRequestsCount } = useMessaging(
    user?.id ?? "",
    authFetch
  );

  const [loading, setLoading] = useState(true);
  const [studios, setStudios] = useState<Studio[]>([]);
  const [invites, setInvites] = useState<StudioMembership[]>([]);
  const [activeMemberships, setActiveMemberships] = useState<StudioMembership[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => studios.find((s) => s._id === selectedId) || null,
    [studios, selectedId]
  );

  const load = useCallback(async () => {
    try {
      const t = await token();
      const [mine, memberships] = await Promise.all([
        getMyStudios(t),
        getMyStudioMemberships(t),
      ]);
      setStudios(mine);
      setInvites(memberships.filter((m) => m.status === "invited"));
      setActiveMemberships(memberships.filter((m) => m.status === "active"));
      setSelectedId((prev) => prev || mine[0]?._id || null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load studios", { theme: "dark" });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connect") === "return") {
      toast.success("Studio payout details updated", { theme: "dark" });
    }
    const studioParam = params.get("studio");
    if (studioParam) setSelectedId(studioParam);
  }, []);

  return (
    <div className="h-dvh bg-app text-app flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <>
      <div className="mb-6 flex items-center gap-2">
        <Building2 className="h-5 w-5 text-app" />
        <h1 className="text-lg font-bold text-app">Studios</h1>
      </div>

      {invites.length > 0 && (
        <div className="mb-6">
          <Section title="Studio invitations">
            <div className="flex flex-col gap-2">
              {invites.map((inv) => (
                <InviteRow key={inv._id} invite={inv} onDone={load} token={token} />
              ))}
            </div>
          </Section>
        </div>
      )}

      {activeMemberships.length > 0 && (
        <div className="mb-6">
          <Section title="Studios you work at">
            <div className="flex flex-col gap-2">
              {activeMemberships.map((m) => (
                <div
                  key={m._id}
                  className="flex items-center justify-between rounded-lg border border-app bg-elevated px-3 py-2"
                >
                  <span className="text-sm text-app">{m.studio?.name || "Studio"}</span>
                  <span className="text-xs text-muted">
                    Your commission to studio:{" "}
                    {m.effectiveCommissionPct != null
                      ? `${Math.round(m.effectiveCommissionPct * 100)}%`
                      : "—"}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
        <div>
          <Section
            title="Your studios"
            right={<CreateStudioButton onCreated={load} token={token} />}
          >
            {studios.length === 0 ? (
              <p className="text-xs text-muted">
                You don&apos;t own a studio yet. Create one to invite artists and split
                bookings automatically.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {studios.map((s) => (
                  <button
                    key={s._id}
                    onClick={() => setSelectedId(s._id)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                      s._id === selectedId
                        ? "border-app bg-elevated text-app"
                        : "border-transparent text-muted hover:bg-elevated"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="flex flex-col gap-6">
          {selected ? (
            <StudioPanel studio={selected} onChanged={load} token={token} />
          ) : (
            <div className="rounded-xl border border-dashed border-app p-8 text-center text-sm text-muted">
              Select or create a studio to manage it.
            </div>
          )}
        </div>
      </div>
            </>
          )}
        </div>
      </main>

      <div
        ref={setPortalEl}
        id="dashboard-portal-root"
        className="shrink-0"
        style={{
          height:
            "calc(44px + clamp(0.625rem, 1vh + 0.5vw, 1.25rem) + env(safe-area-inset-bottom, 0px))",
        }}
      />
      <FloatingBar
        role={role === "artist" ? "Artist" : "Client"}
        onAssistantOpen={() => setAssistantOpen(true)}
        portalTarget={portalEl}
        messagesContent={
          <ChatWindow
            currentUserId={user?.id ?? ""}
            isArtist={role === "artist"}
            role={role === "artist" ? "artist" : "client"}
          />
        }
        unreadMessagesTotal={unreadState?.unreadMessagesTotal ?? 0}
        unreadConversationIds={Object.keys(unreadState?.unreadByConversation ?? {})}
        pendingRequestIds={pendingRequestIds}
        pendingRequestsCount={pendingRequestsCount}
      />
      <div className={`fixed inset-0 z-50 transition-all duration-300 ${assistantOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-overlay transition-opacity duration-300 ${assistantOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setAssistantOpen(false)}
          aria-hidden
        />
        <div className={`absolute inset-0 bg-card border-t border-app shadow-2xl flex flex-col transition-transform duration-300 ${assistantOpen ? "translate-y-0" : "translate-y-full"}`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-app">
            <div className="flex items-center gap-2 font-semibold">
              <Bot size={18} />
              <span>Assistant</span>
            </div>
            <button onClick={() => setAssistantOpen(false)} className="p-2 rounded-full hover:bg-elevated" aria-label="Close assistant">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 min-h-0 p-4 text-sm opacity-80">Assistant panel</div>
        </div>
      </div>
    </div>
  );
}

function InviteRow({
  invite,
  onDone,
  token,
}: {
  invite: StudioMembership;
  onDone: () => void;
  token: () => Promise<string | undefined>;
}) {
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const respond = async (action: "accept" | "decline") => {
    setBusy(action);
    try {
      await respondToStudioInvite(invite._id, action, await token());
      toast.success(action === "accept" ? "Joined studio" : "Invitation declined", {
        theme: "dark",
      });
      onDone();
    } catch (e: any) {
      toast.error(e?.message || "Failed", { theme: "dark" });
      setBusy(null);
    }
  };
  return (
    <div className="flex items-center justify-between rounded-lg border border-app bg-elevated px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <Mail className="h-4 w-4 shrink-0 text-app" />
        <span className="truncate text-sm text-app">
          {invite.studio?.name || "A studio"} invited you
          {invite.effectiveCommissionPct != null
            ? ` · ${Math.round(invite.effectiveCommissionPct * 100)}% commission`
            : ""}
        </span>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => respond("decline")}>
          {busy === "decline" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Decline"}
        </Button>
        <Button size="sm" disabled={!!busy} onClick={() => respond("accept")}>
          {busy === "accept" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Accept"}
        </Button>
      </div>
    </div>
  );
}

function CreateStudioButton({
  onCreated,
  token,
}: {
  onCreated: () => void;
  token: () => Promise<string | undefined>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createStudio({ name: name.trim() }, await token());
      toast.success("Studio created", { theme: "dark" });
      setName("");
      setOpen(false);
      onCreated();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create studio", { theme: "dark" });
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Studio name"
        className="h-8 w-36 text-sm"
        onKeyDown={(e) => e.key === "Enter" && create()}
      />
      <Button size="sm" disabled={busy} onClick={create}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}
      </Button>
    </div>
  );
}

function StudioPanel({
  studio,
  onChanged,
  token,
}: {
  studio: Studio;
  onChanged: () => void;
  token: () => Promise<string | undefined>;
}) {
  return (
    <>
      <StudioSettings studio={studio} onChanged={onChanged} token={token} />
      <StudioPayouts studio={studio} token={token} />
      <StudioMembers studio={studio} token={token} />
    </>
  );
}

function StudioSettings({
  studio,
  onChanged,
  token,
}: {
  studio: Studio;
  onChanged: () => void;
  token: () => Promise<string | undefined>;
}) {
  const [name, setName] = useState(studio.name);
  const [city, setCity] = useState(studio.city || "");
  const [commission, setCommission] = useState(pctToWhole(studio.defaultCommissionPct));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(studio.name);
    setCity(studio.city || "");
    setCommission(pctToWhole(studio.defaultCommissionPct));
  }, [studio._id]);

  const save = async () => {
    setBusy(true);
    try {
      await updateStudio(
        studio._id,
        { name, city, defaultCommissionPct: wholeToFrac(commission) },
        await token()
      );
      toast.success("Studio saved", { theme: "dark" });
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save", { theme: "dark" });
    } finally {
      setBusy(false);
    }
  };

  const verification = studio.verificationStatus || "pending";

  return (
    <Section
      title="Settings"
      right={
        <span
          className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            verification === "verified"
              ? "text-app"
              : verification === "rejected"
                ? "text-muted line-through"
                : "text-muted"
          }`}
          title={
            verification === "verified"
              ? "Studio verified — bookings can go live."
              : verification === "rejected"
                ? "Verification was rejected. Contact support."
                : "Pending platform review. Bookings go live once verified."
          }
        >
          {verification === "verified" ? "✓ Verified" : verification === "rejected" ? "Rejected" : "Pending review"}
        </span>
      }
    >
      {verification !== "verified" && (
        <p className="mb-3 rounded-lg border border-app bg-elevated px-3 py-2 text-[11px] text-muted">
          You can set everything up now. Your studio becomes bookable to clients once
          it&apos;s verified — Stripe verifies your business for payouts, and our team
          reviews the listing.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-muted">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs text-muted">City</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs text-muted">Default commission (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            className="mt-1"
          />
          <p className="mt-1 text-[11px] text-muted">
            The studio&apos;s cut of each booking. You can override this per artist below.
          </p>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button size="sm" disabled={busy} onClick={save}>
          {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
          Save
        </Button>
      </div>
    </Section>
  );
}

function StudioPayouts({
  studio,
  token,
}: {
  studio: Studio;
  token: () => Promise<string | undefined>;
}) {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await getStudioConnectStatus(studio._id, await token()));
    } catch {
    }
  }, [studio._id, token]);

  useEffect(() => {
    load();
  }, [load]);

  const onSetup = async () => {
    setBusy(true);
    try {
      const { url } = await startStudioConnectOnboarding(studio._id, await token());
      if (url) window.location.href = url;
    } catch (e: any) {
      if (e?.status === 403 && e?.body?.error === "agreement_required") {
        setAgreementOpen(true);
        setBusy(false);
        return;
      }
      toast.error(e?.message || "Could not start onboarding", { theme: "dark" });
      setBusy(false);
    }
  };

  const ready = Boolean(status?.connected && status?.chargesEnabled);

  return (
    <Section title="Payouts">
      <DocumentSignModal
        open={agreementOpen}
        docType="studio_agreement"
        signerRole="studio"
        studioId={studio._id}
        onSigned={() => {
          setAgreementOpen(false);
          onSetup();
        }}
        onClose={() => setAgreementOpen(false)}
      />
      {ready ? (
        <div className="flex items-center gap-2 text-sm text-app">
          <CheckCircle2 className="h-4 w-4" />
          Payouts active — the studio can receive its commission.
          {!status?.payoutsEnabled && (
            <span className="text-muted"> (payout details pending)</span>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-app" />
            <p className="text-xs text-muted">
              Connect the studio&apos;s bank with Stripe so its commission is paid out
              automatically on each booking.
            </p>
          </div>
          <Button size="sm" disabled={busy} onClick={onSetup} className="shrink-0">
            {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
            {status?.connected ? "Continue setup" : "Set up payouts"}
          </Button>
        </div>
      )}
    </Section>
  );
}

function StudioMembers({
  studio,
  token,
}: {
  studio: Studio;
  token: () => Promise<string | undefined>;
}) {
  const [members, setMembers] = useState<StudioMembership[]>([]);
  const [handle, setHandle] = useState("");
  const [inviteCommission, setInviteCommission] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setMembers(await listStudioMembers(studio._id, await token()));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load members", { theme: "dark" });
    }
  }, [studio._id, token]);

  useEffect(() => {
    load();
  }, [load]);

  const invite = async () => {
    if (!handle.trim()) return;
    setBusy(true);
    try {
      await inviteArtistToStudio(
        studio._id,
        {
          handle: handle.trim(),
          commissionPct: inviteCommission ? wholeToFrac(inviteCommission) : null,
        },
        await token()
      );
      toast.success("Invitation sent", { theme: "dark" });
      setHandle("");
      setInviteCommission("");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to invite", { theme: "dark" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (artistClerkId: string) => {
    try {
      await removeStudioMember(studio._id, artistClerkId, await token());
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove", { theme: "dark" });
    }
  };

  const saveCommission = async (artistClerkId: string, whole: string) => {
    try {
      await updateStudioMember(
        studio._id,
        artistClerkId,
        { commissionPct: whole === "" ? null : wholeToFrac(whole) },
        await token()
      );
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update", { theme: "dark" });
    }
  };

  return (
    <Section title="Artists">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label className="text-xs text-muted">Invite by handle</Label>
          <Input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@artisthandle"
            className="mt-1"
          />
        </div>
        <div className="w-32">
          <Label className="text-xs text-muted">Commission %</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={inviteCommission}
            onChange={(e) => setInviteCommission(e.target.value)}
            placeholder="default"
            className="mt-1"
          />
        </div>
        <Button size="sm" disabled={busy} onClick={invite}>
          {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <UserPlus className="h-3.5 w-3.5 mr-1" />}
          Invite
        </Button>
      </div>

      {members.length === 0 ? (
        <p className="text-xs text-muted">No artists yet. Invite one above.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <MemberRow key={m._id} member={m} onRemove={remove} onSaveCommission={saveCommission} />
          ))}
        </div>
      )}
    </Section>
  );
}

function MemberRow({
  member,
  onRemove,
  onSaveCommission,
}: {
  member: StudioMembership;
  onRemove: (artistClerkId: string) => void;
  onSaveCommission: (artistClerkId: string, whole: string) => void;
}) {
  const [pct, setPct] = useState(pctToWhole(member.commissionPct));
  const label = member.artist?.username || member.artist?.handle || member.artistClerkId;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-app bg-elevated px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm text-app">{label}</span>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${
            member.status === "active" ? "text-app" : "text-muted"
          }`}
        >
          {member.status}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Input
          type="number"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => setPct(e.target.value)}
          onBlur={() => onSaveCommission(member.artistClerkId, pct)}
          placeholder="default"
          className="h-8 w-20 text-sm"
          title="Commission % to studio (blank = studio default)"
        />
        <button
          onClick={() => onRemove(member.artistClerkId)}
          className="text-muted transition hover:text-app"
          title="Remove from studio"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
