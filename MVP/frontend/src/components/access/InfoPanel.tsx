import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Search, MessageSquareText, Gift, Tag, BadgeCheck, CreditCard, FileText, LayoutGrid, CalendarDays } from "lucide-react";
import { slide } from "../../lib/animations";

type Props = {
    show: boolean;
    prefersReduced: boolean;
    hasError?: boolean;
    isPasswordHidden?: boolean;
    mode?: "signup" | "login";
    role?: "client" | "artist";
};

const loginProps = [
    { icon: Search, title: "Search that understands style", body: "Filter by technique, healed results, budget, and travel radius." },
    { icon: MessageSquareText, title: "Chat with full context", body: "Share references and approve sketches in one clean thread." },
    { icon: Gift, title: "Earn as you book", body: "Reward points stack with every session toward real perks." },
];

const clientProps = [
    { icon: Search, title: "Matched to your vision", body: "We surface artists whose healed work fits your style, budget, and city." },
    { icon: MessageSquareText, title: "Everything in one place", body: "Ideas, references, and decisions stay together — never lost in DMs." },
    { icon: Tag, title: "No surprises at checkout", body: "See honest quotes and real reviews before you ever put money down." },
    { icon: Gift, title: "Rewarded for every piece", body: "Collect points with each session and redeem them for real perks." },
    { icon: BadgeCheck, title: "Start free, stay flexible", body: "Joining costs nothing — explore, message, and book on your terms." },
];

const artistProps = [
    { icon: MessageSquareText, title: "Less admin, more art", body: "Messages, bookings, and deposits handled so you can focus on tattooing." },
    { icon: CreditCard, title: "Paid before the needle", body: "Deposits are collected the moment a client locks in their slot." },
    { icon: FileText, title: "Prepared clients, every time", body: "Intake details and references land in your inbox before they arrive." },
    { icon: LayoutGrid, title: "Get discovered", body: "Your portfolio reaches clients searching for your exact style." },
    { icon: CalendarDays, title: "Booked on your terms", body: "Open the hours you want and let clients fill them around you." },
];

const clientSteps = ["Explore", "Reserve", "Get rewarded"];
const artistSteps = ["Create", "Get booked", "Cash out"];

export default function InfoPanel({ show, prefersReduced, mode = "signup", role = "client" }: Props) {
    const [delayed, setDelayed] = useState(false);

    useEffect(() => {
        let t: number | null = null;
        if (show) {
            setDelayed(false);
            t = window.setTimeout(() => setDelayed(true), 600);
        } else {
            setDelayed(false);
        }
        return () => {
            if (t !== null) window.clearTimeout(t);
        };
    }, [show]);

    const heading = mode === "login" ? "We’ve missed you" : "Our Mission";
    const message =
        mode === "login"
            ? "Pick up right where you left off. Find your next artist faster — and earn rewards while you do."
            : role === "artist"
                ? "Spend less time on admin and more on the art. Inkmity handles bookings, deposits, and intake so you can focus on creating."
                : "We connect clients with artists through clear expectations, transparent pricing, and respectful collaboration.";
    const valueProps =
        (mode === "login" ? loginProps : role === "artist" ? artistProps : clientProps).slice(0, 3);
    const steps = role === "artist" ? artistSteps : clientSteps;

    return (
        <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: delayed ? 1 : 0, x: delayed ? 0 : 16 }}
            transition={prefersReduced ? { duration: 0 } : slide}
            className="w-full h-full"
        >
            <div className="w-full h-full rounded-3xl sm:rounded-l-3xl sm:rounded-r-none border border-app bg-card text-app overflow-hidden flex flex-col">
                <div className="w-full h-full px-5 py-5 sm:px-6 sm:py-6 flex flex-col items-center justify-center text-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-app/40 bg-elevated px-3 py-1 text-fluid-xs text-app/70 select-none mb-3">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Inkmity</span>
                    </div>

                    <h2 className="text-fluid-xl font-extrabold tracking-tight text-app select-none">
                        {heading}
                    </h2>

                    <motion.p
                        initial={false}
                        animate={{ opacity: delayed ? 1 : 0 }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        className="mt-2 text-subtle text-fluid-xs leading-relaxed max-w-sm select-none"
                    >
                        {message}
                    </motion.p>

                    <div className="mt-4 w-full max-w-sm space-y-2">
                        {valueProps.map(({ icon: Icon, title, body }, i) => (
                            <motion.div
                                key={title}
                                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                                animate={delayed ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
                                transition={prefersReduced ? { duration: 0 } : { delay: 0.15 + i * 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                                className="flex items-center gap-2.5 rounded-xl border border-app bg-elevated/70 p-2.5 text-left"
                            >
                                <span className="inline-grid place-items-center rounded-lg border border-app/40 bg-card p-1.5 flex-shrink-0">
                                    <Icon className="h-4 w-4 text-app" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-fluid-xs font-bold text-app leading-tight">{title}</span>
                                    <span className="block text-fluid-xs text-subtle leading-snug mt-0.5 opacity-80">{body}</span>
                                </span>
                            </motion.div>
                        ))}
                    </div>

                    {mode === "signup" && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={delayed ? { opacity: 1, y: 0 } : {}}
                            transition={prefersReduced ? { duration: 0 } : { duration: 0.45, ease: "easeOut", delay: 0.45 }}
                            className="mt-5 w-full max-w-sm"
                        >
                            <div className="text-fluid-xs font-semibold uppercase tracking-[0.15em] text-app/50 mb-2.5">
                                How it works
                            </div>
                            <div className="flex items-start gap-1">
                                {steps.map((label, i) => (
                                    <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
                                        <span className="grid h-7 w-7 place-items-center rounded-full border border-app/40 bg-elevated text-fluid-xs font-bold text-app">
                                            {i + 1}
                                        </span>
                                        <span className="text-fluid-xs text-subtle leading-tight">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                </div>
            </div>
        </motion.div>
    );
}
