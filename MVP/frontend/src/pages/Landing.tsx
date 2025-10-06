import React from "react";
import Header from "@/components/header/Header";
import {
    LazyMotion,
    domAnimation,
    type Variants,
    type Transition,
    MotionConfig,
    useReducedMotion,
} from "framer-motion";

import Hero from "@/components/landing/Hero";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import Differentiators from "@/components/landing/Differentiators";
import FounderStory from "@/components/landing/FounderStory";
import BottomCTA from "@/components/landing/BottomCTA";
import Divider from "@/components/landing/Divider";

const SPRING_SOFT: Transition = { type: "spring", stiffness: 64, damping: 26, mass: 1.05, restDelta: 0.002 };

const textFadeUp: Variants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: SPRING_SOFT },
};

const Landing: React.FC = () => {
    const prefersReduced = useReducedMotion();
    const wc = prefersReduced ? undefined : ({ willChange: "transform,opacity" } as React.CSSProperties);

    return (
        <>
            <div className="fixed inset-0 -z-20 bg-app" aria-hidden />

            <MotionConfig reducedMotion={prefersReduced ? "always" : "never"}>
                <LazyMotion features={domAnimation} strict>
                    <div className="relative z-10 min-h-[100svh] text-app flex flex-col">
                        <Header />

                        <main className="flex-1">
                            <Hero textFadeUp={textFadeUp} prefersReduced={!!prefersReduced} wc={wc} />
                            <Divider className="mb-10" />
                            <FeaturesGrid textFadeUp={textFadeUp} wc={wc} />
                            <Differentiators textFadeUp={textFadeUp} wc={wc} />
                            <Divider className="my-10" />
                            <FounderStory textFadeUp={textFadeUp} wc={wc} />
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
                    " pointer-events-none opacity-50 mix-blend-screen",
                ].join(" ")}
                aria-hidden
            >
                <source src="/Landing.mp4" type="video/mp4" />
            </video>
        </>
    );
};

export default Landing;
