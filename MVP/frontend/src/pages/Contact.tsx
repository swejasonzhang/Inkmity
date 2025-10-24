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
        <div className="relative min-h-dvh bg-app text-app flex flex-col overflow-hidden">
            <Header />
            <main className="relative z-10 grid place-items-center flex-1 px-4 py-8">
                <motion.section
                    initial={{ opacity: 0, y: 18, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 220, damping: 24 }}
                    className="w-full max-w-3xl"
                >
                    <div
                        className="ink-card overflow-hidden"
                        style={{
                            background:
                                "linear-gradient(180deg, color-mix(in oklab, var(--card), transparent 0%) 0%, color-mix(in oklab, var(--card), black 8%) 100%), radial-gradient(1200px 400px at 50% -10%, color-mix(in oklab, var(--elevated), white 4%) 0%, transparent 60%)",
                        }}
                    >
                        <div className="ink-gloss" />
                        <div className="px-6 sm:px-10 pt-8 pb-3">
                            <div className="flex items-center justify-center gap-3">
                                <span className="inline-grid place-items-center rounded-xl border border-app/40 bg-elevated p-2">
                                    <Mail size={18} />
                                </span>
                                <h1 className="text-[28px] sm:text-[32px] leading-none font-extrabold tracking-tight">Contact</h1>
                            </div>
                            <div className="mx-auto mt-4 h-[2px] w-28 rounded-full bg-elevated" />
                            <p className="mt-4 text-subtle text-sm sm:text-base leading-relaxed text-center">
                                Share feedback, ideas, or issues. <span className="font-bold text-app">Jason</span> reads every message.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="px-6 sm:px-10 pb-9">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label className="mb-1 block text-xs text-subtle text-center" htmlFor="name">
                                        Name
                                    </Label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
                                            <User size={16} />
                                        </span>
                                        <InputClearPlaceholder
                                            id="name"
                                            keepCenter
                                            className="pl-9"
                                            value={form.name}
                                            onChange={onChange("name")}
                                            placeholder="Your name"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label className="mb-1 block text-xs text-subtle text-center" htmlFor="email">
                                        Email
                                    </Label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
                                            <Mail size={16} />
                                        </span>
                                        <InputClearPlaceholder
                                            id="email"
                                            type="email"
                                            keepCenter
                                            className="pl-9"
                                            value={form.email}
                                            onChange={onChange("email")}
                                            placeholder="you@example.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4">
                                <Label className="mb-1 block text-xs text-subtle text-center" htmlFor="subject">
                                    Subject
                                </Label>
                                <InputClearPlaceholder
                                    id="subject"
                                    keepCenter
                                    value={form.subject}
                                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                                    placeholder="What’s this about?"
                                />
                            </div>

                            <div className="mt-4">
                                <Label className="mb-1 block text-xs text-subtle text-center">Message</Label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute right-3 top-3 opacity-60">
                                        <MessageSquareText size={16} />
                                    </span>
                                    <AutoCenterTextarea
                                        value={form.message}
                                        onChange={(v) => setForm((f) => ({ ...f, message: v }))}
                                        placeholder="Share bugs, feature ideas, or anything that would make Inkmity better."
                                        rows={8}
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

                            <div className="mt-6 flex flex-col items-center gap-3">
                                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="group relative w-full sm:w-auto rounded-2xl border border-app/70 bg-elevated px-5 py-2 hover:-translate-y-[1px] active:translate-y-0 transition"
                                    >
                                        <span className="inline-flex items-center gap-2">
                                            {loading ? (
                                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-app/40 border-t-transparent" />
                                            ) : (
                                                <Send size={16} className="transition group-hover:translate-x-[2px]" />
                                            )}
                                            {loading ? "Sending..." : "Send message"}
                                        </span>
                                    </Button>
                                </motion.div>

                                <p className="text-xs text-muted">
                                    Prefer email?{" "}
                                    <a href="mailto:jason@inkmity.com" className="underline">
                                        jason@inkmity.com
                                    </a>
                                </p>

                                <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-sm text-subtle">
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
                    "md:inset-0 md:left-0 md:translate-x-0 md:w-full md:h-full",
                    "object-contain md:object-cover",
                    "pointer-events-none video-bg",
                ].join(" ")}
                aria-hidden
            >
                <source src="/Landing.mp4" type="video/mp4" />
            </video>
        </div>
    );
}