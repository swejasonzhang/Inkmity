import React from "react";
import { LazyMotion, domAnimation, MotionConfig, useReducedMotion, m, type Variants } from "framer-motion";
import { Sparkles, Languages, Globe, Album, HeartPulse, UserPlus, Building2, Award, Rocket, type LucideIcon } from "lucide-react";
import { EASE, dirForColumn } from "./motion";

type Card = { title: string; body: string; Icon: LucideIcon };

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

const Roadmap: React.FC<{ textFadeUp: any; wc?: React.CSSProperties }> = ({ textFadeUp, wc }) => {
    const prefersReduced = useReducedMotion();
    const cards: Card[] = [
        { title: "AI booking assistant", body: "Turn your saved references into a ready-to-send brief and get matched to the right artist instantly — so booking takes minutes, not weeks.", Icon: Sparkles },
        { title: "Speaks your language", body: "Built-in automatic translation, so a client and an artist who don't share a language can still message, brief, and book without friction.", Icon: Languages },
        { title: "Built to go global", body: "Worldwide artists, local currencies, and timezone-aware scheduling — Inkmity is being built to work in every city, not just one country.", Icon: Globe },
        { title: "Your collection journey", body: "Every healed piece becomes part of a personal collection that follows you for life — a living record of your work, your artists, and your story.", Icon: Album },
        { title: "Aftercare that checks in", body: "Guided healing reminders and artist-backed aftercare, timed to each piece, so the work looks as good in a year as it did on day one.", Icon: HeartPulse },
        { title: "Follow your artists", body: "Follow the artists you love, see when they open books or drop flash, and get first dibs before slots disappear.", Icon: UserPlus },
        { title: "Studios, fully wired", body: "Deeper commission splits, multi-chair scheduling, and studio payouts — so shops run their whole operation inside Inkmity.", Icon: Building2 },
        { title: "Earned status & insight", body: "Loyalty tiers, verified badges, faster payouts, and real analytics that reward the artists and clients who show up.", Icon: Award },
        { title: "And we're just getting started", body: "This list keeps growing. We ship, listen, and build in the direction artists and clients pull us — there's much more on the way.", Icon: Rocket },
    ];

    return (
        <section className="mt-2 mb-6">
            <div className="rounded-2xl bg-card p-5 sm:p-6 md:p-8 text-center border border-app">
                <LazyMotion features={domAnimation} strict>
                    <MotionConfig reducedMotion={prefersReduced ? "always" : "never"}>
                        <m.p
                            variants={textFadeUp}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.5 }}
                            className="text-fluid-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--fg)]/45 mb-3"
                            style={wc}
                        >
                            Roadmap · in progress
                        </m.p>
                        <m.h2
                            variants={textFadeUp}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.5 }}
                            className="text-2xl md:text-3xl font-bold tracking-tight text-[color:var(--fg)]"
                            style={wc}
                        >
                            Where Inkmity is headed
                        </m.h2>
                        <m.p
                            variants={textFadeUp}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.5 }}
                            className="mt-3 text-[color:var(--fg)]/80 max-w-4xl mx-auto leading-relaxed"
                            style={wc}
                        >
                            These are the things we're building next. They aren't live yet — but they're the reason Inkmity exists, and they're coming.
                        </m.p>
                        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 auto-rows-fr text-left">
                            {cards.map((c, i) => {
                                const { Icon } = c;
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
                                        className="group relative overflow-hidden rounded-2xl bg-elevated p-5 sm:p-6 h-full flex flex-col items-start border border-app border-dashed transition-colors duration-300 hover:border-[color:var(--fg)]/30"
                                    >
                                        <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-[color:var(--fg)]/10 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[320%]" />
                                        <div className="relative z-10 mb-4 flex w-full items-center justify-between">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-app bg-card text-[color:var(--fg)]">
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <span className="rounded-full border border-app bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--fg)]/50">
                                                Soon
                                            </span>
                                        </div>
                                        <h3 className="relative z-10 font-semibold text-lg sm:text-xl tracking-tight text-[color:var(--fg)]">{c.title}</h3>
                                        <p className="relative z-10 mt-2 text-[color:var(--fg)]/80 max-w-prose leading-relaxed">{c.body}</p>
                                    </m.div>
                                );
                            })}
                        </div>
                    </MotionConfig>
                </LazyMotion>
            </div>
        </section>
    );
};

export default Roadmap;
