import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import Header from "@/components/header/Header";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, useReducedMotion } from "framer-motion";
import { useSignIn, useUser } from "@clerk/clerk-react";
import { validateEmail } from "@/utils/validation";
import InfoPanel from "@/components/signup/InfoPanel";
import FormInput from "@/components/dashboard/FormInput";
import { Button } from "@/components/ui/button";
import { container } from "@/components/signup/animations";

const LOGOUT_TYPE_KEY = "logoutType";
const LOGIN_TIMESTAMP_KEY = "lastLogin";

export default function Login() {
  const prefersReduced = !!useReducedMotion();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [signInAttempt, setSignInAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [showInfo, setShowInfo] = useState(false);
  const [mascotError, setMascotError] = useState(false);
  const isPasswordHidden = false;

  const { signIn, setActive } = useSignIn();
  const { isSignedIn } = useUser();

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

  const triggerMascotError = () => {
    setMascotError(true);
    window.setTimeout(() => setMascotError(false), 900);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!awaitingCode) {
      if (!validateEmail(email)) {
        toast.error("Please enter a valid email", { position: "top-center", theme: "dark" });
        triggerMascotError();
        return;
      }
    } else {
      if (!code.trim()) {
        toast.error("Enter the verification code", { position: "top-center", theme: "dark" });
        triggerMascotError();
        return;
      }
    }

    if (!signIn) {
      toast.error("Sign in unavailable. Please try again later.", { position: "top-center", theme: "dark" });
      return;
    }

    setLoading(true);
    try {
      if (!awaitingCode) {
        const attempt = await signIn.create({ identifier: email, strategy: "email_code" });
        setSignInAttempt(attempt);
        setAwaitingCode(true);
        toast.info("Verification code sent to your email!", { position: "top-center", theme: "dark" });
      } else {
        const verified = await signInAttempt.attemptFirstFactor({
          strategy: "email_code",
          code: code.trim(),
        });

        if (verified.status === "complete") {
          await setActive({ session: verified.createdSessionId });
          localStorage.setItem("trustedDevice", email);
          localStorage.setItem(LOGIN_TIMESTAMP_KEY, Date.now().toString());
          localStorage.removeItem(LOGOUT_TYPE_KEY);
          toast.success("Login successful! Redirecting...", { position: "top-center", theme: "dark" });
          window.location.href = "/dashboard";
        } else {
          toast.error("Verification failed. Check your code and try again.", { position: "top-center", theme: "dark" });
          triggerMascotError();
        }
      }
    } catch (err: any) {
      toast.error(err?.errors?.[0]?.message || err?.message || "Unexpected error occurred", {
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
          <div className="relative flex items-center justify-center gap-0">
            <div className="flex items-center justify-center">
              <InfoPanel show={showInfo} prefersReduced={prefersReduced} hasError={mascotError} isPasswordHidden={isPasswordHidden} />
            </div>

            <div className="bg-[#0b0b0b]/70 backdrop-blur-xl p-10 sm:p-12 rounded-r-3xl flex items-center justify-center">
              <div className="grid gap-6 text-center place-items-center w-full">
                <div className="w-full max-w-sm mx-auto">
                  <h1 className="text-4xl font-semibold text-white">Welcome Back!</h1>
                  <p className="text-white/60 mt-3 text-base">
                    Login to continue exploring artists, styles, and your tattoo journey.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full max-w-sm mx-auto">
                  <FormInput
                    type="email"
                    name="email"
                    value={email}
                    placeholder="Email"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    isValid={!email || validateEmail(email)}
                    message={!email ? "Enter your email" : validateEmail(email) ? "Valid email address" : "Enter a valid email address"}
                  />

                  {awaitingCode && (
                    <FormInput
                      type="text"
                      name="code"
                      value={code}
                      placeholder="Enter verification code"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
                      isValid={!!code}
                      message={code ? "Code entered" : "Check your email for the code"}
                    />
                  )}

                  <Button
                    type="submit"
                    className="bg-white/15 hover:bg-white/25 text-white flex-1 h-11 text-base rounded-xl w-full"
                    disabled={loading}
                  >
                    {loading ? (awaitingCode ? "Verifying..." : "Sending Code...") : awaitingCode ? "Verify Code" : "Send Code"}
                  </Button>
                </form>

                <p className="text-white/60 text-center text-sm">
                  Don&apos;t have an account? <a href="/signup" className="underline hover:opacity-80">Sign Up</a>
                </p>
              </div>
            </div>
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
