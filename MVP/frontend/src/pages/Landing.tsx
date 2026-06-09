import React from "react";
import {
    LazyMotion,
    domAnimation,
    type Variants,
    MotionConfig,
    useReducedMotion,
    m,
} from "framer-motion";
import Header from "@/components/header/Header";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import ForArtists from "@/components/landing/ForArtists";
import BottomCTA from "@/components/landing/BottomCTA";
import Divider from "@/components/landing/Divider";
import VideoBackground from "@/components/VideoBackground";
import CookieConsent from "@/components/access/CookieConsent";

const Landing: React.FC = () => {
    const prefersReduced = useReducedMotion();
    const wc = prefersReduced ? undefined : ({ willChange: "transform,opacity,filter" } as React.CSSProperties);

    const textFadeUp: Variants = {
        hidden: { opacity: 0, y: 14, filter: "blur(8px)" },
        visible: prefersReduced
            ? { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0 } }
            : {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                transition: {
                    opacity: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                    y: { type: "spring", stiffness: 220, damping: 26, mass: 0.7 },
                    filter: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
                },
            },
    };

    const introStagger = {
        hidden: {},
        visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
    };

    const handleScrollToFeatures = () => {
        const target = document.getElementById("how-it-works");
        if (target) {
            const headerHeight = document.querySelector("header")?.offsetHeight ?? 72;
            const y = target.getBoundingClientRect().top + window.scrollY - headerHeight;
            window.scrollTo({ top: y, behavior: "smooth" });
        }
    };

    return (
        <>
            <VideoBackground />
            <MotionConfig reducedMotion={prefersReduced ? "always" : "never"}>
                <LazyMotion features={domAnimation} strict>
                    <div className="relative z-10 text-app flex flex-col min-h-[100svh]">
                        <Header />

                        <main className="flex-1">
                            <section className="relative flex items-center justify-center min-h-svh px-4 sm:px-6 lg:px-8">
                                <m.div
                                    variants={introStagger}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.3 }}
                                    className="w-full max-w-4xl mx-auto -mt-12 sm:-mt-14 md:-mt-16"
                                >
                                    <Hero
                                        prefersReduced={!!prefersReduced}
                                        wc={wc}
                                        textFadeUp={textFadeUp}
                                        onReveal={handleScrollToFeatures}
                                    />
                                </m.div>
                            </section>

                            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-14 pb-12 sm:pb-16">
                                <HowItWorks textFadeUp={textFadeUp} wc={wc} />

                                <Divider />

                                <FeaturesGrid textFadeUp={textFadeUp} wc={wc} />

                                <Divider />

                                <ForArtists textFadeUp={textFadeUp} wc={wc} />

                                <Divider />

                                <BottomCTA textFadeUp={textFadeUp} wc={wc} />
                            </div>
                        </main>

                        <footer className="py-4 sm:py-6 px-4 sm:px-6 lg:px-8 border-t border-[color:var(--border)]/40">
                            <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-[color:var(--fg)]/40">
                                <span>© {new Date().getFullYear()} Inkmity. All rights reserved.</span>
                                <div className="flex items-center gap-4">
                                    <a href="/about" className="hover:text-[color:var(--fg)]/70 transition-colors">About</a>
                                    <a href="/contact" className="hover:text-[color:var(--fg)]/70 transition-colors">Contact</a>
                                    <a href="/privacy" className="hover:text-[color:var(--fg)]/70 transition-colors">Privacy</a>
                                    <a href="/terms" className="hover:text-[color:var(--fg)]/70 transition-colors">Terms</a>
                                </div>
                            </div>
                        </footer>
                    </div>
                </LazyMotion>
            </MotionConfig>
            <CookieConsent />
        </>
    );
};

export default Landing;
