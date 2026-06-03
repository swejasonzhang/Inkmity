import { useEffect, useMemo, useState, ChangeEvent, useRef } from "react";
import Header from "@/components/header/Header";
import { motion, useReducedMotion } from "framer-motion";
import { useClerk, useSignUp, useAuth } from "@clerk/clerk-react";
import type { SignUpResource } from "@clerk/types";
import { validateEmail, validatePassword } from "@/lib/utils";
import InfoPanel from "@/components/access/InfoPanel";
import SignupFormCard from "@/components/access/SignupFormCard";
import { container } from "@/lib/animations";
import { useNavigate } from "react-router-dom";
import { resetActivityTimer } from "@/hooks/useInactivityLogout";
import { API_URL } from "@/api";
import VideoBackground from "@/components/VideoBackground";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

type Role = "client" | "artist";
type SharedAccount = { username: string; email: string; password: string };
type ClientProfile = { budgetMin: string; budgetMax: string; location: string; placement: string; size: string };
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
function apiUrl(path: string, qs?: Record<string, string>) {
  const url = new URL(path.replace(/^\/+/, ""), API_URL + "/");
  if (qs) Object.entries(qs).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

function collectIssues({ role, step, shared, client, artist, confirmPassword }: { role: Role; step: number; shared: SharedAccount; client: ClientProfile; artist: ArtistProfile; confirmPassword: string }) {
  const tips: string[] = [];
  const emailOk = validateEmail(shared.email);
  const pwdOk = validatePassword(shared.password);
  const usernameOk = !!shared.username.trim();
  const passwordsMatch = shared.password === (confirmPassword || "");
  if (step === 0) {
    if (!usernameOk) tips.push("Username is required — enter a display name.");
    if (!emailOk) tips.push("Email is invalid — use a valid format like name@example.com.");
    if (!pwdOk) tips.push("Password is weak — use at least 8 chars with letters and numbers.");
    if (!passwordsMatch && (confirmPassword || "").trim().length > 0) tips.push("Passwords do not match — ensure both password fields are identical.");
    if ((confirmPassword || "").trim().length === 0 && shared.password.trim().length > 0) tips.push("Please confirm your password.");
    return tips;
  }
  if (role === "client") {
    if (step === 1) {
      if (!client.location) tips.push("City is required — choose your city from the list.");
      const min = Number(client.budgetMin);
      const max = Number(client.budgetMax);
      if (client.budgetMin && !Number.isFinite(min)) tips.push("Budget min must be a number — enter a value like 100.");
      if (client.budgetMax && !Number.isFinite(max)) tips.push("Budget max must be a number — enter a value like 500.");
      if (Number.isFinite(min) && Number.isFinite(max) && max <= min) tips.push("Budget range invalid — set max greater than min by at least 1.");
    }
    if (step === 3) {
      if (!usernameOk) tips.push("Username is required — enter a display name.");
      if (!emailOk) tips.push("Email is invalid — use a valid format like name@example.com.");
      if (!pwdOk) tips.push("Password is weak — use at least 8 chars with letters and numbers.");
      if (!passwordsMatch || !confirmPassword || !confirmPassword.trim()) {
        tips.push("Passwords do not match — ensure both password fields are identical.");
      }
      if (!client.location) tips.push("City is required — choose your city from the list.");
      const min = Number(client.budgetMin);
      const max = Number(client.budgetMax);
      if (client.budgetMin && client.budgetMax && (!Number.isFinite(min) || !Number.isFinite(max) || max <= min)) {
        tips.push("Budget range invalid — ensure both numbers and max > min.");
      }
    }
  } else {
    if (step === 1) {
      if (!artist.location || artist.location === "__unset__") tips.push("Studio city is required — choose your city.");
      if (!Array.isArray(artist.styles) || artist.styles.length < 1) tips.push("Pick one or more styles. At least one is required.");
      if (!artist.years || artist.years === "__unset__" || !Number.isFinite(Number(artist.years))) {
        tips.push("Years of experience is required — select your years of experience.");
      }
      if (!artist.baseRate || artist.baseRate === "__unset__" || !Number.isFinite(Number(artist.baseRate))) {
        tips.push("Base hourly rate is required — choose a rate or enter a custom amount.");
      }
    }
    if (step === 3) {
      if (!usernameOk) tips.push("Username is required — enter a display name.");
      if (!emailOk) tips.push("Email is invalid — use a valid format like name@example.com.");
      if (!pwdOk) tips.push("Password is weak — use at least 8 chars with letters and numbers.");
      if (!passwordsMatch || !confirmPassword || !confirmPassword.trim()) {
        tips.push("Passwords do not match — ensure both password fields are identical.");
      }
      if (!artist.location || artist.location === "__unset__") tips.push("Studio city is required — choose your city.");
      if (!Array.isArray(artist.styles) || artist.styles.length < 1) tips.push("Pick one or more styles. At least one is required.");
      if (!artist.years || artist.years === "__unset__" || !Number.isFinite(Number(artist.years))) {
        tips.push("Years of experience is required — select your years of experience.");
      }
      if (!artist.baseRate || artist.baseRate === "__unset__" || !Number.isFinite(Number(artist.baseRate))) {
        tips.push("Base hourly rate is required — choose a rate or enter a custom amount.");
      }
    }
  }
  return tips;
}

export default function SignUp() {
  const prefersReduced = !!useReducedMotion();
  const [role, setRole] = useState<Role>("client");
  const [step, setStep] = useState(0);
  const [shared, setShared] = useState<SharedAccount>({ username: "", email: "", password: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [client, setClient] = useState<ClientProfile>({ budgetMin: "100", budgetMax: "200", location: "New York, NY", placement: "", size: "" });
  const [artist, setArtist] = useState<ArtistProfile>({ location: "New York, NY", shop: "", years: "0", baseRate: "100", bookingPreference: "open", travelFrequency: "rare", portfolio: "", styles: [], bio: "" });
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
  const [showSuccess, setShowSuccess] = useState(false);
  const [successType, setSuccessType] = useState<"signup" | "already" | null>(null);
  const isMountedRef = useRef(false);
  const justSignedUpRef = useRef(false);
  const redirectTimerRef = useRef<number | null>(null);
  const isRedirectingRef = useRef(false);
  const { isLoaded, signUp, setActive } = useSignUp();
  const { signOut } = useClerk();
  const { userId, getToken, isLoaded: authLoaded } = useAuth();
  const navigate = useNavigate();
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [flashToken, setFlashToken] = useState(0);

  useEffect(() => {
    if (!authLoaded) return;
    if (!userId) {
      if (!isMountedRef.current) {
        isMountedRef.current = true;
      }
      return;
    }
    if (justSignedUpRef.current) {
      justSignedUpRef.current = false;
      return;
    }
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      setShowSuccess(true);
      setSuccessType("already");
      isRedirectingRef.current = true;
      if (redirectTimerRef.current !== null) {
        clearTimeout(redirectTimerRef.current);
      }
      redirectTimerRef.current = window.setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 2000);
    }
  }, [authLoaded, userId, navigate]);

  useEffect(() => {
    const t = setTimeout(() => setShowInfo(true), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null && !isRedirectingRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
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

  const allSharedValid = validateEmail(shared.email) && validatePassword(shared.password) && !!shared.username.trim() && shared.password === confirmPassword;
  const allClientValid = !!client.location;
  const allArtistValid =
    !!artist.location &&
    artist.location !== "__unset__" &&
    Array.isArray(artist.styles) &&
    artist.styles.length >= 1 &&
    !!artist.years &&
    artist.years !== "__unset__" &&
    Number.isFinite(Number(artist.years)) &&
    !!artist.baseRate &&
    artist.baseRate !== "__unset__" &&
    Number.isFinite(Number(artist.baseRate));

  const slides = useMemo<{ key: string; valid: boolean }[]>(() => {
    return role === "client"
      ? [
        { key: "role", valid: allSharedValid },
        { key: "client-1", valid: allClientValid },
        { key: "review", valid: allSharedValid && allClientValid }
      ]
      : [
        { key: "role", valid: allSharedValid },
        { key: "artist-1", valid: allArtistValid },
        { key: "upload", valid: true },
        { key: "review", valid: allSharedValid && allArtistValid }
      ];
  }, [role, allSharedValid, allClientValid, allArtistValid]);

  const isLastFormSlide = step === slides.length - 1;

  const triggerMascotError = () => {
    setMascotError(true);
    window.setTimeout(() => setMascotError(false), 900);
  };

  const computeInvalidForRoleStep = () => {
    const out: string[] = [];
    if (!shared.username.trim()) out.push("username");
    if (!validateEmail(shared.email)) out.push("email");
    if (!validatePassword(shared.password)) out.push("password");
    if (shared.password !== confirmPassword || !confirmPassword.trim()) out.push("confirmPassword");
    return out;
  };

  const handleNext = () => {
    const currentValid = slides[step].valid;
    if (!currentValid) {
      if (slides[step].key === "role") {
        setInvalidFields(computeInvalidForRoleStep());
      } else {
        setInvalidFields([]);
      }
      setFlashToken((t) => t + 1);
      triggerMascotError();
      return;
    }
    setInvalidFields([]);
    if (!isLastFormSlide) setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const startVerification = async () => {
    if (loading) return;
    const tips = collectIssues({ role, step: 3, shared, client, artist, confirmPassword });
    if (tips.length) {
      setInvalidFields([]);
      setFlashToken((t) => t + 1);
      triggerMascotError();
      return;
    }
    if (!isLoaded || !signUp) {
      return;
    }
    setLoading(true);
    setAwaitingCode(true);

    if (userId) {
      signOut().catch(() => { });
    }

    try {
      const profile = role === "client" ? { ...client, referenceImages: clientRefs.filter(Boolean) } : { ...artist, portfolioImages: artistPortfolioImgs.filter(Boolean), shop: undefined };
      const unsafeMetadata = { role, displayName: shared.username.trim(), email: shared.email.trim().toLowerCase(), profile };

      const attempt =
        signUpAttempt ??
        (await signUp.create({ emailAddress: shared.email.trim().toLowerCase(), password: shared.password, unsafeMetadata } as any));
      setSignUpAttempt(attempt as SignUpResource);

      attempt.prepareEmailAddressVerification({ strategy: "email_code" })
        .catch((error) => {
          console.error("Error sending verification code:", error);
          setAwaitingCode(false);
          triggerMascotError();
        })
        .finally(() => {
          setLoading(false);
        });
    } catch (error) {
      console.error("Error in startVerification:", error);
      setAwaitingCode(false);
      setLoading(false);
      triggerMascotError();
    }
  };

  const verifyCode = async () => {
    if (!code.trim()) {
      triggerMascotError();
      return;
    }
    if (!signUpAttempt) {
      triggerMascotError();
      return;
    }
    if (!isLoaded || !setActive) {
      return;
    }
    setLoading(true);
    try {
      const result = await signUpAttempt.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        resetActivityTimer();
        try {
          const token = await getToken();
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (token) headers.Authorization = `Bearer ${token}`;
          const basePayload = { email: shared.email.trim().toLowerCase(), role, username: shared.username.trim(), bio: role === "artist" ? (artist.bio || "") : "" };
          const payload = role === "client" ? { ...basePayload, profile: { ...client, referenceImages: clientRefs.filter(Boolean) } } : { ...basePayload, profile: { ...artist, portfolioImages: artistPortfolioImgs.filter(Boolean) } };
          const syncRes = await fetch(apiUrl("/users/sync"), { method: "POST", credentials: "include", headers, body: JSON.stringify(payload) });
          if (!syncRes.ok) throw new Error("sync_failed");
          const meRes = await fetch(apiUrl("/users/me"), { method: "GET", credentials: "include", headers });
          if (!meRes.ok) throw new Error("me_not_found");
          const me = await meRes.json();
          if (!me?._id) throw new Error("me_missing_id");
          if (role === "client") {
            const urls = clientRefs.filter(Boolean).slice(0, 3);
            if (urls.length) {
              await fetch(apiUrl("/users/me/references"), { method: "PUT", credentials: "include", headers, body: JSON.stringify({ urls }) });
            }
          }
          try {
            localStorage.setItem("trustedDevice", shared.email);
            localStorage.setItem(LOGIN_TIMESTAMP_KEY, Date.now().toString());
            localStorage.removeItem(LOGOUT_TYPE_KEY);
          } catch { }
          justSignedUpRef.current = true;
          isMountedRef.current = true;
          setSuccessType("signup");
          setShowSuccess(true);
          isRedirectingRef.current = true;
          if (redirectTimerRef.current !== null) {
            clearTimeout(redirectTimerRef.current);
          }
          redirectTimerRef.current = window.setTimeout(() => {
            navigate("/dashboard", { replace: true });
          }, 2000);
          return;
        } catch {
          try {
            await signOut();
          } catch { }
          return;
        }
      }
    } catch {
      try {
        await signOut();
      } catch { }
    } finally {
      setLoading(false);
    }
    triggerMascotError();
  };

  const mascotEyesClosed = showPassword && pwdFocused;

  const handlePasswordVisibilityChange = (hidden: boolean) => {
    setShowPassword(!hidden);
    const input = document.querySelector('input[name="password"]') as HTMLInputElement | null;
    if (!input) return;
    const start = input.selectionStart ?? null;
    const end = input.selectionEnd ?? null;
    requestAnimationFrame(() => {
      input.focus({ preventScroll: true });
      if (start !== null && end !== null) {
        try {
          input.setSelectionRange(start, end);
        } catch { }
      }
    });
  };

  const bio = role === "artist" ? artist.bio || "" : "";
  const setBio = (v: string) => {
    if (role === "artist") setArtist((prev) => ({ ...prev, bio: v }));
  };

  const successHeading = successType === "already" ? "You're already logged in." : "Successful signup!";
  const successSubtitle = successType === "already" ? "Redirecting now" : "Redirecting to Dashboard.";

  return (
    <div className="relative h-svh overflow-hidden flex flex-col text-app">
      <ToastContainer position="top-center" theme="dark" newestOnTop closeOnClick hideProgressBar style={{ zIndex: 2147483647 }} />
      <VideoBackground />
      <Header />
      <main className="flex-1 min-h-0 flex items-center justify-center px-4 sm:px-6 md:px-8 py-4">
          <motion.div variants={container} initial="hidden" animate="show" className="w-full max-w-3xl mx-auto">
            <div className={`relative flex w-full flex-col sm:flex-row sm:items-stretch sm:justify-center p-0 ${showInfo && !showSuccess && authLoaded && !userId ? "" : "justify-center"}`}>
              {showInfo && !showSuccess && authLoaded && !userId && (
                <motion.div
                  layout={!showSuccess && !userId}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="hidden sm:flex w-full sm:w-1/2"
                >
                  <div className="w-full h-full">
                    <InfoPanel show={showInfo} prefersReduced={prefersReduced} hasError={mascotError} isPasswordHidden={mascotEyesClosed} mode="signup" role={role} />
                  </div>
                </motion.div>
              )}
              {!authLoaded ? null : userId ? (
                <motion.div
                  layout={false}
                  className="w-full max-w-md p-0 flex items-center justify-center"
                >
                  <div className="rounded-3xl w-full m-0 bg-card border border-app p-4 xs:p-5 sm:p-6 md:p-7 lg:p-8 mx-auto">
                    <div className="w-full flex items-center justify-center py-10 sm:py-14">
                      <div className="ink-success-wrap flex flex-col items-center justify-center gap-6 sm:gap-8">
                        <div className="ink-spinner" />
                        <div className="text-center space-y-2 px-4">
                          <div className="text-app text-xl sm:text-2xl md:text-3xl font-semibold">{successHeading}</div>
                          <div className="text-subtle text-sm sm:text-base md:text-lg">
                            {successSubtitle}
                            <span className="ink-dots" aria-hidden="true">
                              <span className="ink-dot" />
                              <span className="ink-dot" />
                              <span className="ink-dot" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  layout={!showSuccess && !userId}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className={`${showInfo && !showSuccess && (!authLoaded || !userId) ? "w-full sm:w-1/2" : "w-full max-w-md"} p-0`}
                >
                  <SignupFormCard
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
                    isLoaded={isLoaded as boolean}
                    onNext={handleNext}
                    onBack={handleBack}
                    onStartVerification={startVerification}
                    onVerify={verifyCode}
                    onPasswordVisibilityChange={handlePasswordVisibilityChange}
                    emailTaken={false}
                    className="h-full"
                    clientRefs={clientRefs}
                    setClientRefs={setClientRefs}
                    artistPortfolioImgs={artistPortfolioImgs}
                    setArtistPortfolioImgs={setArtistPortfolioImgs}
                    onCancelVerification={() => setAwaitingCode(false)}
                    bio={bio}
                    onBioChange={(e) => setBio(e.target.value)}
                    invalidFields={invalidFields}
                    flashToken={flashToken}
                    confirmPassword={confirmPassword}
                    setConfirmPassword={setConfirmPassword}
                    success={showSuccess}
                    successHeading={successHeading}
                    successSubtitle={successSubtitle}
                  />
                </motion.div>
              )}
            </div>
          </motion.div>
      </main>
    </div>
  );
}