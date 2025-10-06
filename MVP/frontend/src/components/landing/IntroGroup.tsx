import React from "react";
import { m } from "framer-motion";
import Hero from "./Hero";
import FounderStory from "./FounderStory";

const introStagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.14, delayChildren: 0.06 } },
};

const IntroGroup: React.FC<{
    prefersReduced?: boolean;
    wc?: React.CSSProperties;
    textFadeUp: any;
}> = ({ prefersReduced, wc, textFadeUp }) => {
    return (
        <section className="relative">
            <div className="mx-auto max-w-7xl px-4">
                <m.div
                    variants={introStagger}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.35 }}
                >
                    <Hero prefersReduced={!!prefersReduced} wc={wc} textFadeUp={textFadeUp} />
                    <div className="-mt-10 sm:-mt-12 lg:-mt-16">
                        <FounderStory wc={wc} textFadeUp={textFadeUp} />
                    </div>
                </m.div>
            </div>
        </section>

    );
};

export default IntroGroup;