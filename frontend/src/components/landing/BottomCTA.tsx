import React from "react";
import { Link } from "react-router-dom";
import { LazyMotion, domAnimation, MotionConfig, useReducedMotion, m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowRight } from "lucide-react";

const BottomCTA: React.FC<{ textFadeUp: any; wc?: React.CSSProperties }> = ({ textFadeUp, wc }) => {
    const prefersReduced = useReducedMotion();

    return (
        <section className="mt-2 mb-6">
            <LazyMotion features={domAnimation} strict>
                <MotionConfig reducedMotion={prefersReduced ? "always" : "never"}>
                    <div className="relative w-full rounded-2xl p-[1.25px] overflow-hidden">
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0 rounded-2xl"
                            style={{ background: "conic-gradient(from 140deg at 50% 50%, rgba(255,255,255,.32), rgba(255,255,255,.12), rgba(255,255,255,.32))" }}
                        />
                        <Card className="relative rounded-2xl bg-card border border-app shadow-xl">
                            <CardContent className="p-5 sm:p-6 md:p-8 text-center">
                                <m.h2
                                    variants={textFadeUp}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.4 }}
                                    className="text-[1.75rem] sm:text-2xl md:text-3xl font-extrabold leading-tight tracking-tight text-[color:var(--fg)]"
                                    style={wc}
                                >
                                    Ready to make booking painless?
                                </m.h2>

                                <m.p
                                    variants={textFadeUp}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.4 }}
                                    className="mt-3 text-[color:var(--fg)]/80 text-base md:text-lg max-w-2xl mx-auto"
                                    style={wc}
                                >
                                    Join Inkmity today and give your next tattoo the start it deserves.
                                </m.p>

                                <m.div
                                    variants={textFadeUp}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.4 }}
                                >
                                    <Separator className="my-5 md:my-6 bg-[color:var(--border)]" />
                                </m.div>

                                <m.div
                                    variants={textFadeUp}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.4 }}
                                >
                                    <Button
                                        asChild
                                        className="group relative w-full sm:w-auto overflow-hidden rounded-xl px-7 py-4 md:py-5 text-base font-bold tracking-tight bg-[color:var(--fg)] text-[color:var(--bg)] shadow-[0_8px_30px_-6px_rgba(255,255,255,0.25)] transition-transform duration-200 hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-[color:var(--fg)]/30"
                                    >
                                        <Link to="/signup" aria-label="Create your Inkmity account">
                                            <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-black/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[340%]" />
                                            <span className="relative z-10 inline-flex items-center gap-2">
                                                Create your account
                                                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                                            </span>
                                        </Link>
                                    </Button>
                                </m.div>
                            </CardContent>
                        </Card>
                    </div>
                </MotionConfig>
            </LazyMotion>
        </section>
    );
};

export default BottomCTA;
