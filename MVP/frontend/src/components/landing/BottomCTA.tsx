import React from "react";
import { Link } from "react-router-dom";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const BottomCTA: React.FC<{ textFadeUp: any; wc?: React.CSSProperties }> = ({ textFadeUp, wc }) => {
    return (
        <section className="grid place-items-center px-3 sm:px-4 md:min-h-[20svh]">
            <Card className="w-full max-w-[22rem] sm:max-w-2xl md:max-w-[60rem] lg:max-w-[76rem] mx-auto bg-card/80 backdrop-blur border border-app ink-card">
                <CardContent className="p-3 sm:p-4 md:p-6 text-center">
                    <m.h2
                        variants={textFadeUp}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.6 }}
                        className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight"
                        style={wc}
                    >
                        Ready to make booking painless?
                    </m.h2>

                    <m.p
                        variants={textFadeUp}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.6 }}
                        className="mt-1.5 sm:mt-2 text-sm sm:text-base text-subtle max-w-2xl mx-auto"
                        style={wc}
                    >
                        Join Inkmity today—message in real time, search faster, and build trust with verified reviews.
                    </m.p>

                    <Separator className="my-4 sm:my-5 md:my-6 bg-elevated" />

                    <m.div
                        variants={textFadeUp}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.6 }}
                    >
                        <Button
                            asChild
                            className="rounded-lg sm:rounded-xl px-4 py-3 sm:px-5 sm:py-4 md:px-6 md:py-6 text-sm md:text-base border border-app bg-elevated hover:bg-elevated/90"
                        >
                            <Link to="/signup">Create your account</Link>
                        </Button>
                    </m.div>
                </CardContent>
            </Card>
        </section>
    );
};

export default BottomCTA;