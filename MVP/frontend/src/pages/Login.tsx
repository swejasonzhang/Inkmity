import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import Header from "@/components/header/Header";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, useReducedMotion } from "framer-motion";
import { useSignIn, useUser } from "@clerk/clerk-react";
import { validateEmail } from "@/utils/validation";
import InfoPanel from "@/components/access/InfoPanel";
import FormCard from "@/components/access/FormCard";
import { Button } from "@/components/ui/button";
import { container } from "@/components/access/animations";

export default function Login() {
  const prefersReduced = !!useReducedMotion();

  const [showPassword, setShowPassword] = useState(false);
  const [pwdFocused, setPwdFocused] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showInfo, setShowInfo] = useState(false);
  const [mascotError, setMascotError] = useState(false);

  const { signIn, setActive } = useSignIn();
  const { isSignedIn } = useUser();

  useEffect(() => {
    if (isSignedIn) window.location.href = "/dashboard";
  }, [isSignedIn]);

  useEffect(() => {
    const t = setTimeout(() => setShowInfo(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // Keep mascot state perfectly in sync with actual focus & input type
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

  const triggerMascotError = () => {
    setMascotError(true);
    window.setTimeout(() => setMascotError(false), 900);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      toast.error("Please enter a valid email", { position: "top-center", theme: "dark" });
      triggerMascotError();
      return;
    }
    if (!password.trim()) {
      toast.error("Enter your password", { position: "top-center", theme: "dark" });
      triggerMascotError();
      return;
    }
    if (!signIn) {
      toast.error("Sign in unavailable. Please try again later.", { position: "top-center", theme: "dark" });
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        window.location.href = "/dashboard";
      } else {
        toast.error("Login failed. Check your credentials and try again.", { position: "top-center", theme: "dark" });
        triggerMascotError();
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

  // Close eyes only when password field is focused AND the password is shown
  const mascotEyesClosed = pwdFocused && showPassword;

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

      <Header disableDashboardLink />

      <main className="flex-1 grid place-items-center px-4 py-10">
        <motion.div
          variants={container}
          initial={prefersReduced ? false : "hidden"}
          animate={prefersReduced ? undefined : "show"}
          className="w-full max-w-5xl mx-auto"
        >
          <div className="relative w-full min-h-[610px] flex items-center justify-center">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: showInfo ? 520 : 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative shrink-0 self-stretch overflow-hidden"
            >
              <InfoPanel
                show={showInfo}
                prefersReduced={prefersReduced}
                hasError={mascotError}
                isPasswordHidden={mascotEyesClosed}
                className="absolute inset-0"
                mode="login"
              />
            </motion.div>

            <FormCard
              mode="login"
              showInfo={showInfo}
              hasError={mascotError}
              titleOverride="Welcome Back!"
              subtitleOverride="Login to continue exploring artists, styles, and your tattoo journey."
              className="flex-1 self-stretch min-h-[610px] max-w-[680px]"
            >
              <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full max-w-sm mx-auto">
                <div className="text-left">
                  <label className="block text-sm text-white/70 mb-1" htmlFor="email">Email</label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={email}
                      placeholder="Email"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                      className="w-full h-11 rounded-xl bg-white/10 text-white placeholder:text-white/40 px-4 outline-none focus:ring-2 focus:ring-white/30"
                    />
                  </div>
                </div>

                <div className="text-left">
                  <label className="block text-sm text-white/70 mb-1" htmlFor="password">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={password}
                      placeholder="Password"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                      className="w-full h-11 rounded-xl bg-white/10 text-white placeholder:text-white/40 px-4 pr-12 outline-none focus:ring-2 focus:ring-white/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:text-white bg-white/10 hover:bg-white/20 transition"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 0-1.26.31-2.45.86-3.5M6.1 6.1C7.94 4.8 9.94 4 12 4c5 0 9.27 3.11 11 8-.39 1.01-.93 1.96-1.58 2.81M1 1l22 22" />
                          <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                      <span className="sr-only">{showPassword ? "Hide" : "Show"}</span>
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="bg-white/15 hover:bg-white/25 text-white flex-1 h-11 text-base rounded-xl w-full"
                  disabled={loading}
                >
                  {loading ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </FormCard>
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