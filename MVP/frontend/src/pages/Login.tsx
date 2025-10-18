import { useState, useEffect, FormEvent, ChangeEvent, useRef } from "react";
import Header from "@/components/header/Header";
import { ToastContainer, toast, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, useReducedMotion } from "framer-motion";
import { useSignIn, useUser } from "@clerk/clerk-react";
import { validateEmail } from "@/utils/validation";
import InfoPanel from "@/components/access/InfoPanel";
import FormCard from "@/components/access/FormCard";
import { Button } from "@/components/ui/button";
import { container } from "@/components/access/animations";
import { useAlreadySignedInRedirect } from "@/hooks/useAlreadySignedInRedirect";

const TOAST_H = 72;
const TOAST_GAP = 50;

type TipState = { show: boolean; x: number; y: number };

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

  useAlreadySignedInRedirect();

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
    const t = setTimeout(() => setShowInfo(true), 2000);
    return () => clearTimeout(t);
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
      toast.error(err?.errors?.[0]?.message || err?.message || "Unexpected error occurred", { position: "top-center", theme: "dark" });
      triggerMascotError();
    } finally {
      setLoading(false);
    }
  };

  const mascotEyesClosed = showPassword || pwdFocused;
  const CARD_H = "h-[520px] sm:h-[560px] md:h-[580px]";

  return (
    <>
      <div className="relative z-10 min-h-[100svh] text-app flex flex-col">
        <Header />
        <main className="relative z-10 flex-1 min-h-0 grid place-items-center px-4 py-4 md:px-0 md:py-0">
          <div className="mx-auto w-full max-w-5xl flex items-center justify-center px-1 md:px-0">
            <motion.div variants={container} initial={prefersReduced ? false : "hidden"} animate={prefersReduced ? undefined : "show"} className="w-full">
              <div className={`relative grid w-full p-2 gap-0 md:p-0 md:gap-0 ${showInfo ? "md:grid-cols-2 md:items-stretch md:justify-items-center" : "grid-cols-1 place-items-center"}`}>
                {showInfo && (
                  <motion.div layout className={`w-full max-w-xl ${CARD_H} p-3 mx-0 scale-95 md:p-0 md:mx-0 md:scale-100`}>
                    <div className="h-full">
                      <InfoPanel show={showInfo} prefersReduced={prefersReduced} hasError={mascotError} isPasswordHidden={mascotEyesClosed} mode="login" />
                    </div>
                  </motion.div>
                )}
                <motion.div ref={cardRef} layout className={`w-full max-w-xl ${CARD_H} justify-self-center p-3 mx-0 scale-95 md:p-0 md:mx-0 md:scale-100`}>
                  <FormCard
                    mode="login"
                    showInfo={showInfo}
                    hasError={mascotError}
                    titleOverride="Welcome Back!"
                    subtitleOverride="Login to continue exploring artists, styles, and your tattoo journey."
                    className="h-full min-w-0"
                  >
                    <div className="grid place-items-center h-full overflow-hidden">
                      <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full max-w-sm">
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
                              autoComplete="email"
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
                              autoComplete="current-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
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
                        <Button type="submit" className="bg-white/15 hover:bg-white/25 text-white flex-1 h-11 text-base rounded-xl w-full" disabled={loading}>
                          {loading ? "Signing In..." : "Sign In"}
                        </Button>
                      </form>
                    </div>
                  </FormCard>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </main>
        <ToastContainer
          position="top-center"
          autoClose={2000}
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
              <span className="text-xs text-app whitespace-nowrap">Log in to view your dashboard</span>
            </div>
          </div>
        )}
      </div>
      <video autoPlay loop muted playsInline preload="auto" className="fixed inset-0 w-full h-full object-cover pointer-events-none z-0" aria-hidden>
        <source src="/Background.mp4" type="video/mp4" />
      </video>
    </>
  );
}