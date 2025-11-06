import { useState, useEffect, FormEvent, ChangeEvent, useRef } from "react";
import Header from "@/components/header/Header";
import { ToastContainer, toast, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, useReducedMotion } from "framer-motion";
import { useSignIn, useAuth } from "@clerk/clerk-react";
import { validateEmail } from "@/lib/utils";
import InfoPanel from "@/components/access/InfoPanel";
import FormCard from "@/components/access/FormCard";
import { Button } from "@/components/ui/button";
import { container } from "@/lib/animations";
import { useAlreadySignedInRedirect } from "@/hooks/useAlreadySignedInRedirect";

const TOAST_H = 72;
const TOAST_GAP = 50;

type TipState = { show: boolean; x: number; y: number };

export default function Login() {
  useAlreadySignedInRedirect();
  const prefersReduced = !!useReducedMotion();
  const [showPassword, setShowPassword] = useState(false);
  const [pwdFocused, setPwdFocused] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [mascotError, setMascotError] = useState(false);
  const { signIn, setActive } = useSignIn();
  const { userId } = useAuth();
  const [tip, setTip] = useState<TipState>({ show: false, x: 0, y: 0 });

  const MOBILE_CARD_W = "w-full max-w-[22rem]";
  const MOBILE_CARD_H = "h-auto min-h-[420px] sm:min-h-[480px]";

  useEffect(() => {
    const mm = (e: MouseEvent) => {
      const t = e.target as Element | null;
      const anchor = t?.closest('a[href="/dashboard"]');
      setTip(anchor ? { show: true, x: e.clientX, y: e.clientY } : (p) => (p.show ? { ...p, show: false } : p));
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
  const pwdRef = useRef<HTMLInputElement | null>(null);
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
      setPwdFocused(!!(ae && ae.tagName === "INPUT" && ae.name === "password"));
    };
    const recomputeShow = () => {
      const input = document.querySelector('input[name="password"]') as HTMLInputElement | null;
      setShowPassword(!!(input && input.type === "text"));
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
        try {
          sessionStorage.setItem("authRedirect", "1");
        } catch { }
        toast.success("Login successful. Redirecting to your dashboard…", { position: "top-center", theme: "dark" });
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

  const mascotEyesClosed = showPassword && pwdFocused;
  const CARD_H = "md:h-[580px]";

  const togglePwd = () => {
    const el = pwdRef.current;
    const start = el?.selectionStart ?? null;
    const end = el?.selectionEnd ?? null;
    setShowPassword((v) => !v);
    requestAnimationFrame(() => {
      const input = pwdRef.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      if (start !== null && end !== null) {
        try {
          input.setSelectionRange(start, end);
        } catch { }
      }
    });
  };

  return (
    <>
      <div className="relative z-10 min-h-[100svh] text-app flex flex-col">
        <div className="sticky top-0 z-40 bg-black/20 supports-[backdrop-filter]:bg-black/30 backdrop-blur border-b border-white/10">
          <Header />
        </div>
        <main className="relative z-10 flex-1 flex items-center justify-center *:overflow-hidden">
          <div className="w-full max-w-5xl flex items-center justify-center h-full">
            <motion.div
              variants={container}
              initial={prefersReduced ? false : "hidden"}
              animate={prefersReduced ? undefined : "show"}
              className="w-full h-full flex items-center justify-center"
            >
              <div className={`relative flex flex-col md:flex-row w-full p-2 justify-center items-center h-full ${showInfo ? "md:grid md:grid-cols-2" : ""}`}>
                {showInfo && (
                  <motion.div layout className={`${MOBILE_CARD_W} ${MOBILE_CARD_H} md:max-w-xl ${CARD_H} p-2 md:p-0 flex items-center justify-center h-full`}>
                    <div className="h-full w-full flex items-center justify-center">
                      <InfoPanel show={showInfo} prefersReduced={prefersReduced} hasError={mascotError} isPasswordHidden={mascotEyesClosed} mode="login" />
                    </div>
                  </motion.div>
                )}
                <motion.div
                  ref={cardRef}
                  layout
                  className={`${MOBILE_CARD_W} ${MOBILE_CARD_H} md:max-w-xl ${CARD_H} p-2 md:p-0 flex items-center justify-center h-full`}
                >
                  <FormCard
                    mode="login"
                    showInfo={showInfo}
                    hasError={mascotError}
                    titleOverride="Welcome Back!"
                    subtitleOverride="Login to continue exploring artists, styles, and your tattoo journey."
                    className="h-full w-full"
                  >
                    <div className="flex flex-col justify-center items-center h-full w-full py-4 pt-12">
                      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
                        <div className="text-left w-full">
                          <label className="block text-xs text-white/70 mb-1" htmlFor="email">Email</label>
                          <div className="relative">
                            <input
                              id="email"
                              type="email"
                              name="email"
                              value={email}
                              placeholder="Email"
                              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                              className="w-full h-10 rounded-xl bg-white/10 text-white placeholder:text-white/40 px-3 outline-none focus:ring-2 focus:ring-white/30"
                              autoComplete="email"
                            />
                          </div>
                        </div>
                        <div className="text-left w-full">
                          <label className="block text-xs text-white/70 mb-1" htmlFor="password">Password</label>
                          <div className="relative">
                            <input
                              ref={pwdRef}
                              id="password"
                              type={showPassword ? "text" : "password"}
                              name="password"
                              value={password}
                              placeholder="Password"
                              onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                              className="w-full h-10 rounded-xl bg-white/10 text-white placeholder:text-white/40 px-3 pr-10 outline-none focus:ring-2 focus:ring-white/30"
                              autoComplete="current-password"
                            />
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={togglePwd}
                              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-white/80 hover:text-white bg-white/10 hover:bg-white/20 transition"
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
                        <Button type="submit" className="bg-white/15 hover:bg-white/25 text-white flex-1 h-10 text-sm rounded-xl w-full mt-2" disabled={loading}>
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
        {!userId && tip.show && (
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