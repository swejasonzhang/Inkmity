import React from "react";
import Header from "@/components/header/Header";
import {
    LazyMotion,
    domAnimation,
    type Variants,
    MotionConfig,
    useReducedMotion,
    m,
} from "framer-motion";

import { useTheme } from "@/components/header/useTheme";
import Hero from "@/components/landing/Hero";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import Differentiators from "@/components/landing/Differentiators";
import BottomCTA from "@/components/landing/BottomCTA";
import Divider from "@/components/landing/Divider";

const Landing: React.FC = () => {
    const prefersReduced = useReducedMotion();
    const wc = prefersReduced ? undefined : ({ willChange: "transform,opacity" } as React.CSSProperties);

    const { theme, logoSrc } = useTheme();
    const noop = () => { };

    const textFadeUp: Variants = {
        hidden: { opacity: 0, y: 10 },
        visible: {
            opacity: 1,
            y: 0,
            transition: prefersReduced
                ? { duration: 0 }
                : { type: "spring", stiffness: 220, damping: 26, mass: 0.7, velocity: 0.2 },
        },
    };

    const introStagger = {
        hidden: {},
        visible: { transition: { staggerChildren: 0.12, delayChildren: 0.04 } },
    };

    return (
        <>
            <div className="fixed inset-0 -z-20 bg-app" aria-hidden />
            <MotionConfig reducedMotion={prefersReduced ? "always" : "never"}>
                <LazyMotion features={domAnimation} strict>
                    <div className="relative z-10 min-h-[100svh] text-app flex flex-col">
                        <Header theme={theme} toggleTheme={noop} logoSrc={logoSrc} />

                        <main className="flex-1">
                            <section className="relative">
                                <div className="mx-auto max-w-7xl px-4">
                                    <m.div
                                        variants={introStagger}
                                        initial="hidden"
                                        whileInView="visible"
                                        viewport={{ once: true, amount: 0.4 }}
                                        className="space-y-16 md:space-y-24"
                                    >
                                        <Hero prefersReduced={!!prefersReduced} wc={wc} textFadeUp={textFadeUp} />
                                    </m.div>
                                </div>
                            </section>

                            <Divider className="my-10" />
                            <FeaturesGrid textFadeUp={textFadeUp} wc={wc} />
                            <Divider className="my-10" />
                            <Differentiators textFadeUp={textFadeUp} wc={wc} />
                            <BottomCTA textFadeUp={textFadeUp} wc={wc} />
                            <Divider />
                        </main>

                        <footer className="px-4 pb-6">
                            <div className="mx-auto max-w-7xl text-center text-sm text-subtle">
                                © {new Date().getFullYear()} Inkmity. All rights reserved.
                            </div>
                        </footer>
                    </div>
                </LazyMotion>
            </MotionConfig>

            <video
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                className={[
                    "fixed top-0 left-1/2 -translate-x-1/2 z-[999]",
                    "w-auto max-w-none",
                    "h-[100svh]",
                    "md:inset-0 md:left-0 md:translate-x-0 md:w-full md:h-full",
                    "object-contain md:object-cover",
                    "pointer-events-none opacity-20 mix-blend-screen",
                ].join(" ")}
                aria-hidden
            >
                <source src="/Landing.mp4" type="video/mp4" />
            </video>
        </>
    );
};

export default Landing;