import React from "react";
import { m } from "framer-motion";
import { Link } from "react-router-dom"; // ⬅️ add this

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

const Hero: React.FC<HeroProps> = ({ textFadeUp, prefersReduced, wc }) => {
    const isLight = useIsLightTheme();

    return (
        <section className="px-4">
            <div className="mx-auto max-w-7xl pt-20 pb-16 text-center">
                <m.h1
                    variants={textFadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.7 }}
                    className="text-4xl md:text-6xl font-extrabold tracking-tight"
                    style={wc}
                >
                    <m.span
                        key={isLight ? "light" : "dark"}
                        initial={{ backgroundPositionX: "100%" }}
                        {...(!prefersReduced && { animate: { backgroundPositionX: "0%" } })}
                        transition={{
                            backgroundPositionX: { duration: 2, ease: [0.22, 1, 0.36, 1], delay: 0.1 },
                        }}
                        className="
              text-transparent bg-clip-text
              bg-[linear-gradient(90deg,var(--fg)_0%,var(--fg)_40%,var(--bg)_60%,var(--bg)_100%)]
            "
                        style={{ backgroundSize: "200% 100%", backgroundPositionX: "100%" }}
                    >
                        Find the right tattoo artist—<span className="text-inherit">without the chaos</span>.
                    </m.span>
                </m.h1>

                <m.p
                    variants={textFadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.7 }}
                    className="mt-4 text-base md:text-lg text-subtle max-w-2xl mx-auto"
                    style={wc}
                >
                    Inkmity is a community-built platform with real people and real reviews—helping clients clearly
                    communicate ideas and helping artists book with context. Start aligned and keep it stress-free.
                </m.p>

                <m.div
                    variants={textFadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.7 }}
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
                        Get Started
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
                        Already Have An Account? Login
                    </Link>
                </m.div>
            </div>
        </section>
    );
};

export default Hero;
