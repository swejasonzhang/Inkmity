import React from "react";
import { m } from "framer-motion";
import { Link } from "react-router-dom";

const FounderStory: React.FC<{ textFadeUp: any; wc?: React.CSSProperties }> = ({ textFadeUp, wc }) => {
    return (
        <section className="px-4 grid place-items-center">
            <div className="mx-auto max-w-5xl w-full rounded-2xl bg-card/60 px-8 md:px-12 py-0 text-center">
                <m.h2
                    variants={textFadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.6 }}
                    className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight"
                    style={wc}
                >
                    Why I started Inkmity
                </m.h2>

                <m.p
                    variants={textFadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.6 }}
                    className="mt-5 md:mt-7 text-black dark:text-white text-xl md:text-2xl leading-relaxed md:leading-loose mx-auto max-w-[72ch] font-semibold"
                    style={wc}
                >
                    I was excited to get a tattoo—and ended up juggling DMs, emails, and payment apps, waiting days for answers.
                    By the time replies came, the date was gone or the price didn’t fit. Getting something meaningful shouldn’t
                    feel like a part-time job. I wanted the process to feel personal again, not transactional. 
                </m.p>

                <m.p
                    variants={textFadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.6 }}
                    className="mt-6 text-black dark:text-white text-xl md:text-2xl leading-relaxed md:leading-loose mx-auto max-w-[72ch] font-semibold"
                    style={wc}
                >
                    Inkmity is my fix: one place to discover artists you vibe with, see real availability, and book with context.
                    Clear pricing, verified reviews, and conversations in one thread—so the process starts inspired and stays simple.
                    It lets artists focus on their craft while the logistics take care of themselves. That’s the experience I wished I had—and the one I’m building.
                </m.p>

                <m.div
                    variants={textFadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.6 }}
                    className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
                >
                    <Link
                        to="/signup"
                        className="inline-flex items-center justify-center rounded-xl px-5 sm:px-6 py-3 font-bold bg-white text-black hover:opacity-95 active:scale-[0.99] border border-app shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[color:var(--border)]"
                    >
                        Get Started
                    </Link>
                    <Link
                        to="/login"
                        className="inline-flex items-center justify-center rounded-xl px-5 sm:px-6 py-3 font-bold bg-elevated text-app hover:bg-elevated/90 active:scale-[0.99] border border-app transition focus:outline-none focus:ring-2 focus:ring-[color:var(--border)]"
                    >
                        Already Have An Account? Login
                    </Link>
                </m.div>

                <m.div
                    variants={textFadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.6 }}
                    className="mx-auto mt-12 h-px w-48 md:w-64 lg:w-80 bg-gradient-to-r from-transparent via-[color:var(--border)] to-transparent"
                />
            </div>
        </section>
    );
};

export default FounderStory;