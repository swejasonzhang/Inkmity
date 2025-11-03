import React from "react";
import { m } from "framer-motion";

type HeroProps = {
    textFadeUp: any;
    prefersReduced: boolean;
    wc?: React.CSSProperties;
    onReveal: () => void;
};

function useIsLightTheme() {
    const [isLight, setIsLight] = React.useState(
        typeof document !== "undefined" ? document.documentElement.classList.contains("light") : false
    );
    React.useEffect(() => {
        if (typeof document === "undefined") return;
        const html = document.documentElement;
        const mo = new MutationObserver(() => setIsLight(html.classList.contains("light")));
        mo.observe(html, { attributes: true, attributeFilter: ["class", "data-ink-theme"] });
        return () => mo.disconnect();
    }, []);
    return isLight;
}

const Hero: React.FC<HeroProps> = ({ prefersReduced, wc, textFadeUp, onReveal }) => {
    const isLight = useIsLightTheme();

    const gradientInitial = { backgroundPositionX: "100%" as const };
    const gradientAnimate = { backgroundPositionX: "0%" as const };
    const gradientTransition = {
        backgroundPositionX: { duration: 2, ease: [0.22, 1, 0.36, 1], delay: 0.1 },
    } as const;

    const scrollDown = () => {
        onReveal();
        const anchor = document.getElementById("features-title") as HTMLElement | null;
        if (anchor) {
            anchor.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
            window.scrollBy({ top: Math.max(0, window.innerHeight * 0.9), behavior: "smooth" });
        }
    };

    return (
        <section className="px-3">
            <div className="mx-auto max-w-9xl pt-20 text-center">
                <h1 className="text-5xl md:text-6xl lg:text-8xl font-extrabold leading-tight tracking-tight" style={wc}>
                    <m.span
                        key={`hero-head-${isLight ? "light" : "dark"}`}
                        initial={gradientInitial}
                        {...(!prefersReduced && { animate: gradientAnimate })}
                        transition={gradientTransition}
                    >
                        Find the right tattoo artist—<span className="text-inherit">without the chaos</span>.
                    </m.span>
                </h1>

                <m.p
                    variants={textFadeUp}
                    className="mt-5 text-2xl md:text-2xl lg:text-3xl font-bold leading-tight max-w-4xl mx-auto"
                    style={wc}
                >
                    Inkmity brings real availability, real context, and verified reviews—so you can align fast
                    and book with confidence.
                </m.p>

                <m.div variants={textFadeUp} className="mt-10 flex items-center justify-center">
                    <button
                        type="button"
                        onClick={scrollDown}
                        className={[
                            "group inline-flex items-center gap-3 rounded-full border border-app",
                            "bg-card/70 backdrop-blur px-6 py-3 text-base md:text-lg font-semibold text-app",
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
                                "inline-grid h-8 w-8 place-items-center rounded-full border border-app text-app",
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
                className="mx-auto mt-12 h-px w-48 md:w-64 lg:w-80 bg-gradient-to-r from-transparent via-[color:var(--border)] to-transparent"
            />
        </section>
    );
};

export default Hero;
