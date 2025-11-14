import React from "react";
import { LazyMotion, domAnimation, type Variants, MotionConfig, useReducedMotion, m } from "framer-motion";
import Header from "@/components/header/Header";
import Hero from "@/components/landing/Hero";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import Differentiators from "@/components/landing/Differentiators";
import BottomCTA from "@/components/landing/BottomCTA";
import Divider from "@/components/landing/Divider";

const Landing: React.FC = () => {
    const prefersReduced = useReducedMotion();
    const wc = prefersReduced ? undefined : ({ willChange: "transform,opacity" } as React.CSSProperties);

    const textFadeUp: Variants = {
        hidden: { opacity: 0, y: 10 },
        visible: prefersReduced
            ? { opacity: 1, y: 0, transition: { duration: 0 } }
            : { opacity: 1, y: 0, transition: { type: "spring", stiffness: 220, damping: 26, mass: 0.7, velocity: 0.2 } },
    };

    const introStagger = {
        hidden: {},
        visible: { transition: { staggerChildren: 0.12, delayChildren: 0.04 } },
    };

    const [revealed, setRevealed] = React.useState(false);
    const [didMount, setDidMount] = React.useState(false);

    const dividerWrapRef = React.useRef<HTMLDivElement | null>(null);
    const sentinelRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => setDidMount(true), []);

    const reveal = React.useCallback(() => setRevealed(true), []);
    const handleRevealButton = () => {
        reveal();
        const target = document.getElementById("features-title");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    React.useEffect(() => {
        if (revealed) return;
        const onIntent = () => {
            if (!revealed) reveal();
        };
        window.addEventListener("wheel", onIntent, { passive: true });
        window.addEventListener("touchmove", onIntent, { passive: true });
        window.addEventListener("pointerdown", onIntent, { passive: true });
        window.addEventListener("keydown", onIntent);
        return () => {
            window.removeEventListener("wheel", onIntent);
            window.removeEventListener("touchmove", onIntent);
            window.removeEventListener("pointerdown", onIntent);
            window.removeEventListener("keydown", onIntent);
        };
    }, [revealed, reveal]);

    React.useEffect(() => {
        if (revealed) return;
        const el = sentinelRef.current;
        if (!el) return;
        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) reveal();
            },
            { root: null, threshold: 0.01 }
        );
        io.observe(el);
        return () => io.disconnect();
    }, [revealed, reveal]);

    const featuresFade: Variants = prefersReduced
        ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0 } } }
        : { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } } };

    return (
        <>
            <div className="fixed inset-0 -z-20 bg-app" aria-hidden />
            <MotionConfig reducedMotion={prefersReduced ? "always" : "never"}>
                <LazyMotion features={domAnimation} strict>
                    <div className="relative z-10 text-app flex flex-col min-h-[100svh]">
                        <div className="sticky top-0 z-50 bg-app/80 backdrop-blur border-b border-app">
                            <Header />
                        </div>

                        <main className="flex-1">
                            <section className="relative pt-4 md:pt-10">
                                <div className="mx-auto max-w-6xl px-4">
                                    <m.div
                                        variants={introStagger}
                                        initial="hidden"
                                        whileInView="visible"
                                        viewport={{ once: true, amount: 0.4 }}
                                        className="space-y-4 md:space-y-6"
                                    >
                                        <Hero prefersReduced={!!prefersReduced} wc={wc} textFadeUp={textFadeUp} onReveal={handleRevealButton} />
                                    </m.div>
                                </div>
                            </section>

                            <div ref={dividerWrapRef} className="mt-2 md:mt-3 mb-1 md:mb-2">
                                <Divider />
                            </div>

                            <div ref={sentinelRef} style={{ height: 10 }} />

                            {!revealed && didMount && (
                                <div aria-hidden className="mx-auto max-w-6xl px-4">
                                    <div className="h-[40vh] md:h-[70vh]" />
                                </div>
                            )}

                            <m.div
                                initial="hidden"
                                animate={revealed ? "show" : "hidden"}
                                variants={featuresFade}
                                className="mx-auto max-w-6xl px-4 py-1 md:py-2"
                                style={{ willChange: "opacity, transform" }}
                            >
                                {revealed && (
                                    <>
                                        <div id="features-title" />
                                        <FeaturesGrid textFadeUp={textFadeUp} wc={wc} />
                                        <Divider className="my-2 md:my-3" />
                                        <Differentiators textFadeUp={textFadeUp} wc={wc} />
                                        <BottomCTA textFadeUp={textFadeUp} wc={wc} />
                                        <Divider className="mt-1 md:mt-2 mb-0" />
                                    </>
                                )}
                            </m.div>
                        </main>

                        <footer className="pt-1 md:pt-2 pb-3 md:pb-4 px-3 md:px-4">
                            <div className="mx-auto max-w-6xl text-center text-xs md:text-sm text-subtle">© {new Date().getFullYear()} Inkmity. All rights reserved.</div>
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