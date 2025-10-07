import React from "react";
import { m, type Variants, type Transition, useReducedMotion } from "framer-motion";

export type Feature = {
    title: string;
    body: string;
    img: string;
    alt: string;
    tags: string[];
};

const features: Feature[] = [
    {
        title: "Real-time messaging",
        body:
            "Chat instantly with artists and clients. Share references, clarify details, and keep everything in one thread.",
        img: "/images/features/messaging.jpg",
        alt: "In-app real-time chat between client and artist",
        tags: ["Instant chat", "Share refs", "Keep context"],
    },
    {
        title: "Rewards for artists & clients",
        body:
            "Earn perks as bookings grow—priority placement, profile boosts, and community recognition for artists. Clients unlock discounts, early access to flash deals, and other members-only perks.",
        img: "/images/features/rewards.jpg",
        alt: "Badges and rewards showcasing user perks",
        tags: ["Loyalty", "Flash deals", "Profile boosts"],
    },
    {
        title: "Free for artists",
        body:
            "Artists pay nothing to join or get booked. Clients cover a small booking fee to keep the lights on.",
        img: "/images/features/free-for-artists.jpg",
        alt: "Artist dashboard showing free signup",
        tags: ["No signup fees", "Client-backed", "Fair model"],
    },
    {
        title: "Fast, powerful filters",
        body:
            "Find the right fit fast—filter by style, location, budget, availability, and healed portfolio quality.",
        img: "/images/features/filters.jpg",
        alt: "Search filters UI for finding artists quickly",
        tags: ["Style & budget", "Availability", "Healed work"],
    },
    {
        title: "Community-built",
        body:
            "Shaped by artists and clients who use it. Share ideas, vote on features, and help set the roadmap.",
        img: "/images/features/community.jpg",
        alt: "Community forum and voting interface",
        tags: ["Roadmap votes", "Artist & client input", "Open feedback"],
    },
    {
        title: "Reviews that matter",
        body:
            "Ratings from verified clients only—no spam, no bots—so reputations reflect real studio experiences.",
        img: "/images/features/reviews.jpg",
        alt: "Verified review cards from real clients",
        tags: ["Verified only", "Spam-free", "Trustworthy"],
    },
];

const TWEEN: Transition = { type: "tween", duration: 0.5, ease: [0.16, 1, 0.3, 1] };
const TWEEN_SLOW: Transition = { type: "tween", duration: 0.6, ease: [0.16, 1, 0.3, 1] };

const card: Variants = {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0, transition: { ...TWEEN } },
};

const innerStagger: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.04, when: "beforeChildren" } },
};

const item: Variants = {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0, transition: { ...TWEEN } },
};

const media: Variants = {
    hidden: { opacity: 0, y: 4 },
    show: { opacity: 1, y: 0, transition: { ...TWEEN_SLOW } },
};

const tagsWrap: Variants = {
    hidden: {},
    show: (delaySeed: number = 0) => ({
        transition: { staggerChildren: 0.035, delayChildren: 0.06 + delaySeed * 0.01 },
    }),
};

const tagItem: Variants = {
    hidden: { opacity: 0, y: 4 },
    show: { opacity: 1, y: 0, transition: { ...TWEEN } },
};

