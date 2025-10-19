import { useEffect, useMemo, useState, ChangeEvent, useRef } from "react";
import Header from "@/components/header/Header";
import { ToastContainer, toast, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth, useClerk, useSignUp, useUser } from "@clerk/clerk-react";
import { validateEmail, validatePassword } from "@/utils/validation";
import InfoPanel from "@/components/access/InfoPanel";
import FormCard from "@/components/access/FormCard";
import { container } from "@/components/access/animations";
import { useAlreadySignedInRedirect } from "@/hooks/useAlreadySignedInRedirect";

type Role = "client" | "artist";
type SharedAccount = { firstName: string; lastName: string; email: string; password: string };
type ClientProfile = { budgetMin: string; budgetMax: string; location: string; placement: string; size: string; notes: string };
type ArtistProfile = {
  location: string;
  shop: string;
  years: string;
  baseRate: string;
  bookingPreference?: "open" | "waitlist" | "closed" | "referral" | "guest";
  travelFrequency?: "rare" | "sometimes" | "often" | "touring" | "guest_only";
  instagram: string;
  portfolio: string;
};
type SignUpAttempt = { attemptEmailAddressVerification: (args: { code: string }) => Promise<any> } | null;
type InputLike = { target: { name: string; value: string } };

const LOGOUT_TYPE_KEY = "logoutType";
const LOGIN_TIMESTAMP_KEY = "lastLogin";
const TOAST_H = 72;
const TOAST_GAP = 50;

