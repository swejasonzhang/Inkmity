"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { PenTool, Mail, User, AlertTriangle, CheckCircle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const API_URL = import.meta.env.VITE_API_URL;

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="mb-3 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-100"
      role="alert"
    >
      <AlertTriangle className="h-4 w-4" />
      <span className="text-sm">{message}</span>
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
      className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-emerald-100"
      role="status"
    >
      <CheckCircle className="h-4 w-4" />
      <span className="text-sm">
        You’re on the waitlist. We’ll email you at launch.
      </span>
    </motion.div>
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
        if (res.ok && typeof data.totalSignups === "number")
          setTotalSignups(data.totalSignups);
      } catch (e) {
        void e;
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

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(false), 600);
    return () => clearTimeout(t);
  }, [success]);

  const signupCta = useMemo(
    () =>
      totalSignups && totalSignups >= 100
        ? "Join 100+ early members"
        : "Claim your spot",
    [totalSignups]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    const fn = firstName.trim();
    const ln = lastName.trim();
    const em = email.trim();
    if (!fn) return setErrorMsg("Enter your first name.");
    if (!ln) return setErrorMsg("Enter your last name.");
    if (!em) return setErrorMsg("Enter your email.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))
      return setErrorMsg("Use a valid email.");
    setSuccess(true);
    if (onSuccess) onSuccess();
    setLoading(true);
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 5000);
    try {
      const res = await fetch(`${API_URL}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${fn} ${ln}`, email: em }),
        signal: ac.signal,
      });
      clearTimeout(to);
      if (res.status === 204) {
        setFirstName("");
        setLastName("");
        setEmail("");
        setTotalSignups((v) => (typeof v === "number" ? v + 1 : 1));
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSuccess(false);
        setErrorMsg(data.error || "Something went wrong.");
        return;
      }
      setFirstName("");
      setLastName("");
      setEmail("");
      setTotalSignups((v) => (typeof v === "number" ? v + 1 : 1));
    } catch {
      setSuccess(false);
      setErrorMsg("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full relative">
      <motion.div
        ref={cardRef}
        className="relative mx-auto max-w-3xl"
        initial={{ opacity: 0, scale: 0.99 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.25 }}
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateX(var(--rx,0)) rotateY(var(--ry,0))",
        }}
      >
        <div className="pointer-events-none absolute -inset-0.5 rounded-3xl bg-[radial-gradient(120px_80px_at_20%_0%,rgba(255,255,255,.12),transparent),radial-gradient(120px_80px_at_80%_100%,rgba(255,255,255,.1),transparent)] blur-md" />
        <Card className="relative overflow-hidden rounded-3xl bg-black/65 backdrop-blur-xl border border-white/12 shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
          <span className="pointer-events-none absolute inset-px rounded-[22px] bg-gradient-to-b from-white/10 to-transparent" />
          <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-white/80" aria-hidden />
              <CardTitle className="text-white text-base">
                Early access
              </CardTitle>
            </div>
            <CardDescription className="text-white/70">
              {typeof totalSignups === "number"
                ? `${totalSignups}+ joined`
                : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <SuccessNote show={success} />
            <ErrorBanner message={errorMsg} />
            <p className="mb-3 text-sm text-white/85">
              Sign up for updates. We will email you at launch.
            </p>
            <form onSubmit={handleSubmit} noValidate className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="group relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 !text-black/60 pointer-events-none" />
                  <Input
                    placeholder="First name"
                    value={firstName}
                    onChange={(ev) => setFirstName(ev.target.value)}
                    className="ink-input h-12 pl-10 rounded-xl !bg-white !text-black !placeholder:text-black/60 !border !border-black/30 focus-visible:!ring-0 focus-visible:!border-black"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className="group relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 !text-black/60 pointer-events-none" />
                  <Input
                    placeholder="Last name"
                    value={lastName}
                    onChange={(ev) => setLastName(ev.target.value)}
                    className="ink-input h-12 pl-10 rounded-xl !bg-white !text-black !placeholder:text-black/60 !border !border-black/30 focus-visible:!ring-0 focus-visible:!border-black"
                    autoComplete="off"
                    spellCheck={false}
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
                  className="ink-input h-12 pl-10 rounded-xl !bg-white !text-black !placeholder:text-black/60 !border !border-black/30 focus-visible:!ring-0 focus-visible:!border-black"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="group relative h-12 w-full rounded-2xl !bg-black !text-white !ring-1 !ring-white/40 hover:!ring-white transition-[transform,box-shadow] duration-100 active:translate-y-0"
              >
                {loading ? (
                  "Saving…"
                ) : (
                  <span className="relative z-10 inline-flex items-center justify-center gap-2">
                    {signupCta.toUpperCase()}
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-[10px] text-white">
                      →
                    </span>
                  </span>
                )}
              </Button>
            </form>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-white/65">
              <div className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1.5 grid place-items-center text-center">
                No spam
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1.5 grid place-items-center text-center">
                One update stream
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1.5 grid place-items-center text-center">
                Launch notice
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
