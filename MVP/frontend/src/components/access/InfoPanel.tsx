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
    { icon: Search, title: "Search that understands style", body: "Filter by technique, healed results, budget, and travel radius." },
    { icon: MessageSquareText, title: "Chat with full context", body: "Share references and approve sketches in one clean thread." },
    { icon: Tag, title: "Transparent pricing", body: "Up-front quotes and verified reviews before you ever commit." },
    { icon: Gift, title: "Earn as you book", body: "Reward points stack with every session toward real perks." },
    { icon: BadgeCheck, title: "Free to join", body: "Browse, message, and book artists at no cost as a client." },
];

const artistProps = [
    { icon: MessageSquareText, title: "One inbox for everything", body: "Every client conversation in a single, organized thread." },
    { icon: CreditCard, title: "Automated deposits", body: "Deposits collected at booking — get paid before the session." },
    { icon: FileText, title: "Client intake forms", body: "Health info, references, and placement delivered ahead of time." },
    { icon: LayoutGrid, title: "A portfolio that gets found", body: "Showcase your work and surface in style-based search." },
    { icon: CalendarDays, title: "Your schedule, your rules", body: "Set availability and let clients book the slots you open." },
];

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
        mode === "login" ? loginProps : role === "artist" ? artistProps : clientProps;

    return (
        <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: delayed ? 1 : 0, x: delayed ? 0 : 16 }}
            transition={prefersReduced ? { duration: 0 } : slide}
            className="w-full h-full"
        >
            <div className="w-full h-full rounded-t-3xl md:rounded-tl-3xl md:rounded-bl-3xl md:rounded-tr-none md:rounded-br-none border border-app bg-card text-app overflow-hidden flex flex-col">
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
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: delayed ? 1 : 0 }}
                            transition={{ duration: 0.45, ease: "easeOut", delay: 0.5 }}
                            className="mt-4 text-fluid-xs text-subtle/80 leading-snug max-w-sm select-none"
                        >
                            {role === "artist"
                                ? "Built for US artists · You set your terms · Cancel anytime"
                                : "US-based artists · You control what’s shared · Cancel anytime"}
                        </motion.p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
