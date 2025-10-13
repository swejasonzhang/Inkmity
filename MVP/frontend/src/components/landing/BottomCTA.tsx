import React from "react";
import { Link } from "react-router-dom";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";

const BottomCTA: React.FC<{ textFadeUp: any; wc?: React.CSSProperties }> = ({ textFadeUp, wc }) => {
    return (
        <section className="grid place-items-center md:min-h-[20svh]">
            <div className="mx-auto max-w-7xl rounded-2xl bg-card/60 p-8 text-center">
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
                    className="mt-2 text-subtle"
                    style={wc}
                >
                    Join Inkmity today—message in real time, search faster, and build trust with verified reviews.
                </m.p>
                <div className="mt-6">
                    <Link to="/signup">
                        <Button className="rounded-lg px-6 py-3 border-2 border-white">
                            Create your account
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default BottomCTA;