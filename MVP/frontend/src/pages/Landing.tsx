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
        const target = document.getElementById("features");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
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
                    <div className="relative z-10 text-app flex-col min-h-[100svh]">
                        <div className="sticky top-0 z-50 bg-app/80 backdrop-blur-sm sm:backdrop-blur-md border-b border-app">
                            <Header />
                        </div>

                        <main className="flex-1">
                            <section className="relative pt-4 xs:pt-6 sm:pt-8 md:pt-10 lg:pt-12">
                                <div className="mx-auto max-w-6xl px-fluid-md xs:px-fluid-lg sm:px-fluid-xl md:px-fluid-2xl">
                                    <m.div
                                        variants={introStagger}
                                        initial="hidden"
                                        whileInView="visible"
                                        viewport={{ once: true, amount: 0.4 }}
                                        className="gap-fluid-md xs:gap-fluid-lg sm:gap-fluid-xl md:gap-fluid-2xl lg:gap-fluid-3xl"
                                    >
                                        <Hero prefersReduced={!!prefersReduced} wc={wc} textFadeUp={textFadeUp} onReveal={handleRevealButton} />
                                    </m.div>
                                </div>
                            </section>

                            <div ref={dividerWrapRef} className="mt-fluid-xs xs:mt-fluid-sm sm:mt-fluid-md md:mt-fluid-lg lg:mt-fluid-xl mb-fluid-xs xs:mb-fluid-sm sm:mb-fluid-md md:mb-fluid-lg">
                                <Divider />
                            </div>

                            <div ref={sentinelRef} style={{ height: 10 }} />

                            {!revealed && didMount && (
                                <div aria-hidden className="mx-auto max-w-6xl px-fluid-md xs:px-fluid-lg sm:px-fluid-xl md:px-fluid-2xl">
                                    <div className="h-[40vh] xs:h-[45vh] sm:h-[55vh] md:h-[65vh] lg:h-[70vh] xl:h-[75vh]" />
                                </div>
                            )}

                            <m.div
                                initial="hidden"
                                animate={revealed ? "show" : "hidden"}
                                variants={featuresFade}
                                className="mx-auto max-w-6xl px-fluid-md xs:px-fluid-lg sm:px-fluid-xl md:px-fluid-2xl py-fluid-xs xs:py-fluid-sm sm:py-fluid-md md:py-fluid-lg lg:py-fluid-xl"
                                style={{ willChange: "opacity, transform" }}
                            >
                                {revealed && (
                                    <>
                                        <FeaturesGrid textFadeUp={textFadeUp} wc={wc} />
                                        <Divider className="my-2 xs:my-2.5 sm:my-3 md:my-3.5 lg:my-4" />
                                        <Differentiators textFadeUp={textFadeUp} wc={wc} />
                                        <BottomCTA textFadeUp={textFadeUp} wc={wc} />
                                        <Divider className="mt-1 xs:mt-1.5 sm:mt-2 md:mt-2.5 lg:mt-3 mb-0" />
                                    </>
                                )}
                            </m.div>
                        </main>

                        <footer className="pt-1 xs:pt-1.5 sm:pt-2 md:pt-2.5 lg:pt-3 pb-3 xs:pb-3.5 sm:pb-4 md:pb-5 lg:pb-6 px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8">
                            <div className="mx-auto max-w-6xl text-center text-xs xs:text-[0.8125rem] sm:text-sm md:text-base text-subtle">© {new Date().getFullYear()} Inkmity. All rights reserved.</div>
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
                    "sm:inset-0 sm:left-0 sm:translate-x-0 sm:w-full sm:h-full",
                    "object-contain sm:object-cover",
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