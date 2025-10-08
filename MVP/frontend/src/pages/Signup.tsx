import { useEffect, useMemo, useState, ChangeEvent } from "react";
import Header from "@/components/header/Header";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth, useClerk, useSignUp, useUser } from "@clerk/clerk-react";
import { validateEmail, validatePassword } from "@/utils/validation";
import InfoPanel from "@/components/access/InfoPanel";
import FormCard from "@/components/access/FormCard";
import { container } from "@/components/access/animations";

type Role = "client" | "artist";
type SharedAccount = { firstName: string; lastName: string; email: string; password: string };
type ClientProfile = { budget: string; location: string; placement: string; size: string; notes: string };
type ArtistProfile = { location: string; shop: string; years: string; baseRate: string; instagram: string; portfolio: string };
type SignUpAttempt = { attemptEmailAddressVerification: (args: { code: string }) => Promise<any> } | null;

const LOGOUT_TYPE_KEY = "logoutType";
const LOGIN_TIMESTAMP_KEY = "lastLogin";

export default function SignUp() {
  const prefersReduced = !!useReducedMotion();

  const [role, setRole] = useState<Role>("client");
  const [step, setStep] = useState(0);
  const [shared, setShared] = useState<SharedAccount>({ firstName: "", lastName: "", email: "", password: "" });
  const [client, setClient] = useState<ClientProfile>({ budget: "", location: "", placement: "", size: "", notes: "" });
  const [artist, setArtist] = useState<ArtistProfile>({ location: "", shop: "", years: "", baseRate: "", instagram: "", portfolio: "" });

  const [awaitingCode, setAwaitingCode] = useState(false);
  const [signUpAttempt, setSignUpAttempt] = useState<SignUpAttempt>(null);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [showInfo, setShowInfo] = useState(false);

  const [isPasswordHidden, setIsPasswordHidden] = useState(false);
  const [mascotError, setMascotError] = useState(false);

  const { isLoaded, signUp, setActive } = useSignUp();
  const { signOut } = useClerk();
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();

  const triggerMascotError = () => {
    setMascotError(true);
    window.setTimeout(() => setMascotError(false), 900);
  };

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

  useEffect(() => {
    const t = setTimeout(() => setShowInfo(true), 2000);
    return () => clearTimeout(t);
  }, []);

  const handleShared = (e: ChangeEvent<HTMLInputElement>) =>
    setShared({ ...shared, [e.target.name]: e.target.value });

  const handleClient = (e: ChangeEvent<HTMLInputElement>) =>
    setClient({ ...client, [e.target.name]: e.target.value });

  const handleArtist = (e: ChangeEvent<HTMLInputElement>) =>
    setArtist({ ...artist, [e.target.name]: e.target.value });

  const allSharedValid =
    validateEmail(shared.email) &&
    validatePassword(shared.password) &&
    !!shared.firstName.trim() &&
    !!shared.lastName.trim();

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
      triggerMascotError();
      return;
    }
    if (!isLastFormSlide) setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const startVerification = async () => {
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
      await signOut();
      const attempt = await signUp.create({
        emailAddress: shared.email,
        password: shared.password,
        publicMetadata: {
          role,
          firstName: shared.firstName,
          lastName: shared.lastName,
          profile: role === "client" ? client : artist,
        },
      } as any);
      await attempt.prepareEmailAddressVerification();
      setSignUpAttempt(
        attempt as unknown as {
          attemptEmailAddressVerification: (args: { code: string }) => Promise<any>;
        }
      );
      setAwaitingCode(true);
      toast.info("Verification code sent to your email!", { position: "top-center", theme: "dark" });
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message || err.message || "An unexpected error occurred", {
        position: "top-center",
        theme: "dark",
      });
      triggerMascotError();
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
      firstName: shared.firstName,
      lastName: shared.lastName,
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
        try {
          await syncUserToBackend(role);
          toast.success("Signup successful! Redirecting...", { position: "top-center", theme: "dark" });
          window.location.href = "/dashboard";
        } catch {
          toast.error("Signed up but failed to sync user. You can continue; some features may be limited.", {
            position: "top-center",
            theme: "dark",
          });
          window.location.href = "/dashboard";
        }
      } else {
        toast.error("Verification failed. Check your code and try again.", { position: "top-center", theme: "dark" });
        triggerMascotError();
      }
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message || err.message || "An unexpected error occurred", {
        position: "top-center",
        theme: "dark",
      });
      triggerMascotError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh text-app flex flex-col overflow-hidden">
      <video autoPlay loop muted playsInline preload="auto" className="fixed inset-0 z-0 h-full w-full object-cover pointer-events-none" aria-hidden>
        <source src="/Background.mp4" type="video/mp4" />
      </video>

      <Header disableDashboardLink />

      <main className="flex-1 grid place-items-center px-4 py-10">
        <motion.div variants={container} initial="hidden" animate="show" className="w-full max-w-5xl mx-auto">
          <div className="relative flex items-stretch justify-center">
            <InfoPanel
              show={showInfo}
              prefersReduced={prefersReduced}
              hasError={mascotError}
              isPasswordHidden={isPasswordHidden}
              className="self-stretch"
              mode="signup"
            />
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
              onSharedChange={handleShared}
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
              onPasswordVisibilityChange={setIsPasswordHidden}
              className="self-stretch min-h-[560px]"
            />
          </div>
        </motion.div>
      </main>

      <ToastContainer
        position="top-center"
        autoClose={2000}
        hideProgressBar
        closeOnClick
        pauseOnHover={false}
        draggable={false}
        toastClassName="bg-black/80 text-white text-base rounded-xl shadow-lg text-center px-5 py-3 min-w-[280px] flex items-center justify-center border border-white/10"
      />
    </div>
  );
}