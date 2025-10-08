import { useEffect, useMemo, useState, ChangeEvent } from "react";
import Header from "@/components/header/Header";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { Variants, Transition } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, useClerk, useSignUp, useUser } from "@clerk/clerk-react";
import { validateEmail, validatePassword } from "@/utils/validation";
import SharedAccountStep from "@/components/steps/SharedAccountStep";
import ClientDetailsStep from "@/components/steps/ClientDetailsStep";
import ArtistDetailsStep from "@/components/steps/ArtistDetailsStep";
import ReviewStep from "@/components/steps/ReviewStep";
import OtpStep from "@/components/steps/OtpStep";

type Role = "client" | "artist";
type SharedAccount = { username: string; email: string; password: string };
type ClientProfile = { budget: string; location: string; placement: string; size: string; notes: string };
type ArtistProfile = { location: string; shop: string; years: string; baseRate: string; instagram: string; portfolio: string };
type SignUpAttempt = { attemptEmailAddressVerification: (args: { code: string }) => Promise<any> } | null;

const LOGOUT_TYPE_KEY = "logoutType";
const LOGIN_TIMESTAMP_KEY = "lastLogin";

const spring: Transition = { type: "spring", stiffness: 220, damping: 24, mass: 0.9 };
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};
const container: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } } };

