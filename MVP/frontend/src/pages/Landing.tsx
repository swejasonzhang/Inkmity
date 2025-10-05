import React from "react";
import { Link } from "react-router-dom";
import Header from "@/components/dashboard/Header";
import { Button } from "@/components/ui/button";

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
                    <div className="mx-auto max-w-7xl pt-20 pb-16 text-center">
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
                            Find the right tattoo artist—<span className="text-subtle">without the chaos</span>.
                        </h1>
                        <p className="mt-4 text-base md:text-lg text-subtle max-w-2xl mx-auto">
                            Inkmity is a community-built platform with real people and real reviews—helping clients clearly
                            communicate ideas and helping artists book with context. Start aligned and keep it stress-free.
                        </p>

                        <div className="mt-8 flex items-center justify-center gap-3">
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
                        </div>

                        <p className="mt-3 text-sm text-subtle">Free for artists • Clients pay a small booking fee</p>
                    </div>
                </section>

                <section className="px-4">
                    <div className="mx-auto max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-16">
                        <div className="rounded-2xl border border-app bg-elevated p-6">
                            <h3 className="text-xl font-semibold">Real-time messaging</h3>
                            <p className="mt-2 text-subtle">
                                Chat instantly with artists and clients. Share references, clarify details, and keep everything in one
                                thread.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-app bg-elevated p-6">
                            <h3 className="text-xl font-semibold">Rewards for artists & clients</h3>
                            <p className="mt-2 text-subtle">
                                Earn perks as bookings grow—priority placement, profile boosts, and community recognition for
                                artists. Clients unlock discounts, early access to flash deals, and other members-only perks.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-app bg-elevated p-6">
                            <h3 className="text-xl font-semibold">Free for artists</h3>
                            <p className="mt-2 text-subtle">
                                Artists pay nothing to join or get booked. Clients cover a small booking fee to keep the lights on.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-app bg-elevated p-6">
                            <h3 className="text-xl font-semibold">Fast, powerful filters</h3>
                            <p className="mt-2 text-subtle">
                                Find the right fit fast—filter by style, location, budget, availability, and healed portfolio quality.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-app bg-elevated p-6">
                            <h3 className="text-xl font-semibold">Community-built</h3>
                            <p className="mt-2 text-subtle">
                                Shaped by artists and clients who use it. Share ideas, vote on features, and help set the roadmap.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-app bg-elevated p-6">
                            <h3 className="text-xl font-semibold">Reviews that matter</h3>
                            <p className="mt-2 text-subtle">
                                Ratings from verified clients only—no spam, no bots—so reputations reflect real studio experiences.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="px-4 pb-20">
                    <div className="mx-auto max-w-7xl rounded-2xl border border-app bg-card/60 backdrop-blur p-8 text-center">
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
                    </div>
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