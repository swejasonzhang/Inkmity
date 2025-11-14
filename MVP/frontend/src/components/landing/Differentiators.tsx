import React from "react";
import { LazyMotion, domAnimation, MotionConfig, useReducedMotion, m, type Variants } from "framer-motion";

const item: Variants = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }, hover: { y: -3, transition: { duration: 0.2 } } };

const Differentiators: React.FC<{ textFadeUp: any; wc?: React.CSSProperties }> = ({ textFadeUp, wc }) => {
    const prefersReduced = useReducedMotion();
    const rows: Array<[string, string]> = [
        ["Calm by design", "Screens that breathe, copy that guides, choices that feel obvious. The platform stays quiet so your project can speak up."],
        ["Creators at the center", "Time and energy are protected. Less admin, fewer inboxes, more headspace for the work itself."],
        ["Clarity in every step", "Expectations are clear before needles touch skin. Everyone knows what happens next, so trust builds fast."],
        ["Welcoming for first-timers", "Language, references, and pacing that make big decisions feel easy rather than intimidating."],
        ["Shaped with the community", "We listen, ship, and adjust. The product grows in the direction artists and clients pull it."],
        ["Private by default", "You decide what’s shared. Safety and comfort are treated as features, not afterthoughts."],
    ];

    return (
        <section className="px-1 sm:px-3 mt-2 mb-6 grid place-items-center">
            <div className="mx-auto w-full max-w-[100rem] rounded-2xl bg-card p-5 sm:p-6 md:p-8 text-center border border-app">
                <LazyMotion features={domAnimation} strict>
                    <MotionConfig reducedMotion={prefersReduced ? "always" : "never"}>
                        <m.h2 variants={textFadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.6 }} className="text-2xl md:text-3xl font-bold tracking-tight text-[color:var(--fg)]" style={wc}>
                            What makes Inkmity different
                        </m.h2>
                        <m.p variants={textFadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.6 }} className="mt-3 text-[color:var(--fg)]/92 max-w-4xl mx-auto leading-relaxed" style={wc}>
                            The feeling isn’t a feature. It’s the point. Each choice is made to make the journey lighter than going it alone.
                        </m.p>
                        <div className="mt-8 grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-4 auto-rows-fr place-items-stretch text-center">
                            {rows.map(([title, body]) => (
                                <m.div
                                    key={title}
                                    variants={item}
                                    initial="hidden"
                                    whileInView="show"
                                    viewport={{ once: true, amount: 0.3 }}
                                    whileHover={prefersReduced ? undefined : "hover"}
                                    className="rounded-xl bg-elevated p-4 sm:p-5 h-full flex flex-col items-center justify-center text-center border border-app"
                                >
                                    <h3 className="font-semibold text-base sm:text-lg md:text-xl tracking-tight text-[color:var(--fg)]">{title}</h3>
                                    <p className="mt-2 text-[color:var(--fg)]/92 max-w-prose mx-auto leading-relaxed">{body}</p>
                                </m.div>
                            ))}
                        </div>
                    </MotionConfig>
                </LazyMotion>
            </div>
        </section>
    );
};

export default Differentiators;