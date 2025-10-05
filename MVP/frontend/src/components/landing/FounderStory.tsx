import React from "react";
import { m } from "framer-motion";

const FounderStory: React.FC<{ textFadeUp: any; wc?: React.CSSProperties }> = ({ textFadeUp, wc }) => {
    return (
        <section className="px-4">
            <div className="mx-auto max-w-4xl rounded-2xl border border-app bg-card/60 p-6 md:p-8">
                <m.h2
                    variants={textFadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.6 }}
                    className="text-2xl md:text-3xl font-bold"
                    style={wc}
                >
                    Why I started Inkmity
                </m.h2>
                <m.p
                    variants={textFadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.6 }}
                    className="mt-3 md:mt-4 text-subtle text-base md:text-lg leading-relaxed"
                    style={wc}
                >
                    I’ve been that person trying to explain a tattoo idea over DMs, screenshots, and half-remembered references—and I’ve
                    watched artists spend hours clarifying basics before they can even quote. After studying computer science, working
                    hands-on in a small business, graduating from a coding bootcamp, and building products for others, I wanted to
                    create something practical that helps both sides. Inkmity is my answer: a community-built space where context comes
                    first—clear briefs, verified reviews, real availability, and messaging that keeps everything in one place. It’s built
                    for artists to thrive without nickel-and-diming, and for clients to book confidently without the chaos.
                </m.p>
            </div>
        </section>
    );
};

export default FounderStory;