export default function SignUp() {
  const prefersReduced = useReducedMotion();
  const [role, setRole] = useState<Role>("client");
  const [step, setStep] = useState(0);
  const [shared, setShared] = useState<SharedAccount>({ username: "", email: "", password: "" });
  const [client, setClient] = useState<ClientProfile>({ budget: "", location: "", placement: "", size: "", notes: "" });
  const [artist, setArtist] = useState<ArtistProfile>({ location: "", shop: "", years: "", baseRate: "", instagram: "", portfolio: "" });
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [signUpAttempt, setSignUpAttempt] = useState<SignUpAttempt>(null);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");

  const { isLoaded, signUp, setActive } = useSignUp();
  const { signOut } = useClerk();
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    const logoutType = localStorage.getItem(LOGOUT_TYPE_KEY);
    const lastLogin = localStorage.getItem(LOGIN_TIMESTAMP_KEY);
    if (isSignedIn && !awaitingCode) {
      const within3Days = lastLogin && Date.now() - parseInt(lastLogin, 10) <= 3 * 24 * 60 * 60 * 1000;
      if (within3Days && logoutType !== "manual") {
        toast.info("You are already signed in! Redirecting to dashboard...", { position: "top-center", theme: "dark" });
      }
    }
  }, [isSignedIn, awaitingCode]);

  const handleShared = (e: ChangeEvent<HTMLInputElement>) => setShared({ ...shared, [e.target.name]: e.target.value });
  const handleClient = (e: ChangeEvent<HTMLInputElement>) => setClient({ ...client, [e.target.name]: e.target.value });
  const handleArtist = (e: ChangeEvent<HTMLInputElement>) => setArtist({ ...artist, [e.target.name]: e.target.value });

  const allSharedValid = validateEmail(shared.email) && validatePassword(shared.password) && !!shared.username.trim();
  const allClientValid = !!client.budget && !!client.location;
  const allArtistValid = !!artist.location && !!artist.years && !!artist.baseRate;

  const slides = useMemo(() => {
    if (role === "client") {
      return [
        { key: "role", valid: allSharedValid },
        { key: "client-1", valid: allClientValid },
        { key: "review", valid: allSharedValid && allClientValid },
      ] as const;
    }
    return [
      { key: "role", valid: allSharedValid },
      { key: "artist-1", valid: allArtistValid },
      { key: "review", valid: allSharedValid && allArtistValid },
    ] as const;
  }, [role, allSharedValid, allClientValid, allArtistValid]);

  const isLastFormSlide = step === slides.length - 1;

  const handleNext = () => {
    const currentValid = slides[step].valid;
    if (!currentValid) {
      toast.error("Please complete the required fields", { position: "top-center", theme: "dark" });
      return;
    }
    if (!isLastFormSlide) setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const startVerification = async () => {
    if (!allSharedValid) {
      toast.error("Please complete account details", { position: "top-center", theme: "dark" });
      return;
    }
    if (!isLoaded || !signUp) {
      toast.error("Sign up is still loading. Please try again in a moment.", { position: "top-center", theme: "dark" });
      return;
    }
    setLoading(true);
    try {
      await signOut();
      const attempt = await signUp.create({
        emailAddress: shared.email,
        password: shared.password,
        publicMetadata: { role, username: shared.username, profile: role === "client" ? client : artist },
      } as any);
      await attempt.prepareEmailAddressVerification();
      setSignUpAttempt(attempt as unknown as { attemptEmailAddressVerification: (args: { code: string }) => Promise<any> });
      setAwaitingCode(true);
      toast.info("Verification code sent to your email!", { position: "top-center", theme: "dark" });
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message || err.message || "An unexpected error occurred", { position: "top-center", theme: "dark" });
    } finally {
      setLoading(false);
    }
  };

  const syncUserToBackend = async (r: Role) => {
    const token = await getToken();
    const clerkId = user?.id ?? undefined;
    const payload: any = {
      clerkId,
      email: shared.email,
      role: r,
      username: shared.username,
      profile: r === "client" ? { ...client } : { ...artist },
    };
    const res = await fetch("http://localhost:5005/api/users/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Sync failed ${res.status}: ${t}`);
    }
    return res.json();
  };

  const verifyCode = async () => {
    if (!code.trim()) {
      toast.error("Enter the verification code", { position: "top-center", theme: "dark" });
      return;
    }
    if (!signUpAttempt) {
      toast.error("Verification isn't ready yet. Please request a new code.", { position: "top-center", theme: "dark" });
      return;
    }
    if (!isLoaded || !setActive) {
      toast.error("Account session is still loading. Please try again in a moment.", { position: "top-center", theme: "dark" });
      return;
    }
    setLoading(true);
    try {
      const result = await signUpAttempt.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        localStorage.setItem("trustedDevice", shared.email);
        localStorage.setItem(LOGIN_TIMESTAMP_KEY, Date.now().toString());
        localStorage.removeItem(LOGOUT_TYPE_KEY);
        try {
          await syncUserToBackend(role);
          toast.success("Signup successful! Redirecting...", { position: "top-center", theme: "dark" });
          window.location.href = "/dashboard";
        } catch {
          toast.error("Signed up but failed to sync user. You can continue; some features may be limited.", { position: "top-center", theme: "dark" });
          window.location.href = "/dashboard";
        }
      } else {
        toast.error("Verification failed. Check your code and try again.", { position: "top-center", theme: "dark" });
      }
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message || err.message || "An unexpected error occurred", { position: "top-center", theme: "dark" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh text-app flex flex-col overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="fixed inset-0 z-0 h-full w-full object-cover pointer-events-none"
        aria-hidden
      >
        <source src="/Background.mp4" type="video/mp4" />
      </video>

      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_10%,rgba(255,255,255,0.08),transparent_60%)]" />
        {!prefersReduced && (
          <>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 0.6, scale: 1 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} className="absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl bg-rose-500/20" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 0.5, scale: 1 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }} className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full blur-3xl bg-indigo-500/20" />
          </>
        )}
        <div className="absolute inset-0 bg-black/50" />
      </div>

      <Header disableDashboardLink />

      <main className="flex-1 grid place-items-center px-4 py-10">
        <motion.div variants={container} initial="hidden" animate="show" className="w-full max-w-md mx-4 relative">
          <motion.div layout transition={spring} className="relative rounded-3xl p-[1px] bg-gradient-to-br from-white/30 via-white/10 to-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_10px_40px_-12px_rgba(0,0,0,0.5)]">
            <div className="rounded-3xl bg-[#0b0b0b]/70 backdrop-blur-xl p-7 sm:p-8">
              <motion.div variants={fadeUp} className="mb-4 flex items-center justify-center gap-2 text-white/80">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Join the Inkmity community</span>
                </div>
              </motion.div>

              <div className="text-center">
                <h1 className="text-3xl font-semibold text-white">Sign up</h1>
                <p className="text-white/60 mt-2">A few quick steps to personalize your experience.</p>
              </div>

              <div className="mt-6">
                <div className="mb-4 flex items-center justify-between text-xs text-white/70">
                  <div className="flex items-center gap-2">
                    {Array.from({ length: slides.length }).map((_, i) => (
                      <div key={i} className={`h-2 w-2 rounded-full ${step >= i ? "bg-white" : "bg-white/30"}`} />
                    ))}
                    {awaitingCode && <div className="h-2 w-2 rounded-full bg-emerald-400" />}
                  </div>
                  <span className="text-white/50">{awaitingCode ? "Verify" : `Step ${step + 1} of ${slides.length}`}</span>
                </div>

                <div className="relative overflow-hidden">
                  <AnimatePresence initial={false} mode="wait">
                    {!awaitingCode ? (
                      <motion.div
                        key={slides[step].key}
                        initial={{ x: 40, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -40, opacity: 0 }}
                        transition={{ type: "tween", duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="grid gap-5"
                      >
                        {slides[step].key === "role" && (
                          <SharedAccountStep role={role} setRole={setRole} shared={shared} onChange={handleShared} />
                        )}
                        {slides[step].key === "client-1" && <ClientDetailsStep client={client} onChange={handleClient} />}
                        {slides[step].key === "artist-1" && <ArtistDetailsStep artist={artist} onChange={handleArtist} />}
                        {slides[step].key === "review" && <ReviewStep role={role} shared={shared} client={client} artist={artist} />}

                        <div className="flex items-center gap-3 mt-2">
                          <Button type="button" onClick={handleBack} disabled={step === 0} className="bg-white/10 hover:bg-white/20 text-white w-28">
                            Back
                          </Button>
                          {step < slides.length - 1 && (
                            <Button type="button" onClick={handleNext} className="bg-white/15 hover:bg-white/25 text-white flex-1">
                              Next
                            </Button>
                          )}
                          {step === slides.length - 1 && (
                            <Button type="button" onClick={startVerification} className="bg-white/15 hover:bg-white/25 text-white flex-1" disabled={loading || !isLoaded}>
                              Send Verification Code
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="otp"
                        initial={{ x: 40, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -40, opacity: 0 }}
                        transition={{ type: "tween", duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="grid gap-5"
                      >
                        <OtpStep code={code} setCode={setCode} onBack={() => setAwaitingCode(false)} onVerify={verifyCode} loading={loading || !isLoaded} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <p className="text-white/60 text-center text-sm mt-4">
                  Already have an account? <a href="/login" className="underline hover:opacity-80">Login</a>
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>

      <ToastContainer position="top-center" autoClose={2000} hideProgressBar closeOnClick pauseOnHover={false} draggable={false} toastClassName="bg-black/80 text-white text-base rounded-xl shadow-lg text-center px-5 py-3 min-w-[280px] flex items-center justify-center border border-white/10" />
    </div>
  );
}