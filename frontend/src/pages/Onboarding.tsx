import { useEffect, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { getMe, syncUser } from "@/api";
import { setCachedUsername } from "@/lib/roleCache";
import { markOnboarded } from "@/hooks/useOnboarded";
import Header from "@/components/header/Header";
import VideoBackground from "@/components/VideoBackground";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ClientDetailsStep from "@/components/access/ClientDetailsStep";
import ArtistDetailsStep from "@/components/access/ArtistDetailsStep";
import { advanceOnEnterIfEmpty } from "@/lib/formNav";

type Role = "client" | "artist";

const CLIENT_DEFAULTS = { budgetMin: "100", budgetMax: "200", location: "New York, NY", placement: "", size: "", style: "all", availability: "all", dob: "" };
const ARTIST_DEFAULTS = { location: "New York, NY", shop: "", shopAddress: "", years: "0", baseRate: "100", baseRateMax: "200", bookingPreference: "open" as const, travelFrequency: "rare" as const, portfolio: "", styles: [] as string[], bio: "" };

function ageFromDob(dob?: string): number {
    if (!dob) return NaN;
    const d = new Date(dob);
    if (isNaN(d.getTime())) return NaN;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age;
}

export default function Onboarding() {
    const navigate = useNavigate();
    const { isLoaded, isSignedIn, user } = useUser();
    const { getToken } = useAuth();

    const [checking, setChecking] = useState(true);
    const [existingRole, setExistingRole] = useState<"client" | "artist" | "studio" | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [username, setUsername] = useState("");
    const [role, setRole] = useState<Role>("client");

    const usernameValid = username.trim().length >= 2;
    const [client, setClient] = useState({ ...CLIENT_DEFAULTS });
    const [artist, setArtist] = useState({ ...ARTIST_DEFAULTS });
    const [agreed, setAgreed] = useState(false);

    const enteredAge = ageFromDob(client.dob);
    const underage = role === "client" && !Number.isNaN(enteredAge) && enteredAge < 18;
    const canContinue = agreed && !underage;

    useEffect(() => {
        if (!isLoaded) return;
        if (!isSignedIn) {
            navigate("/login", { replace: true });
            return;
        }
        let active = true;
        (async () => {
            try {
                const token = await getToken();
                const me = await getMe({ token: token ?? undefined });
                if (!active) return;
                if (me?.onboardingComplete === true) {
                    const roleStr = String((me as { role?: string }).role || "");
                    const r = roleStr === "artist" || roleStr === "studio" || roleStr === "client" ? (roleStr as "client" | "artist" | "studio") : "client";
                    setExistingRole(r);
                } else {
                    setChecking(false);
                }
            } catch {
                if (active) setChecking(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [isLoaded, isSignedIn, getToken, navigate]);

    useEffect(() => {
        if (!existingRole) return;
        const dest = existingRole === "client" ? "/artists" : existingRole === "studio" ? "/studios" : "/dashboard";
        const t = window.setTimeout(() => navigate(dest, { replace: true }), 1400);
        return () => window.clearTimeout(t);
    }, [existingRole, navigate]);

    const presetRole = (user?.unsafeMetadata as { role?: string } | undefined)?.role;
    const roleLocked = presetRole === "client" || presetRole === "artist";
    useEffect(() => {
        if (roleLocked) setRole(presetRole as Role);
    }, [roleLocked, presetRole]);

    const handleClient = (e: ChangeEvent<HTMLInputElement> | { target: { name: string; value: string } }) => {
        const { name, value } = (e as { target: { name: string; value: string } }).target;
        if (!name) return;
        setClient((prev) => ({ ...prev, [name]: value }));
    };

    const handleArtist = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target as HTMLInputElement;
        if (name === "stylesCSV") {
            setArtist((prev) => ({ ...prev, styles: value.split(",").map((s) => s.trim()).filter(Boolean) }));
        } else {
            setArtist((prev) => ({ ...prev, [name]: value }));
        }
    };

    const finish = async (useDefaults: boolean) => {
        if (!user || submitting || !usernameValid) return;
        if (!canContinue) return;
        setSubmitting(true);
        setCompleting(true);
        try {
            const token = await getToken();
            const email =
                user.primaryEmailAddress?.emailAddress ||
                user.emailAddresses?.[0]?.emailAddress ||
                "";
            const fn = user.firstName?.trim() || "";
            const ln = user.lastName?.trim() || "";

            const src = useDefaults ? null : role === "artist" ? artist : client;
            const profile =
                role === "artist"
                    ? {
                          location: (src as typeof artist)?.location || "New York, NY",
                          years: Number((src as typeof artist)?.years) || 0,
                          baseRate: Number((src as typeof artist)?.baseRate) || 100,
                          baseRateMax: Number((src as typeof artist)?.baseRateMax) || 200,
                          bookingPreference: (src as typeof artist)?.bookingPreference || "open",
                          travelFrequency: (src as typeof artist)?.travelFrequency || "rare",
                          styles: (src as typeof artist)?.styles || [],
                          bio: (src as typeof artist)?.bio || "",
                          shop: (src as typeof artist)?.shop || "",
                          shopAddress: (src as typeof artist)?.shopAddress || "",
                      }
                    : {
                          budgetMin: Number((src as typeof client)?.budgetMin) || 100,
                          budgetMax: Number((src as typeof client)?.budgetMax) || 200,
                          location: (src as typeof client)?.location || "New York, NY",
                          placement: (src as typeof client)?.placement || "",
                          size: (src as typeof client)?.size || "",
                          dob: (src as typeof client)?.dob || undefined,
                      };

            await syncUser(token ?? "", {
                clerkId: user.id,
                email,
                role,
                username: username.trim(),
                firstName: fn,
                lastName: ln,
                profile,
            });
            setCachedUsername(username.trim());
            markOnboarded(user.id);
            window.dispatchEvent(new Event("inkmity:user-updated"));
            setTimeout(() => navigate(role === "client" ? "/artists" : "/dashboard", { replace: true }), 500);
        } catch {
            setSubmitting(false);
            setCompleting(false);
        }
    };

    if (completing) {
        return (
            <div className="relative h-svh flex flex-col items-center justify-center text-app">
                <VideoBackground />
                <div className="flex flex-col items-center gap-4">
                    <Spinner size={40} className="text-app" />
                    <p className="text-sm text-subtle">Setting up your account…</p>
                </div>
            </div>
        );
    }

    if (existingRole) {
        const where = existingRole === "client" ? "artists" : existingRole === "studio" ? "studio" : "dashboard";
        return (
            <div className="relative h-svh flex flex-col items-center justify-center text-app">
                <VideoBackground />
                <div className="flex flex-col items-center gap-4 text-center px-6">
                    <Spinner size={40} className="text-app" />
                    <div className="space-y-1">
                        <p className="text-app text-lg font-semibold">Account found</p>
                        <p className="text-sm text-subtle">Redirecting you to your {where}…</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!isLoaded || checking) {
        return (
            <div className="relative h-svh flex flex-col text-app">
                <VideoBackground />
            </div>
        );
    }

    const roleBtn = (r: Role, label: string) => (
        <Button
            type="button"
            variant="secondary"
            onClick={() => setRole(r)}
            className={`flex-1 h-9 sm:h-10 rounded-xl text-sm ${role === r ? "bg-white/20 text-white" : "bg-white/10 text-white/80"}`}
        >
            {label}
        </Button>
    );

    return (
        <div className="relative h-svh overflow-hidden flex flex-col text-app">
            <VideoBackground />
            <Header />
            <main className="flex-1 min-h-0 flex items-center justify-center px-3 sm:px-6 py-2 sm:py-3 overflow-hidden">
                <div className="w-full max-w-sm sm:max-w-xl mx-auto max-h-full overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-app p-2.5 sm:p-5" onKeyDown={advanceOnEnterIfEmpty}>
                    <div className="mb-1.5 sm:mb-2">
                        <label htmlFor="onboard-username" className="block text-xs text-white/80 mb-1 text-center">
                            Username <span className="text-white">*</span> <span className="text-app/50">(required)</span>
                        </label>
                        <Input
                            id="onboard-username"
                            name="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter a username to continue"
                            maxLength={40}
                            autoFocus
                            aria-required="true"
                            className={`h-9 sm:h-10 rounded-xl text-center bg-neutral-900/80 border border-white/15 text-white placeholder:text-white/40 ${!usernameValid && username.length > 0 ? "!border-white" : ""}`}
                        />
                        <p className={`text-[11px] mt-1 text-center ${!usernameValid && username.length > 0 ? "text-white" : "text-app/50"}`}>
                            {!usernameValid && username.length > 0
                                ? "Username must be at least 2 characters."
                                : "Required to continue."}
                        </p>
                    </div>

                    {!roleLocked && (
                        <div className="mb-1.5 sm:mb-2">
                            <div className="block text-xs text-white/80 mb-1 text-center">I'm joining as</div>
                            <div className="flex gap-2">
                                {roleBtn("client", "Client")}
                                {roleBtn("artist", "Artist")}
                            </div>
                        </div>
                    )}

                    <div className="mb-1.5 sm:mb-2">
                        {role === "client" ? (
                            <ClientDetailsStep client={client} onChange={handleClient} />
                        ) : (
                            <ArtistDetailsStep artist={artist} onChange={handleArtist} />
                        )}
                    </div>

                    {role === "artist" && artist.styles.length < 1 && (
                        <p className="mb-1.5 sm:mb-2 text-center text-[11px] text-app/60">
                            Pick at least one specialty style to continue — or use “Skip now” to set everything to default.
                        </p>
                    )}

                    {underage && (
                        <p className="mb-1.5 sm:mb-2 text-center text-[11px] font-semibold text-app">
                            You must be 18 or older to use Inkmity.
                        </p>
                    )}
                    <label className="mb-1.5 sm:mb-2 flex items-start gap-2 text-[11px] text-app/80 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-neutral-700"
                        />
                        <span>
                            I'm 18 or older and agree to Inkmity's{" "}
                            <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline text-app hover:opacity-80">Terms</a>{" "}
                            &amp;{" "}
                            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline text-app hover:opacity-80">Privacy</a>.
                        </span>
                    </label>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            onClick={() => finish(true)}
                            disabled={submitting || !usernameValid || !canContinue}
                            className="h-9 sm:h-10 rounded-xl px-4 text-sm font-semibold bg-elevated border border-app text-app hover:bg-elevated/70 transition disabled:opacity-50"
                        >
                            Skip now
                        </Button>
                        <Button
                            type="button"
                            onClick={() => finish(false)}
                            disabled={submitting || !usernameValid || !canContinue || (role === "artist" && artist.styles.length < 1)}
                            className="flex-1 h-9 sm:h-10 rounded-xl text-sm font-semibold bg-neutral-700 text-white hover:bg-neutral-600 transition disabled:opacity-50"
                        >
                            {submitting ? "Saving…" : "Continue to dashboard"}
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
