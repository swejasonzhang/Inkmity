"use client";
import { useEffect, useRef, useState } from "react";
import {
  PenTool,
  Mail,
  Users,
  AlertTriangle,
  CheckCircle,
  IdCard,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const API_URL = import.meta.env.VITE_API_URL || "";

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-red-100"
      role="alert"
    >
      <AlertTriangle className="h-4 w-4" />
      <span className="text-sm text-center">{message}</span>
    </motion.div>
  );
}

function SuccessNote({ show }) {
  if (!show) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16 }}
      className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-2.5 text-emerald-100"
      role="status"
    >
      <CheckCircle className="h-4 w-4" />
      <span className="text-sm text-center">
        You’re on the waitlist. We’ll email you at launch.
      </span>
    </motion.div>
  );
}

function kfmt(n) {
  if (n >= 1_000_000)
    return (n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n % 1_000 ? 1 : 0) + "k";
  return String(n);
}

function SignedUpBadge({ count }) {
  const colors = ["#0a0a0a", "#262626", "#525252"];
  return (
    <div
      className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/12 backdrop-blur-sm pl-2 pr-2.5 py-0.5 shadow-[0_2px_10px_rgba(0,0,0,0.25)]"
      aria-live="polite"
    >
      <div className="flex -space-x-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-5 w-5 rounded-full ring-1 ring-black/30"
            style={{ backgroundColor: colors[i] }}
            aria-hidden
          />
        ))}
        <span className="h-5 w-5 rounded-full grid place-items-center text-[10px] text-black ring-1 ring-black/20 bg-white">
          <Users className="h-3 w-3" aria-hidden />
        </span>
      </div>
      <span className="text-xs md:text-sm text-white/93" style={{ textShadow: '0 1px 6px rgba(255,255,255,0.1)' }}>
        <span className="font-semibold">{kfmt(count)}</span>{" "}
        <span className="opacity-85">signed up</span>
      </span>
    </div>
  );
}

