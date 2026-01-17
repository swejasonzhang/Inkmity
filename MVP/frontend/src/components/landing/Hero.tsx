import React from "react";
import { m } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type HeroProps = {
    textFadeUp: any;
    prefersReduced: boolean;
    wc?: React.CSSProperties;
    onReveal: () => void;
};

const Hero: React.FC<HeroProps> = ({ prefersReduced, wc, textFadeUp, onReveal }) => {
    const gradientInitial = { backgroundPositionX: "100%" as const };
    const gradientAnimate = { backgroundPositionX: "0%" as const };
    const gradientTransition = { backgroundPositionX: { duration: 2, ease: [0.22, 1, 0.36, 1], delay: 0.1 } } as const;

    const scrollDown = () => {
        onReveal();
        const anchor = document.getElementById("features-title") as HTMLElement | null;
        if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "start" });
        else window.scrollBy({ top: Math.max(0, window.innerHeight * 0.9), behavior: "smooth" });
    };

    return (
        <section className="px-fluid-sm">
            <div className="mx-auto max-w-9xl text-center">
                <h1 className="text-fluid-4xl md:text-fluid-5xl lg:text-fluid-6xl font-extrabold leading-tight tracking-tight" style={wc}>
                    <m.span
                        initial={gradientInitial}
                        {...(!prefersReduced && { animate: gradientAnimate })}
                        transition={gradientTransition}
                    >
                        Find the right tattoo artist—<span className="text-inherit">without the chaos</span>.
                    </m.span>
                </h1>

                <m.p
                    variants={textFadeUp}
                    className="mt-fluid-md md:mt-fluid-lg text-fluid-xl md:text-fluid-xl lg:text-fluid-2xl font-bold leading-tight max-w-4xl mx-auto"
                    style={wc}
                >
                    Inkmity brings real availability, real context, and verified reviews—so you can align fast and book with confidence.
                </m.p>

                <m.div variants={textFadeUp} className="mt-fluid-lg sm:mt-fluid-xl flex-center gap-fluid-sm sm:gap-fluid-md">
                    <Button
                        asChild
                        className="rounded-fluid-md px-fluid-md py-fluid-sm md:px-fluid-lg md:py-fluid-md text-fluid-sm md:text-fluid-lg font-semibold bg-[color:var(--fg)] text-[color:var(--bg)] hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[color:var(--fg)]/30"
                    >
                        <Link to="/signup" aria-label="Create your Inkmity account">Create your account!</Link>
                    </Button>
                    <Button
                        asChild
                        variant="outline"
                        className="rounded-fluid-md px-fluid-md py-fluid-sm md:px-fluid-lg md:py-fluid-md text-fluid-sm md:text-fluid-lg font-semibold border border-app bg-card/70 text-app hover:bg-card/80 focus-visible:ring-2 focus-visible:ring-[color:var(--border)]/40"
                    >
                        <Link to="/login" aria-label="Log in to Inkmity">Login here!</Link>
                    </Button>
                </m.div>

                <m.div variants={textFadeUp} className="mt-fluid-sm md:mt-fluid-lg flex-center">
                    <button
                        type="button"
                        onClick={scrollDown}
                        className={[
                            "group inline-flex items-center gap-fluid-sm sm:gap-fluid-md rounded-fluid-md border border-app",
                            "bg-card/70 backdrop-blur px-fluid-md py-fluid-sm md:px-fluid-lg md:py-fluid-md text-fluid-sm md:text-fluid-lg font-semibold text-app",
                            "transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[color:var(--border)]",
                            "shadow-[0_6px_20px_rgba(0,0,0,0.25)]",
                        ].join(" ")}
                        aria-label="Scroll for more"
                    >
                        <span className="relative">
                            <span className="absolute -inset-0.5 rounded-full opacity-0 group-hover:opacity-100 transition">
                                <span className="block h-full w-full rounded-full bg-[conic-gradient(from_180deg,rgba(255,255,255,0.12),transparent_40%,rgba(255,255,255,0.12))] blur-[6px]" />
                            </span>
                            <span className="relative z-10">Scroll for more</span>
                        </span>
                        <span
                            className={[
                                "inline-grid h-6 w-6 md:h-8 md:w-8 place-items-center rounded-full border border-app text-app",
                                "transition-transform",
                                "group-hover:translate-y-0.5",
                            ].join(" ")}
                            aria-hidden
                        >
                            <span className="block leading-none">↓</span>
                        </span>
                    </button>
                </m.div>
            </div>

            <m.div
                variants={textFadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.6 }}
                className="mx-auto mt-8 md:mt-12 h-px w-40 md:w-64 lg:w-80 bg-gradient-to-r from-transparent via-[color:var(--border)] to-transparent"
            />
        </section>
    );
};

export default Hero;