import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import Header from "@/components/header/Header";

const Contact: React.FC = () => {
    const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
    const [loading, setLoading] = useState(false);

    const onChange =
        (key: keyof typeof form) =>
            (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                setForm((f) => ({ ...f, [key]: e.target.value }));

    const validEmail = (v: string) => /\S+@\S+\.\S+/.test(v);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !validEmail(form.email) || !form.message) {
            toast.error("Mind adding a quick message? Jason reads each one and acts on your feedback.");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error(await res.text());
            toast.success("Thanks! We’ll get back to you shortly.");
            setForm({ name: "", email: "", subject: "", message: "" });
        } catch {
            window.location.href = `mailto:jason@inkmity.com?subject=${encodeURIComponent(
                form.subject || "Contact"
            )}&body=${encodeURIComponent(`From: ${form.name} <${form.email}>\n\n${form.message}`)}`;
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-dvh bg-app text-app flex flex-col overflow-hidden">
            <Header />

            <main className="relative z-10 grid place-items-center h-[100svh] px-4 py-0">
                <div
                    className="w-full max-w-3xl mx-auto rounded-3xl border-2 border-app bg-card/90 backdrop-blur p-6 sm:p-10 text-center
               min-h-[0svh] max-h-[92svh] overflow-y-hidden"
                >
                    <h1 className="text-2xl sm:text-3xl font-bold">Contact</h1>

                    <p className="mt-2 text-subtle text-sm sm:text-base leading-relaxed">
                        Please enter your feedback or ideas. <span className="font-semibold">Jason</span> personally
                        reads every message and uses your input to improve the experience and plan future features.
                    </p>
                    <p className="mt-2 text-muted">
                        Have a question, found a bug, or want to partner? Drop us a note.
                    </p>

                    <form onSubmit={handleSubmit} className="mt-6 flex-1 flex flex-col items-center gap-4 overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl mx-auto">
                            <div>
                                <label className="block text-sm mb-1 text-subtle text-center">Name</label>
                                <input
                                    className="w-full rounded-2xl bg-card border-2 border-app text-app placeholder-[color:var(--muted)] px-3 py-2 outline-none focus:bg-elevated"
                                    value={form.name}
                                    onChange={onChange("name")}
                                    placeholder="Your name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm mb-1 text-subtle text-center">Email</label>
                                <input
                                    className="w-full rounded-2xl bg-card border-2 border-app text-app placeholder-[color:var(--muted)] px-3 py-2 outline-none focus:bg-elevated"
                                    value={form.email}
                                    onChange={onChange("email")}
                                    placeholder="you@example.com"
                                    type="email"
                                />
                            </div>
                        </div>

                        <div className="w-full max-w-xl mx-auto">
                            <label className="block text-sm mb-1 text-subtle text-center">Subject (optional)</label>
                            <input
                                className="w-full rounded-2xl bg-card border-2 border-app text-app placeholder-[color:var(--muted)] px-3 py-2 outline-none focus:bg-elevated"
                                value={form.subject}
                                onChange={onChange("subject")}
                                placeholder="What’s this about?"
                            />
                        </div>

                        <div className="w-full max-w-xl mx-auto flex flex-col">
                            <label className="block text-sm mb-1 text-subtle text-center">Message</label>
                            <textarea
                                className="w-full min-h-[140px] rounded-2xl bg-card border-2 border-app text-app placeholder-[color:var(--muted)] px-3 py-2 outline-none focus:bg-elevated"
                                value={form.message}
                                onChange={onChange("message")}
                                placeholder="Share bugs, feature ideas, or anything that would make Inkmity better. Jason reads every message."
                            />
                        </div>

                        <div className="mt-2 flex flex-col items-center">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:w-auto bg-elevated hover:bg-elevated text-app border-2 border-app"
                            >
                                {loading ? "Sending..." : "Send message"}
                            </Button>
                            <p className="text-xs text-muted mt-3">
                                Prefer email?{" "}
                                <a href="mailto:jason@inkmity.com" className="underline">
                                    jason@inkmity.com
                                </a>
                            </p>
                        </div>
                    </form>
                </div>
            </main>

            <video
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                className={[
                    "fixed top-0 left-1/2 -translate-x-1/2 z-[999]",
                    "w-auto max-w-none",
                    "h-[100svh]",
                    "md:inset-0 md:left-0 md:translate-x-0 md:w-full md:h-full",
                    "object-contain md:object-cover",
                    "pointer-events-none opacity-50 mix-blend-screen",
                ].join(" ")}
                aria-hidden
            >
                <source src="/Landing.mp4" type="video/mp4" />
            </video>
        </div>
    );
};

export default Contact;
