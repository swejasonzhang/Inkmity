import React from "react";
import { m } from "framer-motion";
import { Link } from "react-router-dom";

type HeroProps = {
    textFadeUp: any;
    prefersReduced: boolean;
    wc?: React.CSSProperties;
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

const Hero: React.FC<HeroProps> = ({ prefersReduced, wc, textFadeUp }) => {
    const isLight = useIsLightTheme();

    const gradientInitial = { backgroundPositionX: "100%" as const };
    const gradientAnimate = { backgroundPositionX: "0%" as const };
    const gradientTransition = {
        backgroundPositionX: { duration: 2, ease: [0.22, 1, 0.36, 1], delay: 0.1 },
    } as const;

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
                    Inkmity brings real availability, real context, and verified reviews—so you can align fast and book with
                    confidence.
                </m.p>

                <m.div
                    variants={textFadeUp}
                    className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
                >
                    <Link
                        to="/signup"
                        className="
              inline-flex items-center justify-center
              rounded-xl px-5 sm:px-6 py-3
              font-semibold
              bg-white text-black
              hover:opacity-95 active:scale-[0.99]
              border border-app shadow-sm
              transition
              focus:outline-none focus:ring-2 focus:ring-[color:var(--border)]
              dark:bg-white dark:text-black
            "
                    >
                        Sign Up
                    </Link>

                    <Link
                        to="/login"
                        className="
              inline-flex items-center justify-center
              rounded-xl px-5 sm:px-6 py-3
              font-semibold
              bg-elevated text-app
              hover:bg-elevated/90 active:scale-[0.99]
              border border-app
              transition
              focus:outline-none focus:ring-2 focus:ring-[color:var(--border)]
            "
                    >
                        Already have an account?
                    </Link>
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