const RAW_API_BASE = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) || "http://localhost:5005/api";
const API_BASE = RAW_API_BASE.replace(/\/+$/, "");
function apiUrl(path: string, qs?: Record<string, string>) {
  const url = new URL(path.replace(/^\/+/, ""), API_BASE + "/");
  if (qs) Object.entries(qs).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

type TipState = { show: boolean; x: number; y: number };

export default function SignUp() {
  const prefersReduced = !!useReducedMotion();
  const [role, setRole] = useState<Role>("client");
  const [step, setStep] = useState(0);
  const [shared, setShared] = useState<SharedAccount>({ firstName: "", lastName: "", email: "", password: "" });
  const [client, setClient] = useState<ClientProfile>({ budgetMin: "100", budgetMax: "200", location: "", placement: "", size: "", notes: "" });
  const [artist, setArtist] = useState<ArtistProfile>({
    location: "",
    shop: "",
    years: "",
    baseRate: "",
    bookingPreference: "open",
    travelFrequency: "rare",
    instagram: "",
    portfolio: "",
  });
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [signUpAttempt, setSignUpAttempt] = useState<SignUpAttempt>(null);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pwdFocused, setPwdFocused] = useState(false);
  const [mascotError, setMascotError] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { isLoaded, signUp, setActive } = useSignUp();
  const { signOut } = useClerk();
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();

  useAlreadySignedInRedirect({ suppress: awaitingCode });

  const [tip, setTip] = useState<TipState>({ show: false, x: 0, y: 0 });

  useEffect(() => {
    const mm = (e: MouseEvent) => {
      const t = e.target as Element | null;
      const anchor = t?.closest('a[href="/dashboard"]');
      if (anchor) {
        setTip({ show: true, x: e.clientX, y: e.clientY });
      } else {
        setTip((prev) => (prev.show ? { ...prev, show: false } : prev));
      }
    };
    const click = (e: MouseEvent) => {
      const t = e.target as Element | null;
      const anchor = t?.closest('a[href="/dashboard"]');
      if (anchor) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("mousemove", mm, true);
    document.addEventListener("click", click, true);
    return () => {
      document.removeEventListener("mousemove", mm, true);
      document.removeEventListener("click", click, true);
    };
  }, []);

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
    const recomputeFocus = () => {
      const ae = document.activeElement as HTMLInputElement | null;
      setPwdFocused(!!ae && ae.tagName === "INPUT" && ae.name === "password");
    };
    const recomputeShow = () => {
      const input = document.querySelector('input[name="password"]') as HTMLInputElement | null;
      setShowPassword(!!input && input.type === "text");
    };
    const handleFocusIn = () => {
      recomputeFocus();
      recomputeShow();
    };
    const handleFocusOut = () => {
      setTimeout(() => {
        recomputeFocus();
        recomputeShow();
      }, 0);
    };
    const handleClickOrInput = () => {
      recomputeShow();
    };
    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("focusout", handleFocusOut, true);
    document.addEventListener("click", handleClickOrInput, true);
    document.addEventListener("input", handleClickOrInput, true);
    return () => {
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("focusout", handleFocusOut, true);
      document.removeEventListener("click", handleClickOrInput, true);
      document.removeEventListener("input", handleClickOrInput, true);
    };
  }, []);

  useEffect(() => {
    setEmailTaken(false);
    if (abortRef.current) abortRef.current.abort();
    const email = shared.email.trim().toLowerCase();
    if (!validateEmail(email)) return;
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [shared.email]);

  const handleClient = (e: ChangeEvent<HTMLInputElement> | InputLike) => {
    const name = (e as InputLike).target?.name;
    const value = (e as InputLike).target?.value;
    if (!name) return;
    setClient((prev) => ({ ...prev, [name]: value }));
  };
  const handleArtist = (e: ChangeEvent<HTMLInputElement>) => setArtist({ ...artist, [e.target.name]: e.target.value });

  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const minVal = Math.max(0, Math.min(5000, num(client.budgetMin)));
  const maxVal = Math.max(0, Math.min(5000, num(client.budgetMax)));

  const allSharedValid = validateEmail(shared.email) && validatePassword(shared.password) && !!shared.firstName.trim() && !!shared.lastName.trim();
  const allClientValid = !!client.location && maxVal > minVal;
  const allArtistValid = !!artist.location && artist.location !== "__unset__" && !!artist.years && artist.years !== "__unset__" && !!artist.baseRate && artist.baseRate !== "__unset__";

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

  const triggerMascotError = () => {
    setMascotError(true);
    window.setTimeout(() => setMascotError(false), 900);
  };

  const toastAndRedirectToLogin = () => {
    toast.error(
      <span>
        This email is already registered. Redirecting to <a className="underline" href="/login">Login</a>…
      </span>,
      { position: "top-center", theme: "dark" }
    );
    const loginUrl = "/login";
    setTimeout(() => {
      window.location.href = loginUrl;
    }, 1400);
  };

  const blockIfEmailTaken = () => {
    if (emailTaken) {
      triggerMascotError();
      toastAndRedirectToLogin();
      return true;
    }
    return false;
  };

  const handleNext = () => {
    if (blockIfEmailTaken()) return;
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
    if (blockIfEmailTaken()) return;
    if (!allSharedValid) {
      toast.error("Please complete account details", { position: "top-center", theme: "dark" });
      triggerMascotError();
      return;
    }
    if (!isLoaded || !signUp) {
      toast.error("Sign up is still loading. Please try again in a moment.", { position: "top-center", theme: "dark" });
      return;
    }
    setLoading(true);
    try {
      if (isSignedIn) {
        await signOut();
      }
      const attempt = await signUp.create({
        emailAddress: shared.email,
        password: shared.password,
        publicMetadata: { role, firstName: shared.firstName, lastName: shared.lastName, profile: role === "client" ? client : artist },
      } as any);
      setSignUpAttempt(attempt as unknown as { attemptEmailAddressVerification: (args: { code: string }) => Promise<any> });
      setAwaitingCode(true);
      await attempt.prepareEmailAddressVerification({ strategy: "email_code" });
      toast.info("Verification code sent to your email!", { position: "top-center", theme: "dark" });
    } catch (err: any) {
      setAwaitingCode(false);
      const code = err?.errors?.[0]?.code;
      if (code === "identifier_already_exists") {
        setEmailTaken(true);
        triggerMascotError();
        toastAndRedirectToLogin();
        setLoading(false);
        return;
      }
      toast.error(err.errors?.[0]?.message || err.message || "An unexpected error occurred", { position: "top-center", theme: "dark" });
      triggerMascotError();
    } finally {
      setLoading(false);
    }
  };

  const syncUserToBackend = async (r: Role) => {
    const getJwt = async () => {
      let attempts = 0;
      while (attempts < 8) {
        const t = await getToken().catch(() => null);
        if (t) return t;
        await new Promise((res) => setTimeout(res, 150));
        attempts++;
      }
      return null;
    };

    const token = await getJwt();
    const clientPayload = (() => {
      if (r !== "client") return undefined;
      const minNum = Math.max(0, Math.min(5000, Number(client.budgetMin || 100)));
      const maxNum = Math.max(0, Math.min(5000, Number(client.budgetMax || 200)));
      const normMin = Number.isFinite(minNum) ? minNum : 100;
      const normMax = Number.isFinite(maxNum) && maxNum > normMin ? maxNum : 200;
      return { ...client, budgetMin: String(normMin), budgetMax: String(normMax) };
    })();

    const payload: any = {
      email: shared.email,
      role: r,
      firstName: shared.firstName,
      lastName: shared.lastName,
      profile: r === "client" ? clientPayload : { ...artist },
    };

    const res = await fetch(apiUrl("/users/sync"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      credentials: "include",
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
        localStorage.setItem("trustedDevice", shared.email);
        localStorage.setItem(LOGIN_TIMESTAMP_KEY, Date.now().toString());
        localStorage.removeItem(LOGOUT_TYPE_KEY);

        await syncUserToBackend(role);

        toast.success("Signup successful! Redirecting...", { position: "top-center", theme: "dark" });
        window.location.href = "/dashboard";
        return;
      }

      toast.error("Verification failed. Check your code and try again.", { position: "top-center", theme: "dark" });
      triggerMascotError();
      try { await signOut(); } catch { }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message || err?.message || "An unexpected error occurred";
      if (String(msg).startsWith("Sync failed")) {
        toast.error("We couldn't finish setting up your account. Please try again.", { position: "top-center", theme: "dark" });
      } else {
        toast.error(msg, { position: "top-center", theme: "dark" });
      }
      triggerMascotError();

      try { await signOut(); } catch { }
    } finally {
      setLoading(false);
    }
  };


  const mascotEyesClosed = showPassword || pwdFocused;
  const handlePasswordVisibilityChange = (hidden: boolean) => setShowPassword(!hidden);

  const checkEmailExists = async (emailParam?: string, showToast = true) => {
    const email = (emailParam ?? shared.email).trim().toLowerCase();
    if (!validateEmail(email)) {
      setEmailTaken(false);
      return;
    }
    try {
      setCheckingEmail(true);
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const endpoint = apiUrl("/auth/check-email", { email });
      const res = await fetch(endpoint, { signal: ac.signal, credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { exists?: boolean };
      if (data.exists) {
        setEmailTaken(true);
        if (showToast) {
          triggerMascotError();
          toastAndRedirectToLogin();
        }
      } else {
        setEmailTaken(false);
      }
    } catch {
      setEmailTaken(false);
    } finally {
      setCheckingEmail(false);
    }
  };

  const onEmailBlur = () => checkEmailExists(shared.email, true);

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
                  loading={loading || checkingEmail}
                  isLoaded={isLoaded}
                  onNext={handleNext}
                  onBack={handleBack}
                  onStartVerification={startVerification}
                  onVerify={verifyCode}
                  onPasswordVisibilityChange={handlePasswordVisibilityChange}
                  onEmailBlur={onEmailBlur}
                  emailTaken={emailTaken}
                  className=""
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
      {(!isSignedIn && tip.show) && (
        <div className="fixed z-[70] pointer-events-none" style={{ left: tip.x, top: tip.y, transform: "translate(-50%, 20px)" }}>
          <div className="relative rounded-lg border border-app bg-card/95 backdrop-blur px-2.5 py-1.5 shadow-lg">
            <span className="pointer-events-none absolute left-1/2 -top-1.5 -translate-x-1/2 h-3 w-3 rotate-45 bg-card border-l border-t border-app" />
            <span className="text-xs text-app whitespace-nowrap">Login to access your dashboard</span>
          </div>
        </div>
      )}
    </div>
  );
}