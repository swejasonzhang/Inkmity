import { useEffect, useMemo, useState, ChangeEvent, useRef } from "react";
import Header from "@/components/header/Header";
import { ToastContainer, toast, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, useReducedMotion } from "framer-motion";
import { useClerk, useSignUp, useAuth } from "@clerk/clerk-react";
import type { SignUpResource } from "@clerk/types";
import { validateEmail, validatePassword } from "@/lib/utils";
import InfoPanel from "@/components/access/InfoPanel";
import FormCard from "@/components/access/FormCard";
import { container } from "@/components/access/animations";
import { useNavigate } from "react-router-dom";

type Role = "client" | "artist";
type SharedAccount = { username: string; email: string; password: string };
type ClientProfile = { budgetMin: string; budgetMax: string; location: string; placement: string; size: string; notes: string; bio?: string };
type ArtistProfile = {
  location: string;
  shop: string;
  years: string;
  baseRate: string;
  bookingPreference?: "open" | "waitlist" | "closed" | "referral" | "guest";
  travelFrequency?: "rare" | "sometimes" | "often" | "touring" | "guest_only";
  portfolio: string;
  styles: string[];
  bio?: string;
};
type InputLike = { target: { name: string; value: string } };

const LOGOUT_TYPE_KEY = "logoutType";
const LOGIN_TIMESTAMP_KEY = "lastLogin";
const JUST_SIGNED_UP_KEY = "ink.justSignedUpAt";
const SUPPRESS_MS = 120000;
const TOAST_H = 72;
const TOAST_GAP = 50;

