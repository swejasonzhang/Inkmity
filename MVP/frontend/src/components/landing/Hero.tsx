import React from "react";
import { m } from "framer-motion";

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
    const gradientClass =
        "text-transparent bg-clip-text bg-[linear-gradient(90deg,var(--fg)_0%,var(--fg)_40%,var(--bg)_60%,var(--bg)_100%)]";
    const gradientStyle: React.CSSProperties = { backgroundSize: "200% 100%", backgroundPositionX: "100%" };

    return (
        <section className="px-3">
            <div className="mx-auto max-w-9xl pt-20 text-center">
                <h1 className="text-5xl md:text-6xl lg:text-8xl font-extrabold leading-tight tracking-tight" style={wc}>
                    <m.span
                        key={`hero-head-${isLight ? "light" : "dark"}`}
                        initial={gradientInitial}
                        {...(!prefersReduced && { animate: gradientAnimate })}
                        transition={gradientTransition}
                        className={gradientClass}
                        style={gradientStyle}
                    >
                        Find the right tattoo artist—<span className="text-inherit">without the chaos</span>.
                    </m.span>
                </h1>


                <m.p
                    variants={textFadeUp}
                    className="mt-5 text-2xl md:text-2xl lg:text-3xl font-bold leading-tight text-black dark:text-white max-w-4xl mx-auto"
                    style={wc}
                >
                    Inkmity brings real availability, real context, and verified reviews—so you can align fast and book with confidence.
                </m.p>

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