export default function WaitlistForm({ onSuccess }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [totalSignups, setTotalSignups] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const prefersReduced = useReducedMotion();
  const cardRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/waitlist`, {
          method: "GET",
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok && typeof data.totalSignups === "number") {
          setTotalSignups(data.totalSignups);
        }
      } catch {
        return null;
      }
    })();
  }, []);

  useEffect(() => {
    if (prefersReduced) return;
    const el = cardRef.current;
    if (!el) return;
    function onMove(ev) {
      const r = el.getBoundingClientRect();
      const x = (ev.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const y = (ev.clientY - (r.top + r.height / 2)) / (r.height / 2);
      el.style.setProperty("--rx", `${y * -3}deg`);
      el.style.setProperty("--ry", `${x * 3}deg`);
    }
    function reset() {
      el.style.setProperty("--rx", `0deg`);
      el.style.setProperty("--ry", `0deg`);
    }
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", reset);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", reset);
    };
  }, [prefersReduced]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setErrorMsg("");
    
    const fn = firstName.trim().replace(/\0/g, "").replace(/[\x00-\x1F\x7F]/g, "");
    const ln = lastName.trim().replace(/\0/g, "").replace(/[\x00-\x1F\x7F]/g, "");
    const em = email.trim().toLowerCase().replace(/\0/g, "").replace(/[\x00-\x1F\x7F]/g, "");
    
    if (!fn) return setErrorMsg("Enter your first name.");
    if (!ln) return setErrorMsg("Enter your last name.");
    if (!em) return setErrorMsg("Enter your email.");
    
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(em) || em.length > 254) {
      return setErrorMsg("Use a valid email.");
    }
    
    const fullName = `${fn} ${ln}`;
    if (fullName.length > 120) {
      return setErrorMsg("Name is too long.");
    }
    
    setLoading(true);
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 5000);
    try {
      const res = await fetch(`${API_URL}/api/waitlist`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ name: fullName, email: em }),
        signal: ac.signal,
        credentials: "omit", // Don't send cookies
      });
      clearTimeout(to);
      if (res.status === 204 || res.ok) {
        setFirstName("");
        setLastName("");
        setEmail("");
        setTotalSignups((v) => (typeof v === "number" ? v + 1 : 1));
        setSuccess(true);
        if (onSuccess) onSuccess();
      } else {
        const data = await res.json().catch(() => ({}));
        setSuccess(false);
        if (res.status === 429) {
          setErrorMsg(data.error || "Too many requests. Please try again later.");
        } else {
          setErrorMsg(data.error || "Something went wrong.");
        }
      }
    } catch (err) {
      setSuccess(false);
      if (err.name === "AbortError") {
        setErrorMsg("Request timed out. Please try again.");
      } else {
        setErrorMsg("Network error. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full relative">
      <motion.div
        ref={cardRef}
        className="relative mx-auto w-full px-3 xs:px-4 sm:px-6 max-w-[20rem] xs:max-w-[22rem] sm:max-w-[28rem] md:max-w-[36rem] lg:max-w-[56rem]"
        initial={{ opacity: 0, scale: 0.99 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.25 }}
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateX(var(--rx,0)) rotateY(var(--ry,0))",
        }}
      >
        <div className="pointer-events-none absolute -inset-0.5 rounded-3xl bg-[radial-gradient(120px_80px_at_20%_0%,rgba(255,255,255,.15),transparent),radial-gradient(120px_80px_at_80%_100%,rgba(255,255,255,.12),transparent)] blur-md" />
        <Card className="relative overflow-hidden rounded-3xl bg-black/70 backdrop-blur-xl border border-white/16 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_2px_8px_rgba(255,255,255,0.05)]">
          <span className="pointer-events-none absolute inset-px rounded-[22px] bg-gradient-to-b from-white/12 to-transparent" />
          <CardHeader className="relative z-10 flex flex-col items-center justify-center text-center px-3 pt-2 pb-1 md:px-5 md:pt-3 md:pb-2 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <PenTool className="h-6 w-6 text-white/88" aria-hidden style={{ filter: 'drop-shadow(0 1px 8px rgba(255,255,255,0.15))' }} />
              <CardTitle className="text-white text-2xl md:text-3xl font-extrabold" style={{ textShadow: '0 2px 20px rgba(255,255,255,0.2)' }}>
                Early access
              </CardTitle>
            </div>
            {typeof totalSignups === "number" && (
              <SignedUpBadge count={totalSignups} />
            )}
          </CardHeader>
          <CardContent className="relative z-10">
            <SuccessNote show={success} />
            <ErrorBanner message={errorMsg} />
            <p className="mb-3 text-sm md:text-base text-white/93 text-center" style={{ textShadow: '0 1px 10px rgba(255,255,255,0.1)' }}>
              Sign up for launch updates.
            </p>
            <form onSubmit={handleSubmit} noValidate className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="group relative">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 !text-black/60 pointer-events-none" />
                  <Input
                    placeholder="First name"
                    value={firstName}
                    onChange={(ev) => setFirstName(ev.target.value)}
                    className="ink-input h-12 pl-10 rounded-xl !bg-white !text-black !placeholder:text-black/60 !border !border-black/25 focus-visible:!ring-2 focus-visible:!ring-black/40 focus-visible:!border-black/40 text-center shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                    autoComplete="off"
                    spellCheck={false}
                    required
                  />
                </div>
                <div className="group relative">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 !text-black/60 pointer-events-none" />
                  <Input
                    placeholder="Last name"
                    value={lastName}
                    onChange={(ev) => setLastName(ev.target.value)}
                    className="ink-input h-12 pl-10 rounded-xl !bg-white !text-black !placeholder:text-black/60 !border !border-black/25 focus-visible:!ring-2 focus-visible:!ring-black/40 focus-visible:!border-black/40 text-center shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                    autoComplete="off"
                    spellCheck={false}
                    required
                  />
                </div>
              </div>
              <div className="group relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 !text-black/60 pointer-events-none" />
                <Input
                  type="email"
                  placeholder="you@inkmail.com"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  className="ink-input h-12 pl-10 rounded-xl !bg-white !text-black !placeholder:text-black/60 !border !border-black/25 focus-visible:!ring-2 focus-visible:!ring-black/40 focus-visible:!border-black/40 text-center shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                  autoComplete="off"
                  spellCheck={false}
                  required
                />
              </div>
              <div className="pt-1.5">
                <motion.button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  initial={false}
                  whileHover={
                    prefersReduced
                      ? {}
                      : {
                          y: -2,
                          backgroundPosition: "100% 0%",
                          boxShadow:
                            "0px 10px 30px rgba(255,255,255,0.06), 0 0 0 1px rgba(255,255,255,0.18) inset",
                          letterSpacing: "0.3px",
                        }
                  }
                  whileTap={prefersReduced ? {} : { y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="group relative w-full h-14 rounded-2xl text-white font-semibold tracking-tight text-xl md:text-2xl outline-none ring-0 border border-white/18 shadow-[0_8px_28px_rgba(0,0,0,0.4),0_2px_8px_rgba(255,255,255,0.08)] focus-visible:ring-2 focus-visible:ring-white/35 disabled:opacity-70 overflow-hidden"
                  style={{ textShadow: '0 1px 12px rgba(255,255,255,0.15)' }}
                  style={{
                    backgroundImage:
                      "linear-gradient(120deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.14) 100%), radial-gradient(160px 100px at 20% 0%, rgba(255,255,255,0.10), transparent), radial-gradient(160px 100px at 80% 100%, rgba(255,255,255,0.08), transparent)",
                    backgroundBlendMode: "screen, normal, normal",
                    backgroundSize: "200% 200%, auto, auto",
                    backgroundPosition: "0% 0%, center, center",
                    WebkitBackdropFilter: "saturate(120%)",
                    backdropFilter: "saturate(120%)",
                  }}
                >
                  <span className="relative z-10 transition-[letter-spacing] duration-300 ease-out">
                    Join the Inklist
                  </span>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background:
                        "radial-gradient(200px 120px at 30% 0%, rgba(255,255,255,0.07), transparent 60%), radial-gradient(200px 120px at 70% 100%, rgba(255,255,255,0.06), transparent 60%)",
                    }}
                  />
                </motion.button>
              </div>
            </form>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-white/75">
              <div className="rounded-lg border border-white/12 bg-white/[0.06] backdrop-blur-sm px-2 py-1.5 grid place-items-center text-center shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
                No spam
              </div>
              <div className="rounded-lg border border-white/12 bg-white/[0.06] backdrop-blur-sm px-2 py-1.5 grid place-items-center text-center shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
                One update stream
              </div>
              <div className="rounded-lg border border-white/12 bg-white/[0.06] backdrop-blur-sm px-2 py-1.5 grid place-items-center text-center shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
                Launch notice
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}