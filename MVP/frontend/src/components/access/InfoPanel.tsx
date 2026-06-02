import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Search, MessageSquareText, Gift } from "lucide-react";
import { slide } from "../../lib/animations";

type Props = {
    show: boolean;
    prefersReduced: boolean;
    hasError?: boolean;
    isPasswordHidden?: boolean;
    mode?: "signup" | "login";
};

const valueProps = [
    { icon: Search, title: "Search that understands style", body: "Filter by technique, healed results, budget, and travel radius." },
    { icon: MessageSquareText, title: "Chat with full context", body: "Share references and approve sketches in one clean thread." },
    { icon: Gift, title: "Earn as you book", body: "Reward points stack with every session toward real perks." },
];

export default function InfoPanel({ show, prefersReduced, mode = "signup" }: Props) {
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
            : "We connect clients with artists through clear expectations, transparent pricing, and respectful collaboration.";

    return (
        <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: delayed ? 1 : 0, x: delayed ? 0 : 16 }}
            transition={prefersReduced ? { duration: 0 } : slide}
            className="w-full h-full"
        >
            <div className="w-full h-full rounded-t-3xl md:rounded-tl-3xl md:rounded-bl-3xl md:rounded-tr-none md:rounded-br-none border border-app bg-card text-app overflow-hidden flex flex-col">
                <div className="w-full h-full px-5 py-6 sm:px-6 sm:py-8 md:px-10 md:py-12 flex flex-col items-center justify-center text-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-app/40 bg-elevated px-3 py-1 text-fluid-xs text-app/70 select-none mb-fluid-4">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Inkmity</span>
                    </div>

                    <h2 className="text-fluid-2xl font-extrabold tracking-tight text-app select-none">
                        {heading}
                    </h2>

                    <motion.p
                        initial={false}
                        animate={{ opacity: delayed ? 1 : 0 }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        className="mt-fluid-2 text-subtle text-fluid-sm leading-relaxed max-w-sm select-none"
                    >
                        {message}
                    </motion.p>

                    <div className="mt-fluid-6 w-full max-w-sm space-y-fluid-2">
                        {valueProps.map(({ icon: Icon, title, body }, i) => (
                            <motion.div
                                key={title}
                                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                                animate={delayed ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
                                transition={prefersReduced ? { duration: 0 } : { delay: 0.15 + i * 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                                className="flex items-center gap-3 rounded-xl border border-app bg-elevated/70 p-3 text-left"
                            >
                                <span className="inline-grid place-items-center rounded-lg border border-app/40 bg-card p-2 flex-shrink-0">
                                    <Icon className="h-4 w-4 text-app" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-fluid-sm font-bold text-app leading-tight">{title}</span>
                                    <span className="block text-fluid-xs text-subtle leading-snug mt-0.5">{body}</span>
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
