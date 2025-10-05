import React from "react";
import { Link } from "react-router-dom";
import Header from "@/components/dashboard/Header";
import { Button } from "@/components/ui/button";
import {
    LazyMotion,
    domAnimation,
    m,
    type Variants,
    type Transition,
    MotionConfig,
    useReducedMotion,
} from "framer-motion";

const SPRING_SOFT: Transition = { type: "spring", stiffness: 64, damping: 26, mass: 1.05, restDelta: 0.002 };

const textFadeUp: Variants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: SPRING_SOFT },
};

const features = [
    {
        title: "Real-time messaging",
        body:
            "Chat instantly with artists and clients. Share references, clarify details, and keep everything in one thread.",
        img: "/images/features/messaging.jpg",
        alt: "In-app real-time chat between client and artist",
    },
    {
        title: "Rewards for artists & clients",
        body:
            "Earn perks as bookings grow—priority placement, profile boosts, and community recognition for artists. Clients unlock discounts, early access to flash deals, and other members-only perks.",
        img: "/images/features/rewards.jpg",
        alt: "Badges and rewards showcasing user perks",
    },
    {
        title: "Free for artists",
        body:
            "Artists pay nothing to join or get booked. Clients cover a small booking fee to keep the lights on.",
        img: "/images/features/free-for-artists.jpg",
        alt: "Artist dashboard showing free signup",
    },
    {
        title: "Fast, powerful filters",
        body:
            "Find the right fit fast—filter by style, location, budget, availability, and healed portfolio quality.",
        img: "/images/features/filters.jpg",
        alt: "Search filters UI for finding artists quickly",
    },
    {
        title: "Community-built",
        body:
            "Shaped by artists and clients who use it. Share ideas, vote on features, and help set the roadmap.",
        img: "/images/features/community.jpg",
        alt: "Community forum and voting interface",
    },
    {
        title: "Reviews that matter",
        body:
            "Ratings from verified clients only—no spam, no bots—so reputations reflect real studio experiences.",
        img: "/images/features/reviews.jpg",
        alt: "Verified review cards from real clients",
    },
];

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

