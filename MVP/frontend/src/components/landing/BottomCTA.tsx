import React from "react";
import { Link } from "react-router-dom";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const BottomCTA: React.FC<{ textFadeUp: any; wc?: React.CSSProperties }> = ({ textFadeUp, wc }) => {
    return (
        <section className="grid place-items-center md:min-h-[20svh] px-4">
            <Card className="w-full max-w-7xl bg-card/80 backdrop-blur border border-app ink-card">
                <CardContent className="p-8 text-center">
                    <m.h2
                        variants={textFadeUp}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.6 }}
                        className="text-2xl md:text-3xl font-bold"
                        style={wc}
                    >
                        Ready to make booking painless?
                    </m.h2>

                    <m.p
                        variants={textFadeUp}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.6 }}
                        className="mt-2 text-subtle max-w-2xl mx-auto"
                        style={wc}
                    >
                        Join Inkmity today—message in real time, search faster, and build trust with verified reviews.
                    </m.p>

                    <Separator className="my-6 bg-elevated" />

                    <m.div
                        variants={textFadeUp}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.6 }}
                    >
                        <Button asChild className="rounded-xl px-6 py-6 border border-app bg-elevated hover:bg-elevated/90">
                            <Link to="/signup">Create your account</Link>
                        </Button>
                    </m.div>
                </CardContent>
            </Card>
        </section>
    );
};

export default BottomCTA;