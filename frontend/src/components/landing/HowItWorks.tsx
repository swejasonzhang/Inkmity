import React from "react";
import { LazyMotion, domAnimation, MotionConfig, useReducedMotion, m } from "framer-motion";
import { Search, CalendarDays, CheckCircle2 } from "lucide-react";
import { directionalReveal, dirForColumn } from "./motion";

const steps = [
    {
        icon: Search,
        title: "Browse & Discover",
        body: "Explore full portfolios and healed work, then shortlist the artists whose style fits your vision — all before you commit to anything.",
    },
    {
        icon: CalendarDays,
        title: "Book & Confirm",
        body: "Pick your slot, share your vision, fill out the intake form, and lock in your appointment with a deposit — in one unbroken flow.",
    },
    {
        icon: CheckCircle2,
        title: "Show Up & Earn",
        body: "Your artist has everything before you arrive. Walk in prepared. Every completed session earns you reward points toward your next one.",
    },
];

const HowItWorks: React.FC<{ textFadeUp: any; wc?: React.CSSProperties }> = ({ textFadeUp, wc }) => {
    const prefersReduced = useReducedMotion();
    return (
        <section id="how-it-works" className="scroll-mt-20 md:scroll-mt-24">
            <LazyMotion features={domAnimation} strict>
                <MotionConfig reducedMotion={prefersReduced ? "always" : "never"}>
                    <div className="text-center mb-fluid-8">
                        <m.p variants={textFadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }}
                            className="text-fluid-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--fg)]/45 mb-3" style={wc}>
                            How it works
                        </m.p>
                        <m.h2 variants={textFadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }}
                            className="text-fluid-4xl font-extrabold tracking-tight text-[color:var(--fg)]" style={wc}>
                            From idea to appointment<br className="hidden sm:block" /> in three steps.
                        </m.h2>
                    </div>

                    <div className="relative grid grid-cols-1 md:grid-cols-3 gap-fluid-lg">
                        <div className="hidden md:block absolute top-[3.25rem] left-[calc(33.33%+1rem)] right-[calc(33.33%+1rem)] h-px bg-gradient-to-r from-transparent via-[color:var(--border)] to-transparent" aria-hidden />
                        <div className="hidden md:block absolute top-[3.25rem] left-[calc(66.66%+1rem)] right-[1rem] h-px bg-gradient-to-r from-transparent via-[color:var(--border)] to-transparent" aria-hidden />

                        {steps.map((step, i) => {
                            const Icon = step.icon;
                            return (
                                <m.div key={step.title} custom={dirForColumn(i, 3)} variants={directionalReveal} initial="hidden" whileInView="show"
                                    viewport={{ once: true, amount: 0.2 }} transition={{ delay: i * 0.1 } as any}
                                    className="flex flex-col items-center text-center">
                                    <div className="relative mb-fluid-4 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border border-[color:var(--border)] bg-card shadow-md">
                                        <Icon className="h-6 w-6 text-[color:var(--fg)]" />
                                        <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--fg)] text-[color:var(--bg)] text-[10px] font-black">
                                            {i + 1}
                                        </span>
                                    </div>
                                    <h3 className="text-fluid-xl font-bold text-[color:var(--fg)] mb-2">{step.title}</h3>
                                    <p className="text-fluid-base text-[color:var(--fg)]/65 leading-relaxed max-w-xs mx-auto">{step.body}</p>
                                </m.div>
                            );
                        })}
                    </div>
                </MotionConfig>
            </LazyMotion>
        </section>
    );
};

export default HowItWorks;
