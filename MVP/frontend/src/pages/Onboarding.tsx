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

type Role = "client" | "artist";

const CLIENT_DEFAULTS = { budgetMin: "100", budgetMax: "200", location: "New York, NY", placement: "", size: "", style: "all", availability: "all" };
const ARTIST_DEFAULTS = { location: "New York, NY", years: "0", baseRate: "100", bookingPreference: "open" as const, travelFrequency: "rare" as const, portfolio: "", styles: [] as string[], bio: "" };

export default function Onboarding() {
    const navigate = useNavigate();
    const { isLoaded, isSignedIn, user } = useUser();
    const { getToken, signOut } = useAuth();

    const [checking, setChecking] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [username, setUsername] = useState("");
    const [role, setRole] = useState<Role>("client");

    const usernameValid = username.trim().length >= 2;
    const [client, setClient] = useState({ ...CLIENT_DEFAULTS });
    const [artist, setArtist] = useState({ ...ARTIST_DEFAULTS });

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
                if (me?.onboardingComplete === true) navigate("/dashboard", { replace: true });
                else setChecking(false);
            } catch {
                if (active) setChecking(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [isLoaded, isSignedIn, getToken, navigate]);

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
        setSubmitting(true);
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
                          bookingPreference: (src as typeof artist)?.bookingPreference || "open",
                          travelFrequency: (src as typeof artist)?.travelFrequency || "rare",
                          styles: (src as typeof artist)?.styles || [],
                          bio: (src as typeof artist)?.bio || "",
                      }
                    : {
                          budgetMin: Number((src as typeof client)?.budgetMin) || 100,
                          budgetMax: Number((src as typeof client)?.budgetMax) || 200,
                          location: (src as typeof client)?.location || "New York, NY",
                          placement: (src as typeof client)?.placement || "",
                          size: (src as typeof client)?.size || "",
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
            navigate("/dashboard", { replace: true });
        } catch {
            setSubmitting(false);
        }
    };

    if (!isLoaded || checking) {
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

    const roleBtn = (r: Role, label: string) => (
        <Button
            type="button"
            variant="secondary"
            onClick={() => setRole(r)}
            className={`flex-1 h-10 rounded-xl text-sm ${role === r ? "bg-white/20 text-white" : "bg-white/10 text-white/80"}`}
        >
            {label}
        </Button>
    );

    return (
        <div className="relative h-svh overflow-hidden flex flex-col text-app">
            <VideoBackground />
            <Header />
            <main className="flex-1 min-h-0 flex items-center justify-center px-4 sm:px-6 py-3 overflow-hidden">
                <div className="w-full max-w-xl mx-auto max-h-full overflow-hidden rounded-2xl bg-card border border-app p-4 sm:p-5">
                    <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center">
                        <p className="text-[11px] sm:text-xs font-semibold text-amber-300">
                            Finish setting up your account to continue.
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-amber-200/80 mt-0.5">
                            You'll be brought back here until your profile is complete.
                        </p>
                    </div>
                    <div className="text-center mb-3">
                        <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-app">Choose your username</h1>
                        <p className="text-subtle text-[11px] sm:text-xs mt-0.5">A username is required to finish creating your account.</p>
                    </div>

                    <div className="mb-3">
                        <label htmlFor="onboard-username" className="block text-xs text-white/80 mb-1 text-center">
                            Username <span className="text-red-400">*</span> <span className="text-app/50">(required)</span>
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
                            className={`h-10 rounded-xl text-center ${!usernameValid && username.length > 0 ? "border-red-400" : ""}`}
                        />
                        <p className={`text-[11px] mt-1 text-center ${!usernameValid && username.length > 0 ? "text-red-400" : "text-app/50"}`}>
                            {!usernameValid && username.length > 0
                                ? "Username must be at least 2 characters."
                                : "You must enter a username before you can continue."}
                        </p>
                    </div>

                    <div className="mb-3">
                        <div className="block text-xs text-white/80 mb-1 text-center">I'm joining as</div>
                        <div className="flex gap-2">
                            {roleBtn("client", "Client")}
                            {roleBtn("artist", "Artist")}
                        </div>
                    </div>

                    <div className="mb-3">
                        {role === "client" ? (
                            <ClientDetailsStep client={client} onChange={handleClient} />
                        ) : (
                            <ArtistDetailsStep artist={artist} onChange={handleArtist} />
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            onClick={() => finish(true)}
                            disabled={submitting || !usernameValid}
                            className="h-10 rounded-xl px-4 text-sm font-semibold bg-elevated border border-app text-app hover:bg-elevated/70 transition disabled:opacity-50"
                        >
                            Skip for now
                        </Button>
                        <Button
                            type="button"
                            onClick={() => finish(false)}
                            disabled={submitting || !usernameValid}
                            className="flex-1 h-10 rounded-xl text-sm font-semibold bg-neutral-700 text-white hover:bg-neutral-600 transition disabled:opacity-50"
                        >
                            {submitting ? "Saving…" : "Continue to dashboard"}
                        </Button>
                    </div>

                    <div className="mt-3 text-center">
                        <button
                            type="button"
                            onClick={() => signOut({ redirectUrl: "/login" })}
                            className="text-[11px] text-app/50 hover:text-app/80 underline underline-offset-2 transition"
                        >
                            Not you? Sign out
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
