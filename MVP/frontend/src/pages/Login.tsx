import { useState, useEffect, FormEvent, ChangeEvent, useRef } from "react";
import Header from "@/components/header/Header";
import { motion, useReducedMotion } from "framer-motion";
import { useSignIn, useAuth } from "@clerk/clerk-react";
import { validateEmail } from "@/lib/utils";
import InfoPanel from "@/components/access/InfoPanel";
import LoginFormCard from "@/components/access/LoginFormCard";
import { Button } from "@/components/ui/button";
import { container } from "@/lib/animations";

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
  const { userId } = useAuth();
  const [tip, setTip] = useState<TipState>({ show: false, x: 0, y: 0 });
  const [authError, setAuthError] = useState("");
  const pwdRef = useRef<HTMLInputElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [headerH, setHeaderH] = useState(0);
  const [cardH, setCardH] = useState<number | null>(null);
  const [isMdUp, setIsMdUp] = useState<boolean>(typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : false);
  const [invalid, setInvalid] = useState<{ email: boolean; password: boolean }>({ email: false, password: false });
  const [flashToken, setFlashToken] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

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

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => setHeaderH(el.offsetHeight || 0);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const measure = () => setCardH(el.offsetHeight || null);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsMdUp(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!userId) return;
    setShowSuccess(true);
    const t = setTimeout(() => {
      window.location.assign("/dashboard");
    }, 1500);
    return () => clearTimeout(t);
  }, [userId]);

  const triggerMascotError = () => {
    setMascotError(true);
    window.setTimeout(() => setMascotError(false), 900);
  };

  const emailOk = email.trim().length > 0 && validateEmail(email);
  const pwdOk = password.trim().length > 0;
  const emailHelp = email.trim().length === 0 ? "Required. Enter your email." : emailOk ? "Looks good." : "Invalid email. Use a format like name@example.com.";
  const pwdHelp = password.trim().length === 0 ? "Required. Enter your password." : pwdOk ? "Keep this private." : "Password required.";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!emailOk || !pwdOk) {
      setInvalid({ email: !emailOk, password: !pwdOk });
      setFlashToken((t) => t + 1);
      triggerMascotError();
      return;
    }
    if (!signIn) {
      setAuthError("Sign in unavailable. Please try again later.");
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
        setShowSuccess(true);
        setTimeout(() => {
          window.location.assign("/dashboard");
        }, 1500);
      } else {
        setAuthError("Login failed. Check your credentials and try again.");
        triggerMascotError();
      }
    } catch (err: any) {
      setAuthError(err?.errors?.[0]?.message || err?.message || "Unexpected error occurred");
      triggerMascotError();
    } finally {
      setLoading(false);
    }
  };

  const mascotEyesClosed = showPassword && pwdFocused;

  const togglePwd = () => {
    const el = pwdRef.current;
    const start = el?.selectionStart ?? null;
    const end = el?.selectionEnd ?? null;
    setShowPassword((v) => !v);
    requestAnimationFrame(() => {
      const input = pwdRef.current;
      if (!input) return;
      if (document.activeElement === input) {
        input.focus({ preventScroll: true });
        if (start !== null && end !== null) {
          try {
            input.setSelectionRange(start, end);
          } catch { }
        }
      }
    });
  };

  const successTitle = userId ? "You’re already logged in." : "Login successful.";

  return (
    <div className="relative text-app">
      <video autoPlay loop muted playsInline preload="auto" className="fixed inset-0 w-full h-full object-cover pointer-events-none z-0" aria-hidden>
        <source src="/Background.mp4" type="video/mp4" />
      </video>
      <div ref={headerRef} className="sticky top-0 z-30 bg-black/20 border-b border-white/10">
        <Header />
      </div>
      <main className="z-10 grid place-items-center px-3 md:px-0 overflow-y-auto md:overflow-visible pt-6 pb-10 md:pt-0 md:pb-0" style={{ minHeight: `calc(100svh - ${headerH}px)` }}>
        <div className="mx-auto w-full max-w-7xl grid place-items-center h-full px-1 md:px-0">
          <motion.div variants={container} initial="hidden" animate="show" className="w-full h-full">
            <div className={`relative grid w-full h-full grid-cols-1 p-0 gap-2 md:gap-0 md:p-0 place-items-center ${showInfo ? "md:grid-cols-2 md:items-stretch md:justify-items-center" : ""}`}>
              {showInfo && (
                <motion.div layout className="flex w-full max-w-2xl p-0 mx-0 mt-0 md:mt-[20px] md:p-0 md:mx-0 place-self-center" style={{ height: isMdUp ? cardH || undefined : undefined }}>
                  <div className="h-full w-full">
                    <InfoPanel show={showInfo} prefersReduced={prefersReduced} hasError={mascotError} isPasswordHidden={mascotEyesClosed} mode="login" />
                  </div>
                </motion.div>
              )}
              <motion.div ref={cardRef} layout className="w-full max-w-2xl p-0 mx-0 mt-0 md:mt-[20px] md:p-0 md:mx-0 place-self-center">
                <LoginFormCard
                  showInfo={showInfo}
                  hasError={mascotError}
                  titleOverride="Welcome Back!"
                  subtitleOverride="Login to continue exploring artists, styles, and your tattoo journey."
                  className="h-full w-full"
                  hideHeader={showSuccess}
                >
                  {showSuccess ? (
                    <div className="w-full min-h-[560px] md:min-h-[680px] flex flex-col items-center justify-center gap-8 py-16">
                      <div className="ink-ring scale-125 md:scale-150" aria-hidden="true">
                        <div className="ink-ring__inner" />
                      </div>
                      <div className="text-center">
                        <p className="text-white text-2xl md:text-3xl font-semibold">{successTitle}</p>
                        <p className="text-white/80 mt-2 text-base md:text-lg">
                          Redirecting now
                          <span className="ink-dots" aria-hidden="true">
                            <span className="ink-dot" />
                            <span className="ink-dot" />
                            <span className="ink-dot" />
                          </span>
                        </p>
                        <span className="sr-only" aria-live="polite">{successTitle} Redirecting now.</span>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm mx-auto text-center">
                      <div className="text-left w-full">
                        <label className="block text-sm sm:text-base font-semibold text-white mb-1.5 text-center" htmlFor="email">Email</label>
                        <div className="relative">
                          <input
                            key={invalid.email ? `email-invalid-${flashToken}` : "email"}
                            id="email"
                            type="email"
                            name="email"
                            value={email}
                            placeholder="name@example.com"
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                              setEmail(e.target.value);
                              if (authError) setAuthError("");
                              if (invalid.email) setInvalid((p) => ({ ...p, email: false }));
                            }}
                            className={`w-full h-11 rounded-xl bg-white/10 text-white placeholder:text-white/40 placeholder:text-xs sm:placeholder:text-sm px-3 outline-none focus:ring-2 focus:ring-white/30 text-center border border-white/10 ${invalid.email ? "ink-flash" : ""}`}
                            autoComplete="email"
                            aria-describedby="email-help"
                          />
                        </div>
                        <p id="email-help" className={`mt-1 text-xs text-center ${emailOk ? "text-white/60" : "text-red-400"}`}>{emailHelp}</p>
                      </div>
                      <div className="text-left w-full">
                        <label className="block text-sm sm:text-base font-semibold text-white mb-1.5 text-center" htmlFor="password">Password</label>
                        <div className="relative">
                          <input
                            key={invalid.password ? `pwd-invalid-${flashToken}` : "pwd"}
                            ref={pwdRef}
                            id="password"
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={password}
                            placeholder="Enter your password"
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                              setPassword(e.target.value);
                              if (authError) setAuthError("");
                              if (invalid.password) setInvalid((p) => ({ ...p, password: false }));
                            }}
                            className={`w-full h-11 rounded-xl bg-white/10 text-white placeholder:text-white/40 placeholder:text-xs sm:placeholder:text-sm px-3 pr-10 outline-none focus:ring-2 focus:ring-white/30 text-center border border-white/10 ${invalid.password ? "ink-flash" : ""}`}
                            autoComplete="current-password"
                            aria-describedby="password-help auth-help"
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
                        <p id="password-help" className={`mt-1 text-xs text-center ${pwdOk ? "text-white/60" : "text-red-400"}`}>{pwdHelp}</p>
                        {authError ? <p id="auth-help" className="mt-1 text-xs text-center text-red-400">{authError}</p> : null}
                      </div>
                      <Button type="submit" className="bg-white/15 hover:bg-white/25 text-white flex-1 h-11 text-sm rounded-xl w-full mt-2" disabled={loading}>
                        {loading ? "Signing In..." : "Sign In"}
                      </Button>
                    </form>
                  )}
                </LoginFormCard>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </main>
      {!userId && tip.show && (
        <div className="fixed z-[70] pointer-events-none" style={{ left: tip.x, top: tip.y, transform: "translate(-50%, 20px)" }}>
          <div className="relative rounded-lg border border-app bg-card/95 px-2.5 py-1.5">
            <span className="pointer-events-none absolute left-1/2 -top-1.5 -translate-x-1/2 h-3 w-3 rotate-45 bg-card border-l border-t border-app" />
            <span className="text-xs text-app whitespace-nowrap">Log in to view your dashboard</span>
          </div>
        </div>
      )}
    </div>
  );
}