import React from "react";
import { Link } from "react-router-dom";
import Header from "@/components/dashboard/Header";
import { Button } from "@/components/ui/button";
import { motion, type Variants, type Transition } from "framer-motion";

const SPRING: Transition = { type: "spring", stiffness: 120, damping: 22, mass: 0.9 };

const heroParent: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            ...SPRING,
            delayChildren: 0.15,
            staggerChildren: 0.12,
        },
    },
};

const heroChild: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: SPRING,
    },
};

const featureCard: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { ...SPRING, delay: 0.04 },
    },
};

const featureText: Variants = {
    hidden: { opacity: 0, y: 14 },
    visible: {
        opacity: 1,
        y: 0,
        transition: SPRING,
    },
};

const featureImage: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { ...SPRING, stiffness: 100, damping: 24 },
    },
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

const Landing: React.FC = () => {
    return (
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
                    <motion.div
                        className="mx-auto max-w-7xl pt-20 pb-16 text-center"
                        variants={heroParent}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.5, margin: "-10% 0px" }}
                        style={{ willChange: "transform, opacity" }}
                    >
                        <motion.h1
                            variants={heroChild}
                            className="text-4xl md:text-6xl font-extrabold tracking-tight"
                            style={{ transform: "translate3d(0,0,0)" }}
                        >
                            Find the right tattoo artist—<span className="text-subtle">without the chaos</span>.
                        </motion.h1>

                        <motion.p
                            variants={heroChild}
                            className="mt-4 text-base md:text-lg text-subtle max-w-2xl mx-auto"
                            style={{ transform: "translate3d(0,0,0)" }}
                        >
                            Inkmity is a community-built platform with real people and real reviews—helping clients clearly
                            communicate ideas and helping artists book with context. Start aligned and keep it stress-free.
                        </motion.p>

                        <motion.div variants={heroChild} className="mt-8 flex items-center justify-center gap-3">
                            <Link to="/signup">
                                <Button className="bg-white text-black hover:opacity-90 rounded-lg px-6 py-3">
                                    Get started — it’s free
                                </Button>
                            </Link>
                            <Link to="/login">
                                <Button
                                    variant="outline"
                                    className="border border-white/60 text-app hover:bg-white/10 rounded-lg px-6 py-3"
                                >
                                    I already have an account
                                </Button>
                            </Link>
                        </motion.div>

                        <motion.p variants={heroChild} className="mt-3 text-sm text-subtle">
                            Free for artists • Clients pay a small booking fee
                        </motion.p>
                    </motion.div>
                </section>

                <section className="px-4">
                    <div className="mx-auto max-w-7xl">
                        {features.map((f, i) => {
                            const reverse = i % 2 === 1;
                            return (
                                <motion.article
                                    key={f.title}
                                    className="rounded-2xl border border-app bg-elevated/60 p-6 md:p-8 mb-8 md:mb-10"
                                    variants={featureCard}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.35, margin: "-8% 0px" }}
                                    style={{ willChange: "transform, opacity", transform: "translate3d(0,0,0)" }}
                                >
                                    <div
                                        className={[
                                            "flex flex-col items-center gap-8 md:gap-10",
                                            "lg:min-h-[60vh]",
                                            reverse ? "lg:flex-row-reverse" : "lg:flex-row",
                                        ].join(" ")}
                                    >
                                        <motion.div
                                            variants={featureText}
                                            className="w-full lg:w-1/2"
                                            style={{ willChange: "transform, opacity" }}
                                        >
                                            <div className="rounded-2xl border border-app bg-elevated/70 p-6 md:p-8">
                                                <h3 className="text-2xl md:text-3xl font-semibold leading-tight">{f.title}</h3>
                                                <p className="mt-3 md:mt-4 text-subtle text-base md:text-lg">{f.body}</p>
                                            </div>
                                        </motion.div>

                                        <motion.div variants={featureImage} className="w-full lg:w-1/2" style={{ willChange: "opacity" }}>
                                            <div className="relative rounded-2xl border border-app overflow-hidden bg-card/60">
                                                <div className="aspect-video">
                                                    <img
                                                        src={f.img}
                                                        alt={f.alt}
                                                        className="h-full w-full object-cover"
                                                        loading="lazy"
                                                        decoding="async"
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>
                                </motion.article>
                            );
                        })}
                    </div>
                </section>

                <section className="px-4 pb-20">
                    <motion.div
                        className="mx-auto max-w-7xl rounded-2xl border border-app bg-card/60 p-8 text-center"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.5, margin: "-8% 0px" }}
                        transition={SPRING}
                        style={{ willChange: "transform, opacity", transform: "translate3d(0,0,0)" }}
                    >
                        <h2 className="text-2xl md:text-3xl font-bold">Ready to make booking painless?</h2>
                        <p className="mt-2 text-subtle">
                            Join Inkmity today—message in real time, search faster, and build trust with verified reviews.
                        </p>
                        <div className="mt-6">
                            <Link to="/signup">
                                <Button className="bg-white text-black hover:opacity-90 rounded-lg px-6 py-3">
                                    Create your account
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                </section>
            </main>

            <footer className="px-4 pb-6">
                <div className="mx-auto max-w-7xl text-center text-sm text-subtle">
                    © {new Date().getFullYear()} Inkmity. All rights reserved.
                </div>
            </footer>
        </div>
    );
};

export default Landing;