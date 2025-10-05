import React from "react";
import { m } from "framer-motion";

const Differentiators: React.FC<{ textFadeUp: any; wc?: React.CSSProperties }> = ({ textFadeUp, wc }) => {
    return (
        <section className="px-4 mt-2">
            <div className="mx-auto max-w-7xl rounded-2xl border border-app bg-card/60 p-6 md:p-8">
                <m.h2
                    variants={textFadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.6 }}
                    className="text-2xl md:text-3xl font-bold text-center"
                    style={wc}
                >
                    What makes Inkmity different
                </m.h2>
                <m.p
                    variants={textFadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.6 }}
                    className="mt-3 text-subtle max-w-3xl mx-auto text-center"
                    style={wc}
                >
                    We obsess over the experience—for clients and artists. Small, thoughtful touches add up: clearer briefs,
                    verified reviews, transparent pricing, and tools that keep conversations and context in one place.
                </m.p>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-app bg-elevated/70 p-5">
                        <h3 className="font-semibold text-lg">UX-first from day one</h3>
                        <p className="mt-2 text-subtle">
                            Clean flows, no clutter, and messaging that keeps context—so booking feels calm instead of chaotic.
                        </p>
                    </div>

                    <div className="rounded-xl border border-app bg-elevated/70 p-5">
                        <h3 className="font-semibold text-lg">Rewards & loyalty</h3>
                        <p className="mt-2 text-subtle">
                            Artists and clients earn perks over time. Discounts, early access to flash drops, and profile boosts for
                            consistent, high-trust activity.
                        </p>
                    </div>

                    <div className="rounded-xl border border-app bg-elevated/70 p-5">
                        <h3 className="font-semibold text-lg">Fair, momentum-based featuring</h3>
                        <p className="mt-2 text-subtle">
                            The more verified bookings an artist completes, the more likely they’ll be featured—quality and reliability
                            are rewarded.
                        </p>
                    </div>

                    <div className="rounded-xl border border-app bg-elevated/70 p-5">
                        <h3 className="font-semibold text-lg">Beginner-friendly discovery</h3>
                        <p className="mt-2 text-subtle">
                            A dedicated page for newcomers showcases artists starting at lower budgets—perfect for first tattoos and
                            building confidence.
                        </p>
                    </div>

                    <div className="rounded-xl border border-app bg-elevated/70 p-5">
                        <h3 className="font-semibold text-lg">Community-driven roadmap</h3>
                        <p className="mt-2 text-subtle">
                            Features are shaped and voted on by the community. Your ideas guide what ships next.
                        </p>
                    </div>

                    <div className="rounded-xl border border-app bg-elevated/70 p-5">
                        <h3 className="font-semibold text-lg">Trust is verified</h3>
                        <p className="mt-2 text-subtle">
                            Reviews from verified clients only—no bots, no spam—so reputations reflect real studio experiences.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Differentiators;