const RAW_API_BASE = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) || "http://localhost:5005/api";
const API_BASE = RAW_API_BASE.replace(/\/+$/, "");
function apiUrl(path: string, qs?: Record<string, string>) {
  const url = new URL(path.replace(/^\/+/, ""), API_BASE + "/");
  if (qs) Object.entries(qs).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

function friendlyClerkMessage(code?: string, message?: string) {
  if (!code && message) return message;
  switch (code) {
    case "too_many_requests":
      return "Too many attempts. Try again shortly.";
    case "identifier_already_exists":
      return "This email is already registered.";
    case "form_param_unknown":
      return "One of the fields is not allowed. Please try again.";
    case "invalid_password":
      return "Password does not meet the requirements.";
    case "form_code_incorrect":
      return "Incorrect code. Check your email and try again.";
    case "form_code_expired":
      return "Code expired. Request a new one.";
    default:
      return message || "Something went wrong. Please try again.";
  }
}

export default function SignUp() {
  const prefersReduced = !!useReducedMotion();
  const [role, setRole] = useState<Role>("client");
  const [step, setStep] = useState(0);
  const [shared, setShared] = useState<SharedAccount>({ username: "", email: "", password: "" });
  const [client, setClient] = useState<ClientProfile>({ budgetMin: "100", budgetMax: "200", location: "", placement: "", size: "", notes: "", bio: "" });
  const [artist, setArtist] = useState<ArtistProfile>({
    location: "",
    shop: "",
    years: "",
    baseRate: "",
    bookingPreference: "open",
    travelFrequency: "rare",
    portfolio: "",
    styles: [],
    bio: "",
  });
  const [clientRefs, setClientRefs] = useState<string[]>(["", "", ""]);
  const [artistPortfolioImgs, setArtistPortfolioImgs] = useState<string[]>(["", "", ""]);
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [signUpAttempt, setSignUpAttempt] = useState<SignUpResource | null>(null);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pwdFocused, setPwdFocused] = useState(false);
  const [mascotError, setMascotError] = useState(false);
  const { isLoaded, signUp, setActive } = useSignUp();
  const { signOut } = useClerk();
  const { isLoaded: authLoaded, userId, getToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoaded) return;
    if (userId) {
      const just = Number(localStorage.getItem(JUST_SIGNED_UP_KEY) || 0);
      const suppress = just && Date.now() - just < SUPPRESS_MS;
      if (!suppress) {
        toast.info("You are already loggedin. Redirecting you to Dashboard now.", { position: "top-center", theme: "dark" });
        const t = setTimeout(() => navigate("/dashboard", { replace: true }), 1000);
        return () => clearTimeout(t);
      }
    }
  }, [authLoaded, userId, navigate]);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const [toastTop, setToastTop] = useState<number | undefined>(undefined);

  useEffect(() => {
    const t = setTimeout(() => setShowInfo(true), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const updateTop = () => {
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const top = Math.max(12, Math.floor(rect.top) - TOAST_H - TOAST_GAP);
      setToastTop(top);
    };
    updateTop();
    const onEvents = ["resize", "scroll"];
    onEvents.forEach((evt) => window.addEventListener(evt, updateTop, { passive: true }));
    const ro = new ResizeObserver(updateTop);
    if (cardRef.current) ro.observe(cardRef.current);
    return () => {
      onEvents.forEach((evt) => window.removeEventListener(evt, updateTop));
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const onFocus = () => {
      const ae = document.activeElement as HTMLInputElement | null;
      setPwdFocused(!!(ae && ae.tagName === "INPUT" && ae.name === "password"));
    };
    const onClickOrInput = () => {
      const input = document.querySelector('input[name="password"]') as HTMLInputElement | null;
      setShowPassword(!!(input && input.type === "text"));
    };
    document.addEventListener("focusin", onFocus, true);
    document.addEventListener("focusout", () => setTimeout(onFocus, 0), true);
    document.addEventListener("click", onClickOrInput, true);
    document.addEventListener("input", onClickOrInput, true);
    return () => {
      document.removeEventListener("focusin", onFocus, true);
      document.removeEventListener("focusout", () => setTimeout(onFocus, 0), true);
      document.removeEventListener("click", onClickOrInput, true);
      document.removeEventListener("input", onClickOrInput, true);
    };
  }, []);

  const handleClient = (e: ChangeEvent<HTMLInputElement> | InputLike) => {
    const name = (e as InputLike).target?.name;
    const value = (e as InputLike).target?.value;
    if (!name) return;
    setClient((prev) => ({ ...prev, [name]: value }));
  };

  const handleArtist = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    if (name === "stylesCSV") {
      const arr = value.split(",").map((s) => s.trim()).filter(Boolean);
      setArtist((prev) => ({ ...prev, styles: arr }));
    } else {
      setArtist((prev) => ({ ...prev, [name]: value }));
    }
  };

  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const minVal = Math.max(0, Math.min(5000, num(client.budgetMin)));
  const maxVal = Math.max(0, Math.min(5000, num(client.budgetMax)));

  const allSharedValid = validateEmail(shared.email) && validatePassword(shared.password) && !!shared.username.trim();
  const allClientValid = !!client.location && maxVal > minVal;
  const allArtistValid =
    !!artist.location &&
    artist.location !== "__unset__" &&
    !!artist.years &&
    artist.years !== "__unset__" &&
    !!artist.baseRate &&
    artist.baseRate !== "__unset__" &&
    Array.isArray(artist.styles) &&
    artist.styles.length >= 1;

  const slides = useMemo<{ key: string; valid: boolean }[]>(() => {
    return role === "client"
      ? [
        { key: "role", valid: allSharedValid },
        { key: "client-1", valid: allClientValid },
        { key: "upload", valid: true },
        { key: "review", valid: allSharedValid && allClientValid },
      ]
      : [
        { key: "role", valid: allSharedValid },
        { key: "artist-1", valid: allArtistValid },
        { key: "upload", valid: true },
        { key: "review", valid: allSharedValid && allArtistValid },
      ];
  }, [role, allSharedValid, allClientValid, allArtistValid]);

  const isLastFormSlide = step === slides.length - 1;

  const triggerMascotError = () => {
    setMascotError(true);
    window.setTimeout(() => setMascotError(false), 900);
  };

  const handleNext = () => {
    const currentValid = slides[step].valid;
    if (!currentValid) {
      toast.error("Please complete the required fields", { position: "top-center", theme: "dark" });
      triggerMascotError();
      return;
    }
    if (!isLastFormSlide) setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const startVerification = async () => {
    if (loading) return;
    if (!allSharedValid) {
      toast.error("Please complete account details", { position: "top-center", theme: "dark" });
      triggerMascotError();
      return;
    }
    if (!isLoaded || !signUp) {
      toast.error("Sign up is still loading. Try again.", { position: "top-center", theme: "dark" });
      return;
    }
    setLoading(true);
    try {
      if (userId) await signOut();
      const profile =
        role === "client"
          ? { ...client, referenceImages: clientRefs.filter(Boolean) }
          : { ...artist, portfolioImages: artistPortfolioImgs.filter(Boolean) };

      const attempt =
        signUpAttempt ??
        (await signUp.create({
          emailAddress: shared.email.trim().toLowerCase(),
          password: shared.password,
          publicMetadata: {
            role,
            displayName: shared.username.trim(),
            profile,
          },
        } as any));
      setSignUpAttempt(attempt as SignUpResource);
      setAwaitingCode(true);
      await attempt.prepareEmailAddressVerification({ strategy: "email_code" });
      toast.info("Verification code sent.", { position: "top-center", theme: "dark" });
    } catch (err: any) {
      setAwaitingCode(false);
      const e = Array.isArray(err?.errors) && err.errors.length ? err.errors[0] : null;
      const code = e?.code || err?.code;
      const msg = e?.message || err?.message;
      toast.error(friendlyClerkMessage(code, msg), { position: "top-center", theme: "dark" });
      triggerMascotError();
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code.trim()) {
      toast.error("Enter the verification code", { position: "top-center", theme: "dark" });
      triggerMascotError();
      return;
    }
    if (!signUpAttempt) {
      toast.error("Verification isn't ready yet. Please request a new code.", { position: "top-center", theme: "dark" });
      triggerMascotError();
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
        try {
          const token = await getToken();
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (token) headers.Authorization = `Bearer ${token}`;

          const basePayload = {
            email: shared.email.trim().toLowerCase(),
            role,
            username: shared.username.trim(),
            bio: (role === "client" ? client.bio : artist.bio) || "",
          };

          const payload =
            role === "client"
              ? {
                ...basePayload,
                profile: { ...client, referenceImages: clientRefs.filter(Boolean) },
              }
              : {
                ...basePayload,
                profile: { ...artist, portfolioImages: artistPortfolioImgs.filter(Boolean) },
              };

          const syncRes = await fetch(apiUrl("/users/sync"), {
            method: "POST",
            credentials: "include",
            headers,
            body: JSON.stringify(payload),
          });
          if (!syncRes.ok) throw new Error("sync_failed");

          const meRes = await fetch(apiUrl("/users/me"), {
            method: "GET",
            credentials: "include",
            headers,
          });
          if (!meRes.ok) throw new Error("me_not_found");
          const me = await meRes.json();
          if (!me?._id) throw new Error("me_missing_id");

          if (role === "client") {
            const urls = clientRefs.filter(Boolean).slice(0, 3);
            if (urls.length) {
              await fetch(apiUrl("/users/me/references"), {
                method: "PUT",
                credentials: "include",
                headers,
                body: JSON.stringify({ urls }),
              });
            }
          }

          try {
            localStorage.setItem(JUST_SIGNED_UP_KEY, String(Date.now()));
          } catch { }

          toast.success("Sign up successful, redirecting to Dashboard.", { position: "top-center", theme: "dark" });
          setTimeout(() => {
            navigate("/dashboard", { replace: true });
          }, 1000);
          localStorage.setItem("trustedDevice", shared.email);
          localStorage.setItem(LOGIN_TIMESTAMP_KEY, Date.now().toString());
          localStorage.removeItem(LOGOUT_TYPE_KEY);
          return;
        } catch {
          toast.error("Failed to save your account. Please try again.", { position: "top-center", theme: "dark" });
          try {
            await signOut();
          } catch { }
          return;
        }
      }
      toast.error("Verification failed. Check your code and try again.", { position: "top-center", theme: "dark" });
      triggerMascotError();
      try {
        await signOut();
      } catch { }
    } catch (err: any) {
      const e = Array.isArray(err?.errors) && err.errors.length ? err.errors[0] : null;
      const code = e?.code || err?.code;
      const msg = e?.message || err?.message;
      toast.error(friendlyClerkMessage(code, msg), { position: "top-center", theme: "dark" });
      triggerMascotError();
      try {
        await signOut();
      } catch { }
    } finally {
      setLoading(false);
    }
  };

  const mascotEyesClosed = showPassword && pwdFocused;
  const handlePasswordVisibilityChange = (hidden: boolean) => setShowPassword(!hidden);

  const bio = role === "client" ? client.bio || "" : artist.bio || "";
  const setBio = (v: string) => {
    if (role === "client") setClient((prev) => ({ ...prev, bio: v }));
    else setArtist((prev) => ({ ...prev, bio: v }));
  };

  return (
    <div className="relative min-h-dvh text-app flex flex-col overflow-hidden">
      <video autoPlay loop muted playsInline preload="auto" className="fixed inset-0 w-full h-full object-cover pointer-events-none z-0" aria-hidden>
        <source src="/Background.mp4" type="video/mp4" />
      </video>
      <Header />
      <main className="relative z-10 flex-1 min-h-0 grid place-items-center px-4 py-4 md:px-0 md:py-0">
        <div className="mx-auto w-full max-w-5xl flex items-center justify-center px-1 md:px-0">
          <motion.div variants={container} initial="hidden" animate="show" className="w-full">
            <div className={`relative grid w-full p-2 gap-0 md:p-0 md:gap-0 ${showInfo ? "md:grid-cols-2 md:place-items-stretch" : "grid-cols-1 place-items-center"}`}>
              {showInfo && (
                <motion.div layout className="flex w-full max-w-xl p-3 mx-0 scale-95 md:p-0 md:mx-0 md:scale-100">
                  <InfoPanel show={showInfo} prefersReduced={prefersReduced} hasError={mascotError} isPasswordHidden={mascotEyesClosed} mode="signup" />
                </motion.div>
              )}
              <motion.div ref={cardRef} layout className="w-full max-w-xl justify-self-center p-3 mx-0 scale-95 md:p-0 md:mx-0 md:scale-100">
                <FormCard
                  mode="signup"
                  showInfo={showInfo}
                  hasError={mascotError}
                  role={role}
                  setRole={setRole}
                  step={step}
                  setStep={setStep}
                  slides={slides}
                  shared={shared}
                  client={client}
                  artist={artist}
                  onSharedChange={(e) => setShared({ ...shared, [e.target.name]: e.target.value })}
                  onClientChange={handleClient}
                  onArtistChange={handleArtist}
                  awaitingCode={awaitingCode}
                  code={code}
                  setCode={setCode}
                  loading={loading}
                  isLoaded={isLoaded}
                  onNext={handleNext}
                  onBack={handleBack}
                  onStartVerification={startVerification}
                  onVerify={verifyCode}
                  onPasswordVisibilityChange={handlePasswordVisibilityChange}
                  emailTaken={false}
                  className=""
                  clientRefs={clientRefs}
                  setClientRefs={setClientRefs}
                  artistPortfolioImgs={artistPortfolioImgs}
                  setArtistPortfolioImgs={setArtistPortfolioImgs}
                  onCancelVerification={() => setAwaitingCode(false)}
                  bio={bio}
                  onBioChange={(e) => setBio(e.target.value)}
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </main>
      <ToastContainer
        position="top-center"
        autoClose={1800}
        hideProgressBar
        closeOnClick
        pauseOnHover={false}
        draggable={false}
        limit={1}
        transition={Slide}
        toastClassName="bg-black/80 text-white text-lg font-bold rounded-xl shadow-lg text-center px-5 py-3 min-w-[280px] flex items-center justify-center border border-white/10"
        style={{ top: toastTop !== undefined ? toastTop : 12 }}
      />
    </div>
  );
}