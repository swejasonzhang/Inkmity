import React from "react";
import { LazyMotion, domAnimation, MotionConfig, useReducedMotion, m, type Variants, type Transition } from "framer-motion";
import { dirForColumn } from "./motion";

const features = [
    {
        title: "Search that understands style",
        body: "Filter by technique, healed results, budget, and travel radius. 82 artists can match in seconds. Narrow to exactly who you want.",
        tags: ["Technique filter", "Healed ★ 4+", "Budget range", "Travel radius"],
    },
    {
        title: "Chat with full context",
        body: "Share references, approve sketches, and lock details without losing threads. One inbox holds every message and image from first contact to final session.",
        tags: ["Reference sharing", "Sketch approval", "Full history"],
    },
    {
        title: "Clear pricing, no surprises",
        body: "Up-front quotes and verified reviews, with cancellation terms shown before you ever pay. What you agree to is exactly what you get.",
        tags: ["Transparent quotes", "Verified reviews", "Clear terms"],
    },
];

const SPRING: Transition = { type: "spring", stiffness: 260, damping: 24 };
const EASE = [0.22, 1, 0.36, 1] as const;

const card: Variants = {
    hidden: (dir: number = 0) => ({ opacity: 0, x: dir * 56, y: dir === 0 ? 32 : 0, scale: 0.96, filter: "blur(8px)" }),
    show: {
        opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)",
        transition: {
            opacity: { duration: 0.55, ease: EASE },
            x: SPRING,
            y: SPRING,
            scale: SPRING,
            filter: { duration: 0.45, ease: EASE },
        },
    },
    hover: { y: -4, scale: 1.015, transition: { duration: 0.22 } },
    tap: { scale: 0.995 },
};

const shine: Variants = {
    rest: { x: "-130%" },
    hover: { x: "130%", transition: { duration: 0.9, ease: EASE } },
};

const tagsWrap: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
};

const tagItem: Variants = {
    hidden: { opacity: 0, y: 4 },
    show: { opacity: 1, y: 0, transition: { type: "tween", duration: 0.3, ease: EASE } },
};

const FeaturesGrid: React.FC<{ textFadeUp: any; wc?: React.CSSProperties }> = ({ textFadeUp, wc }) => {
    const prefersReduced = useReducedMotion();
    return (
        <section id="features" className="scroll-mt-20 md:scroll-mt-24">
            <div className="text-center mb-fluid-8">
                <m.p variants={textFadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }}
                    className="text-fluid-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--fg)]/45 mb-3" style={wc}>
                    Our features
                </m.p>
                <m.h2 variants={textFadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }}
                    className="text-fluid-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-[linear-gradient(90deg,var(--fg)_0%,var(--fg)_55%,white_100%)]" style={wc}>
                    Everything the old way was missing.
                </m.h2>
            </div>

            <div className="relative">
                <div aria-hidden className="pointer-events-none absolute -inset-40 opacity-[0.05] blur-3xl"
                    style={{ background: "radial-gradient(60% 50% at 50% 50%, rgba(255,255,255,.6) 0%, rgba(255,255,255,0) 70%)" }} />
                <LazyMotion features={domAnimation} strict>
                    <MotionConfig reducedMotion={prefersReduced ? "always" : "never"}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-fluid-md">
                            {features.map((f, i) => (
                                <m.article key={f.title} custom={dirForColumn(i, 3)} variants={card} initial="hidden" whileInView="show"
                                    viewport={{ once: true, amount: 0.2 }}
                                    transition={{ delay: i * 0.08 } as any}
                                    whileHover={prefersReduced ? undefined : "hover"}
                                    whileTap={prefersReduced ? undefined : "tap"}
                                    className="relative">
                                    <div className="relative rounded-2xl p-[1px] overflow-hidden h-full">
                                        <m.div initial="rest" animate="rest" whileHover="hover" className="pointer-events-none absolute inset-0">
                                            <m.div variants={shine} className="absolute top-0 bottom-0 w-1/2 -skew-x-12 opacity-20"
                                                style={{ background: "linear-gradient(90deg, transparent 0%, white 35%, transparent 70%)" }} />
                                        </m.div>
                                        <div className="absolute inset-0 rounded-2xl opacity-80"
                                            style={{ background: "conic-gradient(from 140deg at 50% 50%, rgba(255,255,255,.18), rgba(255,255,255,.06), rgba(255,255,255,.18))" }}
                                            aria-hidden />
                                        <div className="relative rounded-2xl bg-card h-full">
                                            <div className="flex flex-col items-center justify-center text-center px-fluid-md py-fluid-lg h-full">
                                                <h3 className="text-fluid-xl font-bold tracking-tight text-[color:var(--fg)] mb-3" style={wc}>
                                                    {f.title}
                                                </h3>
                                                <p className="text-fluid-base text-[color:var(--fg)]/65 leading-relaxed max-w-[40ch] mx-auto">
                                                    {f.body}
                                                </p>
                                                <m.div variants={tagsWrap} initial="hidden" whileInView="show"
                                                    viewport={{ once: true, amount: 0.5 }}
                                                    className="mt-fluid-4 flex flex-wrap items-center justify-center gap-2">
                                                    {f.tags.map((tag) => (
                                                        <m.span key={tag} variants={tagItem}
                                                            className="rounded-full bg-elevated px-3 py-1 text-fluid-xs font-semibold tracking-tight text-[color:var(--fg)]/75">
                                                            {tag}
                                                        </m.span>
                                                    ))}
                                                </m.div>
                                            </div>
                                        </div>
                                    </div>
                                </m.article>
                            ))}
                        </div>
                    </MotionConfig>
                </LazyMotion>
            </div>
        </section>
    );
};

export default FeaturesGrid;