const FeaturesGrid: React.FC<{ textFadeUp: any; wc?: React.CSSProperties }> = ({ textFadeUp, wc }) => {
    const prefersReduced = useReducedMotion();
    const vp = { once: true, amount: 0.2, margin: "0px 0px -15% 0px" } as const;

    return (
        <section className="px-4 grid place-items-center">
            <div className="mx-auto max-w-7xl w-full text-center mb-8 md:mb-12">
                <m.h2
                    variants={textFadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.5 }}
                    id="features"
                    className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight 
                     text-transparent bg-clip-text 
                     bg-[linear-gradient(90deg,var(--fg)_0%,var(--fg)_50%,rgba(255,255,255,0.8)_100%)]"
                    style={wc}
                >
                    Features
                </m.h2>

                <div className="mx-auto mt-4 h-px w-48 md:w-64 lg:w-80 bg-gradient-to-r from-transparent via-[color:var(--border)] to-transparent" />
            </div>

            <div className="relative mx-auto w-full max-w-7xl rounded-3xl bg-card/60 backdrop-blur overflow-hidden">
                <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-40 opacity-[0.12] blur-3xl"
                    style={{
                        background:
                            "radial-gradient(60% 50% at 50% 50%, rgba(255,255,255,.65) 0%, rgba(255,255,255,0) 70%)",
                    }}
                />

                <m.div className="relative">
                    {features.map((f, i) => {
                        const reverse = i % 2 === 1;

                        return (
                            <m.article
                                key={f.title}
                                variants={card}
                                initial="hidden"
                                whileInView="show"
                                viewport={vp}
                                className={[
                                    "relative p-6 md:p-10",
                                    "border-b last:border-b-0 border-app/50",
                                    i % 2 === 0 ? "bg-elevated/20" : "bg-transparent",
                                    "transform-gpu will-change-[transform,opacity]",
                                ].join(" ")}
                                style={prefersReduced ? { transform: "none" } : undefined}
                            >
                                <span
                                    aria-hidden
                                    className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--border)]/60 to-transparent"
                                />

                                <m.div
                                    variants={innerStagger}
                                    initial="hidden"
                                    whileInView="show"
                                    viewport={vp}
                                    className={[
                                        "group relative grid items-center gap-8 md:gap-10",
                                        "lg:grid-cols-2",
                                        reverse ? "lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1" : "",
                                    ].join(" ")}
                                >
                                    <div className="w-full flex items-center justify-center">
                                        <m.div
                                            variants={item}
                                            className="rounded-2xl p-[1px] bg-[linear-gradient(135deg,rgba(255,255,255,.25),rgba(255,255,255,0)_40%),linear-gradient(315deg,rgba(255,255,255,.18),rgba(255,255,255,0)_40%)] transform-gpu will-change-[transform,opacity]"
                                        >
                                            <div className="rounded-2xl border border-app bg-elevated/70 px-6 py-7 md:px-8 md:py-10 min-h-[320px] flex flex-col items-center justify-center text-center">
                                                <div className="mb-3 inline-flex items-center gap-2">
                                                    <span className="rounded-full border border-app bg-elevated/70 px-2.5 py-0.5 text-[11px] text-subtle">
                                                        Feature
                                                    </span>
                                                    <span className="rounded-full border border-app bg-elevated/70 px-2.5 py-0.5 text-[11px] text-subtle">
                                                        {String(i + 1).padStart(2, "0")}
                                                    </span>
                                                </div>

                                                <m.h3
                                                    variants={item}
                                                    className="text-2xl md:text-3xl font-semibold leading-tight bg-clip-text text-transparent bg-[linear-gradient(180deg,var(--fg),rgba(255,255,255,0.75))]"
                                                    style={wc}
                                                >
                                                    {f.title}
                                                </m.h3>

                                                <m.p
                                                    variants={item}
                                                    className="mt-5 md:mt-4 text-subtle text-base md:text-lg mx-auto max-w-prose"
                                                    style={wc}
                                                >
                                                    {f.body}
                                                </m.p>

                                                <m.div
                                                    variants={tagsWrap}
                                                    initial="hidden"
                                                    whileInView="show"
                                                    viewport={vp}
                                                    custom={i}
                                                    className="mt-6 flex flex-wrap items-center justify-center gap-3"
                                                >
                                                    {f.tags.map((tag) => (
                                                        <m.span
                                                            key={tag}
                                                            variants={tagItem}
                                                            className="rounded-full border border-app bg-elevated/70 px-3.5 py-1.5 text-sm md:text-base font-medium text-subtle transform-gpu will-change-[transform,opacity]"
                                                        >
                                                            {tag}
                                                        </m.span>
                                                    ))}
                                                </m.div>
                                            </div>
                                        </m.div>
                                    </div>

                                    <div className="w-full flex items-center justify-center">
                                        <m.div
                                            variants={media}
                                            initial="hidden"
                                            whileInView="show"
                                            viewport={vp}
                                            className="w-full max-w-3xl transform-gpu will-change-[transform,opacity]"
                                        >
                                            <div className="relative rounded-2xl overflow-hidden">
                                                <div className="absolute -inset-[1px] rounded-2xl bg-[conic-gradient(from_140deg,rgba(255,255,255,.24),rgba(255,255,255,.06),rgba(255,255,255,.24))] opacity-60" />
                                                <div className="relative rounded-2xl border border-app bg-card/60 shadow-sm transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.015]">
                                                    <div className="aspect-video">
                                                        <img
                                                            src={f.img}
                                                            alt={f.alt}
                                                            className="h-full w-full object-cover object-center will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                                                            loading="lazy"
                                                            decoding="async"
                                                            fetchPriority="low"
                                                        />
                                                    </div>
                                                    <span className="pointer-events-none absolute left-3 top-3 h-6 w-6 rounded-md border border-app/70" />
                                                    <span className="pointer-events-none absolute right-3 bottom-3 h-6 w-6 rounded-md border border-app/70" />
                                                    <div
                                                        aria-hidden
                                                        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[rgba(0,0,0,.18)] to-transparent"
                                                    />
                                                </div>
                                            </div>
                                        </m.div>
                                    </div>
                                </m.div>
                            </m.article>
                        );
                    })}
                </m.div>
            </div>
        </section>
    );
};

export default FeaturesGrid;