const Landing: React.FC = () => {
    const prefersReduced = useReducedMotion();
    const wc = prefersReduced ? undefined : ({ willChange: "transform,opacity" } as React.CSSProperties);
    const isLight = useIsLightTheme();

    return (
        <MotionConfig reducedMotion={prefersReduced ? "always" : "never"}>
            <LazyMotion features={domAnimation} strict>
                <div className="relative min-h-dvh bg-app text-app flex flex-col">
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="auto"
                        className="fixed inset-0 -z-10 h-full w-full object-cover pointer-events-none"
                        aria-hidden
                    >
                        <source src="/Background.mp4" type="video/mp4" />
                    </video>
                    <div className="fixed inset-0 -z-10 bg-black/50" />

                    <Header />

                    <main className="flex-1">
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

                                <div className="mt-8 flex items-center justify-center gap-3">
                                    <Link to="/signup">
                                        <Button className="rounded-lg px-6 py-3 border-2 border-black dark:border-white hover:border-black/80 dark:hover:border-white/80">
                                            Get started — it’s free
                                        </Button>
                                    </Link>
                                    <Link to="/login">
                                        <Button
                                            variant="outline"
                                            className="rounded-lg px-6 py-3"
                                        >
                                            I already have an account
                                        </Button>
                                    </Link>
                                </div>

                                <m.p
                                    variants={textFadeUp}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.7 }}
                                    className="mt-3 text-sm text-subtle"
                                    style={wc}
                                >
                                    Free for artists • Clients pay a small booking fee
                                </m.p>
                            </div>
                        </section>

                        <section className="px-4">
                            <div className="mx-auto max-w-7xl">
                                {features.map((f, i) => {
                                    const reverse = i % 2 === 1;
                                    return (
                                        <article
                                            key={f.title}
                                            className="rounded-2xl border border-app bg-elevated/60 p-6 md:p-8 mb-8 md:mb-10"
                                        >
                                            <div
                                                className={[
                                                    "flex flex-col items-center gap-8 md:gap-10",
                                                    "lg:min-h-[56vh]",
                                                    reverse ? "lg:flex-row-reverse" : "lg:flex-row",
                                                ].join(" ")}
                                            >
                                                <div className="w-full lg:w-1/2">
                                                    <div className="rounded-2xl border border-app bg-elevated/70 p-6 md:p-8">
                                                        <m.h3
                                                            variants={textFadeUp}
                                                            initial="hidden"
                                                            whileInView="visible"
                                                            viewport={{ once: true, amount: 0.6 }}
                                                            className="text-2xl md:text-3xl font-semibold leading-tight"
                                                            style={wc}
                                                        >
                                                            {f.title}
                                                        </m.h3>
                                                        <m.p
                                                            variants={textFadeUp}
                                                            initial="hidden"
                                                            whileInView="visible"
                                                            viewport={{ once: true, amount: 0.6 }}
                                                            className="mt-3 md:mt-4 text-subtle text-base md:text-lg"
                                                            style={wc}
                                                        >
                                                            {f.body}
                                                        </m.p>
                                                    </div>
                                                </div>

                                                <div className="w-full lg:w-1/2">
                                                    <div className="relative rounded-2xl border border-app overflow-hidden bg-card/60">
                                                        <div className="aspect-video">
                                                            <img
                                                                src={f.img}
                                                                alt={f.alt}
                                                                className="h-full w-full object-cover"
                                                                loading="lazy"
                                                                decoding="async"
                                                                fetchPriority="low"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Founder Story */}
                        <section className="px-4">
                            <div className="mx-auto max-w-4xl rounded-2xl border border-app bg-card/60 p-6 md:p-8">
                                <m.h2
                                    variants={textFadeUp}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.6 }}
                                    className="text-2xl md:text-3xl font-bold"
                                    style={wc}
                                >
                                    Why I started Inkmity
                                </m.h2>
                                <m.p
                                    variants={textFadeUp}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.6 }}
                                    className="mt-3 md:mt-4 text-subtle text-base md:text-lg leading-relaxed"
                                    style={wc}
                                >
                                    I’ve been that person trying to explain a tattoo idea over DMs, screenshots, and half-remembered references—and I’ve watched artists spend hours clarifying basics before they can even quote. After studying computer science, working hands-on in a small business, graduating from a coding bootcamp, and building products for others, I wanted to create something practical that helps both sides. Inkmity is my answer: a community-built space where context comes first—clear briefs, verified reviews, real availability, and messaging that keeps everything in one place. It’s built for artists to thrive without nickel-and-diming, and for clients to book confidently without the chaos.
                                </m.p>
                            </div>
                        </section>

                        <section className="px-4 pb-20">
                            <div className="mx-auto max-w-7xl rounded-2xl border border-app bg-card/60 p-8 text-center">
                                <m.h2
                                    variants={textFadeUp}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.6 }}
                                    className="text-2xl md:text-3xl font-bold"
                                    style={wc}
                                >
                                    Ready to make booking painless?
                                </m.h2>
                                <m.p
                                    variants={textFadeUp}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.6 }}
                                    className="mt-2 text-subtle"
                                    style={wc}
                                >
                                    Join Inkmity today—message in real time, search faster, and build trust with verified reviews.
                                </m.p>
                                <div className="mt-6">
                                    <Link to="/signup">
                                        <Button className="rounded-lg px-6 py-3 border-2 border-black dark:border-white hover:border-black/80 dark:hover:border-white/80">
                                            Create your account
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </section>
                    </main>

                    <footer className="px-4 pb-6">
                        <div className="mx-auto max-w-7xl text-center text-sm text-subtle">
                            © {new Date().getFullYear()} Inkmity. All rights reserved.
                        </div>
                    </footer>
                </div>
            </LazyMotion>
        </MotionConfig>
    );
};

export default Landing;