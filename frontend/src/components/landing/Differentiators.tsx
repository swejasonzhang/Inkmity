import React, { useEffect, useRef, useState } from "react";
import { LazyMotion, domAnimation, MotionConfig, useReducedMotion, m, type Variants } from "framer-motion";
import { Wallet, ShieldCheck, FileSignature, Banknote, CalendarClock, Layers, type LucideIcon } from "lucide-react";
import { EASE, dirForColumn } from "./motion";

type Card = { title: string; body: string; Icon: LucideIcon; wide?: boolean; ink?: boolean };

const item: Variants = {
    hidden: (dir: number = 0) => ({ opacity: 0, x: dir * 48, y: dir === 0 ? 22 : 0, filter: "blur(8px)" }),
    show: {
        opacity: 1,
        x: 0,
        y: 0,
        filter: "blur(0px)",
        transition: {
            opacity: { duration: 0.5, ease: EASE },
            x: { type: "spring", stiffness: 210, damping: 26 },
            y: { type: "spring", stiffness: 210, damping: 26 },
            filter: { duration: 0.45, ease: EASE },
        },
    },
    hover: { y: -3, transition: { duration: 0.2 } },
};

const Differentiators: React.FC<{ textFadeUp: any; wc?: React.CSSProperties }> = ({ textFadeUp, wc }) => {
    const prefersReduced = useReducedMotion();
    const cards: Card[] = [
        { title: "Booking, not just leads", body: "Most platforms hand off a lead and vanish. Inkmity runs the whole transaction on-platform — deposit to final balance — so nothing slips through the cracks.", Icon: Wallet, wide: true, ink: true },
        { title: "Paid only when it's done right", body: "The balance is captured after both you and your artist confirm the session is complete. Money follows trust, not the other way around.", Icon: ShieldCheck },
        { title: "Built for skin", body: "Signed waivers, health intake, and clear consent are part of the flow — protecting clients, artists, and studios from the first message.", Icon: FileSignature, wide: true },
        { title: "Payments that protect everyone", body: "Inkmity is the merchant of record: deposits and balances are processed in-house, payouts split between artist and studio automatically, with clawback if a charge is disputed.", Icon: Banknote },
        { title: "No slot goes to waste", body: "When a booking frees up, the waitlist auto-offers it to the next person in line — so cancellations turn into openings instead of dead air.", Icon: CalendarClock, wide: true },
        { title: "Built for clients, artists & studios", body: "Solo artists and full studios run on the same platform their clients book from — no bolting five disconnected tools together to run a shop.", Icon: Layers },
    ];

    // Ink cascade: once the section scrolls in, the ink "pours" through the cards,
    // flipping each one's color scheme to black in sequence (1 → 6).
    const [frontier, setFrontier] = useState(0);
    const startedRef = useRef(false);
    const timersRef = useRef<number[]>([]);
    const startCascade = () => {
        if (startedRef.current) return;
        startedRef.current = true;
        if (prefersReduced) {
            setFrontier(cards.length);
            return;
        }
        cards.forEach((_, i) => {
            const t = window.setTimeout(() => setFrontier(i + 1), 500 + i * 180);
            timersRef.current.push(t);
        });
    };
    useEffect(() => () => { timersRef.current.forEach((t) => clearTimeout(t)); }, []);

    return (
        <section className="mt-2 mb-6">
            <div className="rounded-2xl bg-card p-5 sm:p-6 md:p-8 text-center border border-app">
                <LazyMotion features={domAnimation} strict>
                    <MotionConfig reducedMotion={prefersReduced ? "always" : "never"}>
                        <m.h2
                            variants={textFadeUp}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.5 }}
                            className="text-2xl md:text-3xl font-bold tracking-tight text-[color:var(--fg)]"
                            style={wc}
                        >
                            What makes Inkmity different
                        </m.h2>
                        <m.p
                            variants={textFadeUp}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.5 }}
                            className="mt-3 text-[color:var(--fg)]/80 max-w-4xl mx-auto leading-relaxed"
                            style={wc}
                        >
                            Other tattoo apps stop at discovery. Inkmity carries you from first reference to healed result — booking, payment, paperwork, and trust, handled end to end.
                        </m.p>
                        <m.div
                            onViewportEnter={startCascade}
                            viewport={{ once: true, amount: 0.25 }}
                            className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 auto-rows-fr text-left"
                        >
                            {cards.map((c, i) => {
                                const { Icon } = c;
                                const inverted = c.ink || i < frontier;
                                return (
                                    <m.div
                                        key={c.title}
                                        custom={dirForColumn(i, 3)}
                                        variants={item}
                                        initial="hidden"
                                        whileInView="show"
                                        viewport={{ once: true, amount: 0.2 }}
                                        transition={{ delay: (i % 3) * 0.06 } as any}
                                        whileHover={prefersReduced ? undefined : "hover"}
                                        className={[
                                            "group relative overflow-hidden rounded-2xl p-5 sm:p-6 h-full flex flex-col items-start border transition-colors duration-500 ease-out",
                                            c.wide ? "lg:col-span-2" : "",
                                            inverted
                                                ? "bg-[color:var(--fg)] text-[color:var(--bg)] border-transparent"
                                                : "bg-elevated border-app hover:border-[color:var(--fg)]/25",
                                            c.ink ? "justify-center" : "",
                                        ].join(" ")}
                                    >
                                        {/* Ink pour: a black panel wipes down the card as it flips */}
                                        <span
                                            aria-hidden
                                            className={`pointer-events-none absolute inset-0 z-0 origin-top bg-[color:var(--fg)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${inverted && !c.ink ? "scale-y-100" : "scale-y-0"}`}
                                        />
                                        <span aria-hidden className={`pointer-events-none absolute bottom-[-0.75rem] right-2 z-0 font-black leading-none tracking-tighter ${c.wide ? "text-8xl" : "text-7xl"} ${inverted ? "text-[color:var(--bg)]/10" : "text-[color:var(--fg)]/[0.05]"}`}>
                                            {String(i + 1).padStart(2, "0")}
                                        </span>
                                        {!inverted && (
                                            <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-[color:var(--fg)]/10 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[320%] z-0" />
                                        )}
                                        <div className={`relative z-10 mb-4 flex h-11 w-11 items-center justify-center rounded-xl border transition-colors duration-500 ${inverted ? "border-[color:var(--bg)]/25 bg-[color:var(--bg)]/10" : "border-app bg-card"}`}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <h3 className="relative z-10 font-semibold text-lg sm:text-xl tracking-tight">{c.title}</h3>
                                        <p className={`relative z-10 mt-2 leading-relaxed transition-colors duration-500 ${c.wide ? "max-w-2xl" : "max-w-prose"} ${inverted ? "text-[color:var(--bg)]/75" : "text-[color:var(--fg)]/75"}`}>{c.body}</p>
                                    </m.div>
                                );
                            })}
                        </m.div>
                    </MotionConfig>
                </LazyMotion>
            </div>
        </section>
    );
};

export default Differentiators;
