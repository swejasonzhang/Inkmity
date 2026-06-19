import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { Mail, Send, User, MessageSquareText } from "lucide-react";
import Header from "@/components/header/Header";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import VideoBackground from "@/components/VideoBackground";

const ZWSP = "​";
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
                "bg-card border border-app/50 text-app placeholder:text-app/50",
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
    rows = 3,
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
                <div className="placeholder-overlay text-app/50">
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
    usePageMeta({
        title: "Contact",
        description: "Get in touch with the Inkmity team — questions, support, partnerships, and press.",
    });
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
        const subject = form.subject || "Contact";
        const body = `From: ${form.name} <${form.email}>\n\n${form.message}`;
        const href = `mailto:jason@inkmity.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
        <div className="h-svh overflow-hidden flex flex-col text-app">
            <VideoBackground />

            <Header />

            <main className="flex-1 min-h-0 overflow-y-auto grid place-items-center px-4 sm:px-6 py-4">
                <motion.div
                    initial={{ opacity: 0, y: 18, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 220, damping: 24 }}
                    className="w-full max-w-sm sm:max-w-md"
                >
                    <div className="rounded-xl border border-app bg-card text-app overflow-hidden w-full shadow-sm">
                        <div className="flex flex-col items-center px-4 pt-4 pb-2">
                            <div className="flex items-center justify-center gap-2">
                                <span className="inline-grid place-items-center rounded-xl border border-app/40 bg-elevated p-1.5">
                                    <Mail className="h-4 w-4" />
                                </span>
                                <h1 className="text-lg font-extrabold tracking-tight leading-none">Contact</h1>
                            </div>
                            <p className="text-subtle text-xs leading-relaxed text-center mt-2">
                                Share feedback, ideas, or issues.{" "}
                                <span className="font-bold text-app">Jason</span> reads every message.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col items-center px-4 pb-4 gap-2">
                            <div className="grid grid-cols-2 gap-2 w-full">
                                <div className="flex flex-col gap-1">
                                    <Label className="text-subtle text-xs text-center" htmlFor="name">Name</Label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-60">
                                            <User className="h-3.5 w-3.5" />
                                        </span>
                                        <InputClearPlaceholder
                                            id="name"
                                            keepCenter
                                            className="pl-8 pr-3 h-8"
                                            value={form.name}
                                            onChange={onChange("name")}
                                            placeholder="Your name"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <Label className="text-subtle text-xs text-center" htmlFor="email">Email</Label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-60">
                                            <Mail className="h-3.5 w-3.5" />
                                        </span>
                                        <InputClearPlaceholder
                                            id="email"
                                            type="email"
                                            keepCenter
                                            className="pl-8 pr-3 h-8"
                                            value={form.email}
                                            onChange={onChange("email")}
                                            placeholder="you@example.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1 w-full">
                                <Label className="text-subtle text-xs text-center" htmlFor="subject">Subject</Label>
                                <InputClearPlaceholder
                                    id="subject"
                                    keepCenter
                                    className="px-3 h-8"
                                    value={form.subject}
                                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                                    placeholder="What's this about?"
                                />
                            </div>

                            <div className="flex flex-col gap-1 w-full">
                                <Label className="text-subtle text-xs text-center">Message</Label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute right-3 top-3 opacity-50">
                                        <MessageSquareText className="h-3.5 w-3.5" />
                                    </span>
                                    <AutoCenterTextarea
                                        value={form.message}
                                        onChange={(v) => setForm((f) => ({ ...f, message: v }))}
                                        placeholder="Share bugs, feature ideas, or anything that would make Inkmity better."
                                        rows={3}
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

                            <div className="flex flex-col items-center gap-1.5 w-full">
                                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full flex justify-center">
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="group rounded-2xl border border-app/70 bg-elevated hover:-translate-y-px active:translate-y-0 transition px-6 py-1.5 text-sm"
                                    >
                                        <span className="inline-flex items-center justify-center gap-2">
                                            {loading ? (
                                                <span className="inline-block animate-spin rounded-full border-2 border-app/40 border-t-transparent h-3.5 w-3.5" />
                                            ) : (
                                                <Send className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                                            )}
                                            {loading ? "Sending..." : "Send message"}
                                        </span>
                                    </Button>
                                </motion.div>

                                <p className="text-muted text-center text-xs">
                                    Prefer email?{" "}
                                    <a href="mailto:jason@inkmity.com" className="underline">jason@inkmity.com</a>
                                </p>

                                <div className="flex flex-wrap items-center justify-center gap-2 text-subtle text-xs">
                                    <a href="https://www.linkedin.com/in/swejasonzhang" target="_blank" rel="noreferrer" className="underline hover:text-app" aria-label="LinkedIn">
                                        LinkedIn / swejasonzhang
                                    </a>
                                    <span>•</span>
                                    <a href="https://instagram.com/inkmity" target="_blank" rel="noreferrer" className="underline hover:text-app" aria-label="Instagram">
                                        Instagram / inkmity
                                    </a>
                                    <span>•</span>
                                    <a href="https://www.tiktok.com/@inkmity" target="_blank" rel="noreferrer" className="underline hover:text-app" aria-label="TikTok">
                                        TikTok / inkmity
                                    </a>
                                </div>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
