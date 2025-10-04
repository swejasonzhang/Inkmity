import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import Header from "@/components/dashboard/Header";

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
        <div className="min-h-dvh bg-gray-900 text-white flex flex-col">
            <Header />

            {/* Center the card; leave some outer padding so it doesn't hug edges */}
            <main className="flex-1 px-4 py-4 grid place-items-center">
                {/* Card fills most of the viewport height but leaves breathing room.
            min-h: target ~85% of viewport; max-h: ensure it never exceeds screen */}
                <div className="w-full max-w-3xl min-h-[82dvh] max-h-[calc(100dvh-2rem)] rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 sm:p-8 flex flex-col overflow-hidden">
                    <h1 className="text-center text-2xl sm:text-3xl font-bold">Contact</h1>
                    <p className="mt-2 text-center text-white/80 text-sm sm:text-base">
                        Please enter your feedback or ideas. <span className="font-semibold">Jason</span> personally
                        reads every message and uses your input to improve the experience and plan future features.
                    </p>
                    <p className="mt-2 text-center text-white/70">
                        Have a question, found a bug, or want to partner? Drop us a note.
                    </p>

                    {/* Form grows and scrolls within the card if content is tall */}
                    <form onSubmit={handleSubmit} className="mt-6 flex-1 flex flex-col overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm mb-1">Name</label>
                                <input
                                    className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 outline-none focus:ring-2 focus:ring-white/30"
                                    value={form.name}
                                    onChange={onChange("name")}
                                    placeholder="Your name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm mb-1">Email</label>
                                <input
                                    className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 outline-none focus:ring-2 focus:ring-white/30"
                                    value={form.email}
                                    onChange={onChange("email")}
                                    placeholder="you@example.com"
                                    type="email"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm mb-1">Subject (optional)</label>
                            <input
                                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 outline-none focus:ring-2 focus:ring-white/30"
                                value={form.subject}
                                onChange={onChange("subject")}
                                placeholder="What’s this about?"
                            />
                        </div>

                        <div className="mt-4 flex-1 flex flex-col">
                            <label className="block text-sm mb-1">Message</label>
                            <textarea
                                className="w-full flex-1 min-h-[140px] rounded-lg bg-white/10 border border-white/20 px-3 py-2 outline-none focus:ring-2 focus:ring-white/30"
                                value={form.message}
                                onChange={onChange("message")}
                                placeholder="Share bugs, feature ideas, or anything that would make Inkmity better. Jason reads every message."
                            />
                        </div>

                        <div className="mt-6 flex flex-col items-center sm:items-start">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-white"
                            >
                                {loading ? "Sending..." : "Send message"}
                            </Button>
                            <p className="text-xs text-white/50 mt-3">
                                Prefer email?{" "}
                                <a href="mailto:jason@inkmity.com" className="underline">
                                    jason@inkmity.com
                                </a>
                            </p>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default Contact;
