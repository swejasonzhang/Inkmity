import { useState, useEffect, FormEvent, ChangeEvent, useRef, useCallback } from "react";
import Header from "@/components/header/Header";
import { motion, useReducedMotion } from "framer-motion";
import { useSignIn, useAuth } from "@clerk/clerk-react";
import { validateEmail } from "@/lib/utils";
import InfoPanel from "@/components/access/InfoPanel";
import LoginFormCard from "@/components/access/LoginFormCard";
import { Button } from "@/components/ui/button";
import { container } from "@/lib/animations";
import { resetActivityTimer } from "@/hooks/useInactivityLogout";

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
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { userId, isLoaded: authLoaded, isSignedIn } = useAuth();
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
  const [successType, setSuccessType] = useState<"login" | "already" | null>(null);
  const redirectTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(false);
  const justLoggedInRef = useRef(false);
  const isRedirectingRef = useRef(false);
  const intendedSuccessTypeRef = useRef<"login" | "already" | null>(null);

  const beginRedirect = useCallback(() => {
    if (redirectTimerRef.current !== null) {
      window.clearTimeout(redirectTimerRef.current);
    }
    isRedirectingRef.current = true;
    redirectTimerRef.current = window.setTimeout(() => {
      window.location.assign("/dashboard");
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null && !isRedirectingRef.current) {
        window.clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, []);

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
    const measure = () => {
      const height = el.offsetHeight || null;
      if (height && height > 0) {
        setCardH(height);
      }
    };
    const timeoutId = setTimeout(measure, 0);
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => {
      clearTimeout(timeoutId);
      ro.disconnect();
    };
  }, [authError, showSuccess, loading, authLoaded, isSignedIn]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsMdUp(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!authLoaded) return;
    if (isSignedIn) {
      if (justLoggedInRef.current || intendedSuccessTypeRef.current === "login" || successType === "login") {
        return;
      }
      if (!isMountedRef.current) {
        isMountedRef.current = true;
        intendedSuccessTypeRef.current = "already";
        setShowSuccess(true);
        setSuccessType("already");
        beginRedirect();
      }
    } else {
      if (!isMountedRef.current) {
        isMountedRef.current = true;
      }
      if (!isRedirectingRef.current && redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
      if (showSuccess && successType !== "login" && successType !== "already") {
        setShowSuccess(false);
        setSuccessType(null);
      }
      intendedSuccessTypeRef.current = null;
    }
  }, [authLoaded, isSignedIn, beginRedirect, successType, showSuccess]);

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
    if (!signIn || !signInLoaded) {
      setAuthError("Sign in unavailable. Please wait a moment and try again.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email.trim().toLowerCase(), password });
      
      if (import.meta.env.DEV) {
        console.log("Sign-in result:", result);
        console.log("Sign-in status:", result.status);
      }
      
      if (result.status === "complete") {
        if (!result.createdSessionId) {
          setAuthError("Login failed: No session created. Please try again.");
          triggerMascotError();
          setLoading(false);
          return;
        }
        
        try {
          await setActive({ session: result.createdSessionId });
        } catch (activeErr: any) {
          setAuthError(activeErr?.errors?.[0]?.message || activeErr?.message || "Failed to activate session. Please try again.");
          triggerMascotError();
          setLoading(false);
          return;
        }
        
        resetActivityTimer();
        
        try {
          sessionStorage.setItem("authRedirect", "1");
        } catch { }
        isMountedRef.current = true;
        justLoggedInRef.current = true;
        intendedSuccessTypeRef.current = "login";
        setSuccessType("login");
        setShowSuccess(true);
        beginRedirect();
        setTimeout(() => {
          justLoggedInRef.current = false;
        }, 1000);
      } else if (result.status === "needs_second_factor") {
        if (result.createdSessionId) {
          try {
            await setActive({ session: result.createdSessionId });
            resetActivityTimer();
            try {
              sessionStorage.setItem("authRedirect", "1");
            } catch { }
            isMountedRef.current = true;
            justLoggedInRef.current = true;
            intendedSuccessTypeRef.current = "login";
            setSuccessType("login");
            setShowSuccess(true);
            beginRedirect();
            setTimeout(() => {
              justLoggedInRef.current = false;
            }, 1000);
          } catch (activeErr: any) {
            setAuthError("Login failed. Please check your credentials and try again.");
            triggerMascotError();
          }
        } else {
          setAuthError("Login failed. Please check your credentials and try again.");
          triggerMascotError();
        }
      } else if (result.status === "needs_new_password") {
        setAuthError("Password reset required. Please reset your password.");
        triggerMascotError();
      } else {
        setAuthError("Login failed. Please check your credentials and try again.");
        triggerMascotError();
      }
    } catch (err: any) {
      console.error("Login error:", err);
      console.error("Full error object:", JSON.stringify(err, null, 2));
      
      let errorMessage = "Login failed. Please check your credentials and try again.";
      
      if (err?.errors && Array.isArray(err.errors) && err.errors.length > 0) {
        const firstError = err.errors[0];
        console.error("First error details:", firstError);
        errorMessage = firstError.message || firstError.longMessage || firstError.code || errorMessage;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }
      
      const lowerMessage = errorMessage.toLowerCase();
      
      if (lowerMessage.includes("form_identifier_not_found") || 
          lowerMessage.includes("form_password_incorrect") || 
          lowerMessage.includes("form_param_format_invalid") ||
          lowerMessage.includes("identifier_not_found") ||
          lowerMessage.includes("password_incorrect")) {
        errorMessage = "Invalid email or password. Please check your credentials and try again.";
      } else if (lowerMessage.includes("two-factor") || 
                 lowerMessage.includes("2fa") || 
                 lowerMessage.includes("second factor") || 
                 lowerMessage.includes("needs_second_factor")) {
        errorMessage = "Login failed. Please check your credentials and try again.";
      } else if (lowerMessage.includes("identifier") || lowerMessage.includes("password")) {
        errorMessage = "Invalid email or password. Please check your credentials and try again.";
      } else if (err?.status === 401 || err?.statusCode === 401) {
        errorMessage = "Invalid email or password. Please check your credentials and try again.";
      }
      
      if (import.meta.env.DEV) {
        console.error("Final error message:", errorMessage);
      }
      
      setAuthError(errorMessage);
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

  const successTitle =
    successType === "already" ? "You're already logged in." : "Welcome Back!";
  const successSubtitle =
    successType === "already" ? "Redirecting now" : "Redirecting to Dashboard!";

  return (
    <div className="relative text-app">
      <video autoPlay loop muted playsInline preload="auto" className="fixed inset-0 w-full h-full object-cover pointer-events-none z-0" aria-hidden>
        <source src="/Background.mp4" type="video/mp4" />
      </video>
      <div ref={headerRef} className="sticky top-0 z-30 bg-black/20 border-b border-white/10">
        <Header />
      </div>
      <main className="z-10 grid place-items-center px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8 xl:px-0 overflow-hidden" style={{ height: `calc(100svh - ${headerH}px)`, maxHeight: `calc(100svh - ${headerH}px)` }}>
        <div className="mx-auto w-full max-w-7xl grid place-items-center h-full px-1 xs:px-2 sm:px-3 md:px-4 lg:px-0" style={{ maxHeight: `calc(100svh - ${headerH}px)` }}>
          <motion.div variants={container} initial="hidden" animate="show" className="w-full h-full" style={{ maxHeight: `calc(100svh - ${headerH}px)` }}>
            <div className={`relative flex w-full h-full flex-col sm:flex-row sm:items-center sm:justify-center p-0 ${showInfo && !showSuccess && authLoaded && !isSignedIn ? "" : "justify-center"}`} style={{ maxHeight: `calc(100svh - ${headerH}px)` }}>
              {showInfo && !showSuccess && authLoaded && !isSignedIn && (
                <motion.div layout={!showSuccess && !isSignedIn} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="flex-1 w-full sm:w-1/2 lg:w-2/5 sm:flex-none mt-4 xs:mt-5 sm:mt-0" style={{ height: isMdUp && cardH ? `${cardH}px` : undefined }}>
                  <div className="h-full w-full" style={{ height: isMdUp && cardH ? `${cardH}px` : undefined }}>
                    <InfoPanel show={showInfo} prefersReduced={prefersReduced} hasError={mascotError} isPasswordHidden={mascotEyesClosed} mode="login" />
                  </div>
                </motion.div>
              )}
              {!authLoaded ? null : isSignedIn ? (
                <motion.div ref={cardRef} layout={false} className="w-full max-w-2xl p-0 mb-4 xs:mb-5 sm:mb-6 md:mb-0">
                  <div className="rounded-3xl w-full m-0 bg-[#0b0b0b]/80 border border-white/10 ring-1 ring-white/10 p-4 xs:p-5 sm:p-6 md:p-7 lg:p-8 h-full mx-auto flex flex-col overflow-hidden">
                    <div className="w-full min-h-[560px] xs:min-h-[580px] sm:min-h-[620px] md:min-h-[660px] lg:min-h-[680px] xl:min-h-[700px] flex flex-col items-center justify-center gap-6 xs:gap-7 sm:gap-8 md:gap-9 lg:gap-10 py-12 xs:py-14 sm:py-16 md:py-18">
                      <div className="ink-ring scale-110 xs:scale-115 sm:scale-125 md:scale-135 lg:scale-150" aria-hidden="true">
                        <div className="ink-ring__inner" />
                      </div>
                      <div className="text-center px-4">
                        <p className="text-white text-xl xs:text-2xl sm:text-2xl md:text-3xl lg:text-3xl font-semibold">{successTitle}</p>
                        <p className="text-white/80 mt-2 text-sm xs:text-base sm:text-base md:text-lg lg:text-lg">
                          {successSubtitle}
                          <span className="ink-dots" aria-hidden="true">
                            <span className="ink-dot" />
                            <span className="ink-dot" />
                            <span className="ink-dot" />
                          </span>
                        </p>
                        <span className="sr-only" aria-live="polite">{successTitle} {successSubtitle}.</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div ref={cardRef} layout={!showSuccess && !isSignedIn} transition={{ type: "spring", stiffness: 300, damping: 30 }} className={`${showInfo && !showSuccess && (!authLoaded || !isSignedIn) ? "flex-1 w-full sm:w-1/2 lg:w-3/5 sm:flex-none" : "w-full max-w-lg"} p-0 mb-4 xs:mb-5 sm:mb-6 md:mb-0`}>
                  <LoginFormCard
                    showInfo={showInfo}
                    hasError={mascotError}
                    titleOverride="Welcome Back!"
                    subtitleOverride="Login to continue exploring artists, styles, and your tattoo journey."
                    className="h-full w-full"
                    hideHeader={showSuccess}
                  >
                    {showSuccess ? (
                      <div className="w-full min-h-[560px] xs:min-h-[580px] sm:min-h-[620px] md:min-h-[660px] lg:min-h-[680px] xl:min-h-[700px] flex flex-col items-center justify-center gap-6 xs:gap-7 sm:gap-8 md:gap-9 lg:gap-10 py-12 xs:py-14 sm:py-16 md:py-18">
                        <div className="ink-ring scale-110 xs:scale-115 sm:scale-125 md:scale-135 lg:scale-150" aria-hidden="true">
                          <div className="ink-ring__inner" />
                        </div>
                        <div className="text-center px-4">
                          <p className="text-white text-xl xs:text-2xl sm:text-2xl md:text-3xl lg:text-3xl font-semibold">{successTitle}</p>
                          <p className="text-white/80 mt-2 text-sm xs:text-base sm:text-base md:text-lg lg:text-lg">
                            {successSubtitle}
                            <span className="ink-dots" aria-hidden="true">
                              <span className="ink-dot" />
                              <span className="ink-dot" />
                              <span className="ink-dot" />
                            </span>
                          </p>
                          <span className="sr-only" aria-live="polite">{successTitle} {successSubtitle}.</span>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="flex flex-col gap-3 xs:gap-3.5 sm:gap-4 w-full max-w-sm mx-auto text-center px-4 xs:px-5 sm:px-6">
                        <div className="text-left w-full">
                          <label className="block text-xs xs:text-sm sm:text-base font-semibold text-white mb-1.5 text-center" htmlFor="email">Email</label>
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
                              className={`w-full h-10 xs:h-11 sm:h-12 rounded-xl bg-white/10 text-white placeholder:text-white/40 placeholder:text-xs xs:placeholder:text-sm sm:placeholder:text-sm px-3 xs:px-3.5 sm:px-4 outline-none focus:ring-2 focus:ring-white/30 text-center border border-white/10 text-sm xs:text-base ${invalid.email ? "ink-flash" : ""}`}
                              autoComplete="email"
                              aria-describedby="email-help"
                            />
                          </div>
                          <p id="email-help" className={`mt-1 text-xs xs:text-xs sm:text-sm text-center ${emailOk ? "text-white/60" : "text-red-400"}`}>{emailHelp}</p>
                        </div>
                        <div className="text-left w-full">
                          <label className="block text-xs xs:text-sm sm:text-base font-semibold text-white mb-1.5 text-center" htmlFor="password">Password</label>
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
                              className={`w-full h-10 xs:h-11 sm:h-12 rounded-xl bg-white/10 text-white placeholder:text-white/40 placeholder:text-xs xs:placeholder:text-sm sm:placeholder:text-sm px-3 xs:px-3.5 sm:px-4 pr-10 outline-none focus:ring-2 focus:ring-white/30 text-center border border-white/10 text-sm xs:text-base ${invalid.password ? "ink-flash" : ""}`}
                              autoComplete="current-password"
                              aria-describedby="password-help auth-help"
                            />
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={togglePwd}
                              className="absolute right-2 xs:right-2.5 sm:right-3 top-1/2 -translate-y-1/2 inline-flex h-6 xs:h-7 sm:h-8 w-6 xs:w-7 sm:w-8 items-center justify-center rounded-lg text-white/80 hover:text-white bg-white/10 hover:bg-white/20 transition"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? (
                                <svg className="h-3.5 xs:h-4 sm:h-4 w-3.5 xs:w-4 sm:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 0-1.26.31-2.45.86-3.5M6.1 6.1C7.94 4.8 9.94 4 12 4c5 0 9.27 3.11 11 8-.39 1.01-.93 1.96-1.58 2.81M1 1l22 22" />
                                  <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
                                </svg>
                              ) : (
                                <svg className="h-3.5 xs:h-4 sm:h-4 w-3.5 xs:w-4 sm:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              )}
                              <span className="sr-only">{showPassword ? "Hide" : "Show"}</span>
                            </button>
                          </div>
                          <p id="password-help" className={`mt-1 text-xs xs:text-xs sm:text-sm text-center ${pwdOk ? "text-white/60" : "text-red-400"}`}>{pwdHelp}</p>
                          {authError ? <p id="auth-help" className="mt-1 text-xs xs:text-xs sm:text-sm text-center text-red-400">{authError}</p> : null}
                        </div>
                        <Button type="submit" className="bg-white/15 hover:bg-white/25 text-white flex-1 h-10 xs:h-11 sm:h-12 text-xs xs:text-sm sm:text-base rounded-xl w-full mt-2 xs:mt-2.5 sm:mt-3" disabled={loading || !signInLoaded || !signIn}>
                          {loading ? "Signing In..." : "Sign In"}
                        </Button>
                      </form>
                    )}
                  </LoginFormCard>
                </motion.div>
              )}
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