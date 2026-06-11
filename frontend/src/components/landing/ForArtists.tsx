import React from "react";
import { Link } from "react-router-dom";
import { LazyMotion, domAnimation, MotionConfig, useReducedMotion, m } from "framer-motion";
import { MessageSquare, CreditCard, FileText, LayoutGrid, ArrowRight } from "lucide-react";
import { directionalReveal } from "./motion";

const benefits = [
    { icon: MessageSquare, title: "One inbox", body: "All client conversations in one thread. No more scattered DMs." },
    { icon: CreditCard,    title: "Automated deposits", body: "Deposits collected at booking. You get paid before the session." },
    { icon: FileText,      title: "Client intake forms", body: "Health info, references, and placement sent ahead of time." },
    { icon: LayoutGrid,    title: "Portfolio showcase", body: "Let your work speak. Clients find you by style and quality." },
];

const ForArtists: React.FC<{ textFadeUp: any; wc?: React.CSSProperties }> = ({ textFadeUp, wc }) => {
    const prefersReduced = useReducedMotion();

    return (
        <section id="for-artists" className="scroll-mt-20 md:scroll-mt-24 py-2">
            <LazyMotion features={domAnimation} strict>
                <MotionConfig reducedMotion={prefersReduced ? "always" : "never"}>
                    <div className="rounded-2xl border border-[color:var(--border)] overflow-hidden">
                        <div className="grid grid-cols-1 lg:grid-cols-2">
                            <div className="flex flex-col justify-center px-8 sm:px-10 py-12 sm:py-14 bg-card">
                                <m.p
                                    variants={textFadeUp}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.4 }}
                                    className="text-xs sm:text-sm font-semibold uppercase tracking-[0.15em] text-[color:var(--fg)] mb-3"
                                    style={wc}
                                >
                                    For tattoo artists
                                </m.p>
                                <m.h2
                                    variants={textFadeUp}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.4 }}
                                    className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[color:var(--fg)] mb-4"
                                    style={wc}
                                >
                                    Built for artists,&nbsp;too.
                                </m.h2>
                                <m.p
                                    variants={textFadeUp}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.4 }}
                                    className="text-base sm:text-lg text-[color:var(--fg)]/70 leading-relaxed mb-8 max-w-md"
                                    style={wc}
                                >
                                    Stop juggling DMs, texts, and paper deposits. Inkmity gives you a professional booking flow so you can focus on the work — not the admin.
                                </m.p>
                                <m.div
                                    variants={textFadeUp}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.4 }}
                                    style={wc}
                                >
                                    <Link
                                        to="/signup"
                                        className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--fg)] text-[color:var(--bg)] px-6 py-3 text-sm sm:text-base font-semibold hover:opacity-90 transition-opacity"
                                    >
                                        Join as an artist
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </m.div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[color:var(--border)]/40">
                                {benefits.map((b, i) => {
                                    const Icon = b.icon;
                                    return (
                                        <m.div
                                            key={b.title}
                                            custom={1}
                                            variants={directionalReveal}
                                            initial="hidden"
                                            whileInView="show"
                                            viewport={{ once: true, amount: 0.2 }}
                                            transition={{ delay: i * 0.07 } as any}
                                            className="flex flex-col gap-3 p-6 sm:p-8 bg-elevated/40"
                                        >
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border)] bg-card">
                                                <Icon className="h-5 w-5 text-[color:var(--fg)]" />
                                            </div>
                                            <h3 className="text-base font-bold text-[color:var(--fg)]">{b.title}</h3>
                                            <p className="text-sm text-[color:var(--fg)]/65 leading-relaxed">{b.body}</p>
                                        </m.div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </MotionConfig>
            </LazyMotion>
        </section>
    );
};

export default ForArtists;
