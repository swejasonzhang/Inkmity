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
                            Inkmity helps clients clearly communicate ideas and helps artists book
                            with context—so projects start aligned and stay stress-free.
                        </p>

                        <div className="mt-8 flex items-center justify-center gap-3">
                            <Link to="/signup">
                                <Button className="bg-white text-black hover:opacity-90 rounded-lg px-6 py-3">
                                    Get started — it’s free
                                </Button>
                            </Link>
                            <Link to="/login">
                                <Button variant="outline" className="border border-white/60 text-app hover:bg-white/10 rounded-lg px-6 py-3">
                                    I already have an account
                                </Button>
                            </Link>
                        </div>

                        <p className="mt-3 text-sm text-subtle">
                            No credit card required • Cancel anytime
                        </p>
                    </div>
                </section>

                <section className="px-4">
                    <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pb-16">
                        <div className="rounded-2xl border border-app bg-elevated p-6">
                            <h3 className="text-xl font-semibold">Clear requests</h3>
                            <p className="mt-2 text-subtle">
                                Smart forms that gather references, placement, size, and style—so artists have what they need up front.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-app bg-elevated p-6">
                            <h3 className="text-xl font-semibold">Artist-friendly inbox</h3>
                            <p className="mt-2 text-subtle">
                                Cut through DMs with structured messages, quick replies, and less back-and-forth.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-app bg-elevated p-6">
                            <h3 className="text-xl font-semibold">Calm bookings</h3>
                            <p className="mt-2 text-subtle">
                                Set expectations early. Fewer surprises, smoother sessions, happier clients.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="px-4 pb-20">
                    <div className="mx-auto max-w-7xl rounded-2xl border border-app bg-card/60 backdrop-blur p-8 text-center">
                        <h2 className="text-2xl md:text-3xl font-bold">Ready to make booking painless?</h2>
                        <p className="mt-2 text-subtle">Join Inkmity today and start with a cleaner process.</p>
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