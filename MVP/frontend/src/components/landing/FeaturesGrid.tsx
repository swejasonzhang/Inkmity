import React from "react";
import { m } from "framer-motion";

export type Feature = {
    title: string;
    body: string;
    img: string;
    alt: string;
};

const features: Feature[] = [
    {
        title: "Real-time messaging",
        body: "Chat instantly with artists and clients. Share references, clarify details, and keep everything in one thread.",
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
        body: "Artists pay nothing to join or get booked. Clients cover a small booking fee to keep the lights on.",
        img: "/images/features/free-for-artists.jpg",
        alt: "Artist dashboard showing free signup",
    },
    {
        title: "Fast, powerful filters",
        body: "Find the right fit fast—filter by style, location, budget, availability, and healed portfolio quality.",
        img: "/images/features/filters.jpg",
        alt: "Search filters UI for finding artists quickly",
    },
    {
        title: "Community-built",
        body: "Shaped by artists and clients who use it. Share ideas, vote on features, and help set the roadmap.",
        img: "/images/features/community.jpg",
        alt: "Community forum and voting interface",
    },
    {
        title: "Reviews that matter",
        body: "Ratings from verified clients only—no spam, no bots—so reputations reflect real studio experiences.",
        img: "/images/features/reviews.jpg",
        alt: "Verified review cards from real clients",
    },
];

const FeaturesGrid: React.FC<{ textFadeUp: any; wc?: React.CSSProperties }> = ({ textFadeUp, wc }) => {
    return (
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
                                    <div className="rounded-2xl border border-app bg-elevated/70 p-6 md:p-8 min-h-[330px] md:min-h-[330px]">
                                        <m.h3
                                            variants={textFadeUp}
                                            initial="hidden"
                                            whileInView="visible"
                                            viewport={{ once: true, amount: 0.6 }}
                                            className="text-2xl md:text-3xl font-semibold leading-tight flex justify-center align-middle"
                                            style={wc}
                                        >
                                            {f.title}
                                        </m.h3>
                                        <m.p
                                            variants={textFadeUp}
                                            initial="hidden"
                                            whileInView="visible"
                                            viewport={{ once: true, amount: 0.6 }}
                                            className="mt-7 md:mt-4 text-subtle text-base md:text-lg flex justify-center text-center"
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
    );
};

export default FeaturesGrid;