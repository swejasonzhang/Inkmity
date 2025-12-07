import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { Mail, Send, User, MessageSquareText } from "lucide-react";
import Header from "@/components/header/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ZWSP = "\u200B";
const rmZWSP = (s: string) => s.replace(/\u200B/g, "");

function InputClearPlaceholder(
    props: React.ComponentProps<typeof Input> & { keepCenter?: boolean }
) {
    const { placeholder, keepCenter, className, onFocus, onBlur, ...rest } = props;
    const [ph, setPh] = useState(placeholder ?? "");
    return (
        <Input
            {...rest}
            placeholder={ph}
            onFocus={(e) => {
                setPh("");
                onFocus?.(e);
            }}
            onBlur={(e) => {
                if (!e.currentTarget.value) setPh(placeholder ?? "");
                onBlur?.(e);
            }}
            className={[
                keepCenter ? "text-center placeholder:text-center" : "",
                "bg-card border border-app/50 text-app",
                "focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
                className || "",
            ]
                .filter(Boolean)
                .join(" ")}
        />
    );
}

function AutoCenterTextarea({
    value,
    onChange,
    placeholder,
    rows = 8,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    rows?: number;
}) {
    const ref = useRef<HTMLDivElement | null>(null);
    const [isEmpty, setIsEmpty] = useState(value.trim().length === 0);
    const [isFocused, setIsFocused] = useState(false);
    const [showPlaceholder, setShowPlaceholder] = useState(!isFocused && isEmpty);

    useEffect(() => {
        if (!ref.current) return;
        const empty = value.trim().length === 0;
        if (empty) {
            ref.current.innerText = "";
            setIsEmpty(true);
            setShowPlaceholder(!isFocused);
            centerCaret(ref.current);
        } else {
            setIsEmpty(false);
            setShowPlaceholder(false);
            if (ref.current.innerText !== value) ref.current.innerText = value;
            clearCenter(ref.current);
        }
    }, [value, isFocused]);

    const lineHeightPx = (el: HTMLElement) => {
        const lh = getComputedStyle(el).lineHeight;
        if (lh === "normal") return 24;
        const n = parseFloat(lh);
        return Number.isFinite(n) ? n : 24;
    };

    const centerCaret = (el: HTMLElement) => {
        const h = el.clientHeight || rows * 24;
        const lh = lineHeightPx(el);
        const pad = Math.max(0, (h - lh) / 2);
        el.style.paddingTop = `${pad}px`;
        el.style.paddingBottom = `${pad}px`;
        el.style.textAlign = "center";
    };

    const clearCenter = (el: HTMLElement) => {
        el.style.paddingTop = "";
        el.style.paddingBottom = "";
        el.style.textAlign = "";
    };

    const placeCaretEnd = (el: HTMLElement) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        r.collapse(false);
        const s = window.getSelection();
        if (!s) return;
        s.removeAllRanges();
        s.addRange(r);
    };

    const onFocus = () => {
        if (!ref.current) return;
        setIsFocused(true);
        setShowPlaceholder(false);
        if (isEmpty) {
            ref.current.innerText = ZWSP;
            centerCaret(ref.current);
            placeCaretEnd(ref.current);
        }
    };

    const onInput: React.FormEventHandler<HTMLDivElement> = (e) => {
        const el = e.currentTarget;
        const raw = rmZWSP(el.innerText);
        const empty = raw.trim().length === 0;
        setIsEmpty(empty);
        onChange(raw);
        if (empty && isFocused) centerCaret(el);
        else clearCenter(el);
    };

    const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
        if (!ref.current) return;
        if (isEmpty && (e.key.length === 1 || e.key === "Enter")) {
            ref.current.innerText = "";
            clearCenter(ref.current);
        }
    };

    const onBlur = () => {
        setIsFocused(false);
        const t = rmZWSP(ref.current?.innerText ?? "").trim();
        if (t.length === 0 && ref.current) {
            ref.current.innerText = "";
            setIsEmpty(true);
            setShowPlaceholder(true);
            centerCaret(ref.current);
        }
    };

    return (
        <div className="center-wrap">
            <div
                ref={ref}
                className={`center-area text-app input-ink focus:outline-none whitespace-pre-wrap ${isEmpty ? "is-empty" : ""}`}
                style={{ ["--cen-min-h" as any]: `${rows * 24}px` }}
                contentEditable
                role="textbox"
                aria-multiline="true"
                spellCheck
                onFocus={onFocus}
                onInput={onInput}
                onKeyDown={onKeyDown}
                onBlur={onBlur}
                suppressContentEditableWarning
            />
            {showPlaceholder && !isFocused && (
                <div className="placeholder-overlay text-muted">
                    <span className="text-center">
                        {placeholder}
                        <span className="blink">|</span>
                    </span>
                </div>
            )}
        </div>
    );
}

