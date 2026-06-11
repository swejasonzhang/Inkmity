import React from "react";
import { LazyMotion, domAnimation, MotionConfig, useReducedMotion, m, type Variants } from "framer-motion";
import { Gift, Receipt, Users, Sparkles, type LucideIcon } from "lucide-react";
import { EASE, dirForColumn } from "./motion";

type Point = { title: string; body: string; Icon: LucideIcon };

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

const Pricing: React.FC<{ textFadeUp: any; wc?: React.CSSProperties }> = ({ textFadeUp, wc }) => {
    const prefersReduced = useReducedMotion();
    const points: Point[] = [
        { title: "The essentials are always free", body: "Discovery, booking, messaging, sketch approval, intake forms, reviews — and free here includes tools other platforms lock behind a paid plan.", Icon: Gift },
        { title: "We only earn when you book", body: "One transparent platform fee on completed bookings — shown before you pay, dropping as low as 5% the more you book. No lead fees, no per-listing charges.", Icon: Receipt },
        { title: "We bring the clients", body: "Artists focus on tattooing, not chasing leads. Inkmity owns discovery and client acquisition — our incentive is to keep your books full.", Icon: Users },
        { title: "Premium is optional, never essential", body: "Any monthly subscriptions we add later are power-user extras only. We'll never paywall the core experience or hide a must-have behind a plan.", Icon: Sparkles },
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
                            Pricing
                        </m.p>
                        <m.h2
                            variants={textFadeUp}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.5 }}
                            className="text-2xl md:text-3xl font-bold tracking-tight text-[color:var(--fg)]"
                            style={wc}
                        >
                            Honest pricing. No hidden fees.
                        </m.h2>
                        <m.p
                            variants={textFadeUp}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.5 }}
                            className="mt-3 text-[color:var(--fg)]/80 max-w-3xl mx-auto leading-relaxed"
                            style={wc}
                        >
                            Inkmity's essentials are free — and free here includes things other platforms charge for. We make money one way: a transparent platform fee when a booking actually happens. Any subscriptions we add later are optional extras, never gates on what matters.
                        </m.p>
                        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 auto-rows-fr text-left">
                            {points.map((p, i) => {
                                const { Icon } = p;
                                return (
                                    <m.div
                                        key={p.title}
                                        custom={dirForColumn(i, 2)}
                                        variants={item}
                                        initial="hidden"
                                        whileInView="show"
                                        viewport={{ once: true, amount: 0.2 }}
                                        transition={{ delay: (i % 2) * 0.06 } as any}
                                        whileHover={prefersReduced ? undefined : "hover"}
                                        className="group relative overflow-hidden rounded-2xl bg-elevated p-5 sm:p-6 h-full flex flex-col items-start border border-app transition-colors duration-300 hover:border-[color:var(--fg)]/25"
                                    >
                                        <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-[color:var(--fg)]/10 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[320%]" />
                                        <div className="relative z-10 mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-app bg-card">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <h3 className="relative z-10 font-semibold text-lg sm:text-xl tracking-tight text-[color:var(--fg)]">{p.title}</h3>
                                        <p className="relative z-10 mt-2 text-[color:var(--fg)]/80 max-w-prose leading-relaxed">{p.body}</p>
                                    </m.div>
                                );
                            })}
                        </div>
                        <m.p
                            variants={textFadeUp}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.5 }}
                            className="mt-6 text-[13px] text-[color:var(--fg)]/55"
                            style={wc}
                        >
                            See the full fee breakdown on the{" "}
                            <a href="/tiers" className="underline hover:opacity-80" style={{ color: "var(--fg)" }}>tiers page</a>.
                        </m.p>
                    </MotionConfig>
                </LazyMotion>
            </div>
        </section>
    );
};

export default Pricing;
