import React from "react";
import { Link } from "react-router-dom";
import { LazyMotion, domAnimation, MotionConfig, useReducedMotion, m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const BottomCTA: React.FC<{ textFadeUp: any; wc?: React.CSSProperties }> = ({ textFadeUp, wc }) => {
    const prefersReduced = useReducedMotion();

    return (
        <section className="grid place-items-center px-3 sm:px-4 md:min-h-[20svh]">
            <LazyMotion features={domAnimation} strict>
                <MotionConfig reducedMotion={prefersReduced ? "always" : "never"}>
                    <m.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full"
                    >
                        <div className="relative max-w-[40rem] sm:max-w-2xl md:max-w-[70rem] lg:max-w-[76rem] mx-auto rounded-2xl p-[1.25px] overflow-hidden">
                            <div
                                aria-hidden
                                className="pointer-events-none absolute inset-0 rounded-2xl opacity-100"
                                style={{ background: "conic-gradient(from 140deg at 50% 50%, rgba(255,255,255,.32), rgba(255,255,255,.12), rgba(255,255,255,.32))" }}
                            />
                            <Card className="relative rounded-2xl bg-card border border-app shadow-xl">
                                <CardContent className="p-5 sm:p-6 md:p-8 text-center">
                                    <m.h2
                                        variants={textFadeUp}
                                        initial="hidden"
                                        whileInView="visible"
                                        viewport={{ once: true, amount: 0.6 }}
                                        className="text-[1.75rem] sm:text-2xl md:text-3xl font-extrabold leading-tight tracking-tight text-[color:var(--fg)]"
                                        style={wc}
                                    >
                                        Ready to make booking painless?
                                    </m.h2>

                                    <m.p
                                        variants={textFadeUp}
                                        initial="hidden"
                                        whileInView="visible"
                                        viewport={{ once: true, amount: 0.6 }}
                                        className="mt-3 text-[color:var(--fg)] text-base md:text-lg max-w-2xl mx-auto"
                                        style={wc}
                                    >
                                        Join Inkmity today. Message in real time, search faster, and build trust with verified reviews.
                                    </m.p>

                                    <Separator className="my-5 md:my-6 bg-[color:var(--border)]" />

                                    <m.div
                                        variants={textFadeUp}
                                        initial="hidden"
                                        whileInView="visible"
                                        viewport={{ once: true, amount: 0.6 }}
                                    >
                                        <Button
                                            asChild
                                            className="w-full sm:w-auto rounded-lg sm:rounded-xl px-5 py-4 sm:px-6 sm:py-4 md:px-7 md:py-5 text-base font-semibold tracking-tight bg-[color:var(--fg)] text-[color:var(--bg)] hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[color:var(--fg)]/30"
                                        >
                                            <Link to="/signup" aria-label="Create your Inkmity account">Create your account</Link>
                                        </Button>
                                    </m.div>
                                </CardContent>
                            </Card>
                        </div>
                    </m.div>
                </MotionConfig>
            </LazyMotion>
        </section>
    );
};

export default BottomCTA;