export default function Contact() {
    const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
    const [loading, setLoading] = useState(false);
    const [hp, setHp] = useState("");
    const startRef = useRef<number>(Date.now());

    const onChange =
        (key: keyof typeof form) =>
            (e: React.ChangeEvent<HTMLInputElement>) =>
                setForm((f) => ({ ...f, [key]: e.target.value }));

    const validEmail = (v: string) => /\S+@\S+\.\S+/.test(v);

    const triggerMailto = () => {
        const to = "jason@inkmity.com";
        const subject = form.subject || "Contact";
        const body = `From: ${form.name} <${form.email}>\n\n${form.message}`;
        const href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        const a = document.createElement("a");
        a.href = href;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (hp.trim().length > 0) return;
        const elapsed = Date.now() - startRef.current;
        if (elapsed < 2000) {
            toast.error("Slow down and try again.");
            return;
        }
        if (!form.name || !validEmail(form.email) || !form.message.trim()) {
            toast.error("Please complete name, email, and message.");
            return;
        }
        setLoading(true);
        try {
            triggerMailto();
            setForm({ name: "", email: "", subject: "", message: "" });
            startRef.current = Date.now();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative h-dvh bg-app text-app flex flex-col overflow-hidden">
            <div style={{ marginBottom: 0, paddingBottom: 0 }}>
                <Header />
            </div>
            <main className="relative z-10 flex items-center justify-center flex-1 overflow-y-auto sm:overflow-y-visible" style={{ padding: 'clamp(0.75rem, 1.2vmin + 0.6vw, 1.5rem) clamp(1rem, 2vmin + 1vw, 3rem)', minHeight: 0, marginTop: 0, maxHeight: '100%' }}>
                <motion.section
                    initial={{ opacity: 0, y: 18, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 220, damping: 24 }}
                    className="flex items-center justify-center w-full"
                    style={{ maxWidth: 'clamp(20rem, 50vw, 42rem)', margin: '0 auto' }}
                >
                    <div
                        className="ink-card overflow-hidden w-full mx-auto"
                        style={{
                            background:
                                "linear-gradient(180deg, color-mix(in oklab, var(--card), transparent 0%) 0%, color-mix(in oklab, var(--card), black 8%) 100%), radial-gradient(1200px 400px at 50% -10%, color-mix(in oklab, var(--elevated), white 4%) 0%, transparent 60%)",
                        }}
                    >
                        <div className="ink-gloss" />
                        <div className="flex flex-col items-center" style={{ padding: 'clamp(1rem, 1.5vmin + 0.8vw, 2rem)' }}>
                            <div className="flex items-center justify-center w-full" style={{ gap: 'clamp(0.5rem, 0.7vmin + 0.4vw, 1rem)' }}>
                                <span className="inline-grid place-items-center rounded-xl border border-app/40 bg-elevated" style={{ padding: 'clamp(0.375rem, 0.5vmin + 0.3vw, 0.75rem)' }}>
                                    <Mail style={{ width: 'clamp(1rem, 1.2vmin + 0.6vw, 1.5rem)', height: 'clamp(1rem, 1.2vmin + 0.6vw, 1.5rem)' }} />
                                </span>
                                <h1 className="leading-none font-extrabold tracking-tight" style={{ fontSize: 'clamp(1.375rem, 2vmin + 1vw, 1.75rem)' }}>Contact</h1>
                            </div>
                            <div className="mx-auto rounded-full bg-elevated" style={{ marginTop: 'clamp(0.75rem, 1vmin + 0.5vw, 1.25rem)', height: '2px', width: 'clamp(6rem, 8vmin + 4vw, 8rem)' }} />
                            <p className="text-subtle leading-relaxed text-center w-full" style={{ marginTop: 'clamp(0.75rem, 1vmin + 0.5vw, 1.25rem)', fontSize: 'clamp(0.75rem, 0.9vmin + 0.4vw, 0.875rem)' }}>
                                Share feedback, ideas, or issues. <span className="font-bold text-app">Jason</span> reads every message.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col items-center w-full" style={{ padding: '0 clamp(1rem, 1.5vmin + 0.8vw, 2rem) clamp(1rem, 1.5vmin + 0.8vw, 2rem)' }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 w-full" style={{ gap: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem)' }}>
                                <div className="flex flex-col items-center">
                                    <Label className="text-subtle w-full block text-center" htmlFor="name" style={{ marginBottom: 'clamp(0.375rem, 0.6vmin + 0.3vw, 0.75rem)', fontSize: 'clamp(0.75rem, 0.9vmin + 0.4vw, 0.875rem)', textAlign: 'center' }}>
                                        Name
                                    </Label>
                                    <div className="relative w-full">
                                        <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 opacity-70" style={{ left: 'clamp(0.75rem, 1vmin + 0.5vw, 1.25rem)' }}>
                                            <User style={{ width: 'clamp(0.875rem, 1vmin + 0.5vw, 1rem)', height: 'clamp(0.875rem, 1vmin + 0.5vw, 1rem)' }} />
                                        </span>
                                        <InputClearPlaceholder
                                            id="name"
                                            keepCenter
                                            className="text-sm w-full"
                                            style={{ paddingLeft: 'clamp(2.25rem, 2.8vmin + 1.3vw, 3rem)', paddingRight: 'clamp(0.75rem, 1vmin + 0.5vw, 1.25rem)' }}
                                            value={form.name}
                                            onChange={onChange("name")}
                                            placeholder="Your name"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col items-center">
                                    <Label className="text-subtle w-full block text-center" htmlFor="email" style={{ marginBottom: 'clamp(0.375rem, 0.6vmin + 0.3vw, 0.75rem)', fontSize: 'clamp(0.75rem, 0.9vmin + 0.4vw, 0.875rem)', textAlign: 'center' }}>
                                        Email
                                    </Label>
                                    <div className="relative w-full">
                                        <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 opacity-70" style={{ left: 'clamp(0.75rem, 1vmin + 0.5vw, 1.25rem)' }}>
                                            <Mail style={{ width: 'clamp(0.875rem, 1vmin + 0.5vw, 1rem)', height: 'clamp(0.875rem, 1vmin + 0.5vw, 1rem)' }} />
                                        </span>
                                        <InputClearPlaceholder
                                            id="email"
                                            type="email"
                                            keepCenter
                                            className="text-sm w-full"
                                            style={{ paddingLeft: 'clamp(2.25rem, 2.8vmin + 1.3vw, 3rem)', paddingRight: 'clamp(0.75rem, 1vmin + 0.5vw, 1.25rem)' }}
                                            value={form.email}
                                            onChange={onChange("email")}
                                            placeholder="you@example.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-center w-full" style={{ marginTop: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem)' }}>
                                <Label className="text-subtle w-full block text-center" htmlFor="subject" style={{ marginBottom: 'clamp(0.375rem, 0.6vmin + 0.3vw, 0.75rem)', fontSize: 'clamp(0.75rem, 0.9vmin + 0.4vw, 0.875rem)', textAlign: 'center' }}>
                                    Subject
                                </Label>
                                <InputClearPlaceholder
                                    id="subject"
                                    keepCenter
                                    className="text-sm w-full"
                                    style={{ paddingLeft: 'clamp(0.75rem, 1vmin + 0.5vw, 1.25rem)', paddingRight: 'clamp(0.75rem, 1vmin + 0.5vw, 1.25rem)' }}
                                    value={form.subject}
                                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                                    placeholder="What's this about?"
                                />
                            </div>

                            <div className="flex flex-col items-center w-full" style={{ marginTop: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem)' }}>
                                <Label className="text-subtle w-full block text-center" style={{ marginBottom: 'clamp(0.375rem, 0.6vmin + 0.3vw, 0.75rem)', fontSize: 'clamp(0.75rem, 0.9vmin + 0.4vw, 0.875rem)', textAlign: 'center' }}>Message</Label>
                                <div className="relative w-full">
                                    <span className="pointer-events-none absolute opacity-60" style={{ right: 'clamp(0.75rem, 1vmin + 0.5vw, 1.25rem)', top: 'clamp(0.75rem, 1vmin + 0.5vw, 1.25rem)' }}>
                                        <MessageSquareText style={{ width: 'clamp(0.875rem, 1vmin + 0.5vw, 1rem)', height: 'clamp(0.875rem, 1vmin + 0.5vw, 1rem)' }} />
                                    </span>
                                    <AutoCenterTextarea
                                        value={form.message}
                                        onChange={(v) => setForm((f) => ({ ...f, message: v }))}
                                        placeholder="Share bugs, feature ideas, or anything that would make Inkmity better."
                                        rows={5}
                                    />
                                </div>
                            </div>

                            <input
                                tabIndex={-1}
                                autoComplete="off"
                                aria-hidden
                                value={hp}
                                onChange={(e) => setHp(e.target.value)}
                                className="hidden"
                                name="website"
                            />

                            <div className="flex flex-col items-center w-full" style={{ marginTop: 'clamp(0.75rem, 1.2vmin + 0.6vw, 1.5rem)', gap: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem)' }}>
                                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full flex justify-center">
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="group relative rounded-2xl border border-app/70 bg-elevated hover:-translate-y-[1px] active:translate-y-0 transition"
                                        style={{ 
                                            padding: 'clamp(0.5rem, 0.7vmin + 0.4vw, 0.875rem) clamp(1.5rem, 2vmin + 1vw, 2.5rem)',
                                            fontSize: 'clamp(0.875rem, 1vmin + 0.5vw, 1rem)'
                                        }}
                                    >
                                        <span className="inline-flex items-center justify-center" style={{ gap: 'clamp(0.5rem, 0.6vmin + 0.3vw, 0.75rem)' }}>
                                            {loading ? (
                                                <span className="inline-block animate-spin rounded-full border-2 border-app/40 border-t-transparent" style={{ width: 'clamp(0.875rem, 1vmin + 0.5vw, 1rem)', height: 'clamp(0.875rem, 1vmin + 0.5vw, 1rem)' }} />
                                            ) : (
                                                <Send style={{ width: 'clamp(0.875rem, 1vmin + 0.5vw, 1rem)', height: 'clamp(0.875rem, 1vmin + 0.5vw, 1rem)' }} className="transition group-hover:translate-x-[2px]" />
                                            )}
                                            {loading ? "Sending..." : "Send message"}
                                        </span>
                                    </Button>
                                </motion.div>

                                <p className="text-muted text-center" style={{ fontSize: 'clamp(0.75rem, 0.9vmin + 0.4vw, 0.875rem)' }}>
                                    Prefer email?{" "}
                                    <a href="mailto:jason@inkmity.com" className="underline">
                                        jason@inkmity.com
                                    </a>
                                </p>

                                <div className="flex flex-wrap items-center justify-center text-subtle w-full" style={{ gap: 'clamp(0.625rem, 0.8vmin + 0.4vw, 1rem)', fontSize: 'clamp(0.75rem, 0.9vmin + 0.4vw, 0.875rem)' }}>
                                    <a
                                        href="https://www.linkedin.com/in/swejasonzhang"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="underline hover:text-app"
                                        aria-label="LinkedIn"
                                    >
                                        LinkedIn / swejasonzhang
                                    </a>
                                    <span>•</span>
                                    <a
                                        href="https://instagram.com/inkmity"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="underline hover:text-app"
                                        aria-label="Instagram"
                                    >
                                        Instagram / inkmity
                                    </a>
                                    <span>•</span>
                                    <a
                                        href="https://www.tiktok.com/@inkmity"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="underline hover:text-app"
                                        aria-label="TikTok"
                                    >
                                        TikTok / inkmity
                                    </a>
                                </div>
                            </div>
                        </form>
                    </div>
                </motion.section>
            </main>

            <video
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                className={[
                    "fixed top-0 left-1/2 -translate-x-1/2 z-[1]",
                    "w-auto max-w-none",
                    "h-[100svh]",
                    "sm:inset-0 sm:left-0 sm:translate-x-0 sm:w-full sm:h-full",
                    "object-contain sm:object-cover",
                    "pointer-events-none video-bg",
                ].join(" ")}
                aria-hidden
            >
                <source src="/Landing.mp4" type="video/mp4" />
            </video>
        </div>
    );
}