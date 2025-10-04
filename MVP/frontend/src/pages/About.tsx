import React from "react";
import Header from "@/components/dashboard/Header";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const About: React.FC = () => {
    return (
        <div className="min-h-dvh bg-gray-900 text-white flex flex-col">
            <Header />

            <main className="flex-1 px-4 py-6 sm:py-10 grid place-items-center">
                <div className="w-full max-w-3xl min-h-[80dvh] rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 sm:p-10">
                    <h1 className="text-center text-3xl sm:text-4xl font-extrabold tracking-tight">
                        Jason’s Story
                    </h1>

                    <p className="mt-4 text-white/80 leading-relaxed text-base sm:text-lg">
                        I’ve always been drawn to tattoos—the way a simple line becomes a story you carry with you.
                        I love that it’s a <span className="font-semibold">permanent expression of art</span> and a
                        visible story of who we are. Over time, friends kept asking for help: “How do I find the
                        right artist?” “What should I say?” “Why is booking so messy?” I’d see artists juggling DMs,
                        missed emails, and half-formed ideas. Both sides cared deeply, yet the process felt harder
                        than it should be.
                    </p>

                    <p className="mt-4 text-white/80 leading-relaxed text-base sm:text-lg">
                        Inkmity started as a personal challenge: could I build something that feels respectful to
                        artists and genuinely helpful to clients? Not another growth-hack platform, but a place
                        where communication is clear, expectations are aligned, and bookings feel calm and
                        intentional.
                    </p>

                    <p className="mt-4 text-white/80 leading-relaxed text-base sm:text-lg">
                        I read every message that comes in. I fix rough edges, remove distractions, and ship small
                        improvements week after week. If something feels off—or you have an idea that would make
                        Inkmity better—please tell me. Your feedback directly shapes the decisions I make.
                    </p>

                    <div className="mt-8 rounded-xl bg-white/5 border border-white/10 p-5 sm:p-6">
                        <h2 className="text-xl font-semibold text-white">What guides the work</h2>
                        <ul className="mt-3 space-y-2 text-white/80">
                            <li>• Clarity over noise—make it easy to find, talk, and book.</li>
                            <li>• Respect for artists’ time—fewer dead ends, better context.</li>
                            <li>• Real feedback loops—ship, listen, refine.</li>
                            <li>• Earned trust—transparent fees and thoughtful product choices.</li>
                        </ul>
                    </div>

                    <div className="mt-8 rounded-xl bg-white/5 border border-white/10 p-5 sm:p-6">
                        <h2 className="text-xl font-semibold text-white">A note for you</h2>
                        <p className="mt-3 text-white/80 leading-relaxed">
                            If Inkmity helps you find the right artist—or helps your clients communicate better—that’s the win.
                            Thanks for being here and for helping shape where this goes next.
                        </p>
                    </div>

                    <div className="mt-8 text-center">
                        <Link to="/contact">
                            <Button className="bg-white/15 hover:bg-white/25 text-white border border-white/20">
                                Share feedback with Jason
                            </Button>
                        </Link>
                        <p className="mt-3 text-sm text-white/60">
                            Or email: <a className="underline" href="mailto:jason@inkmity.com">jason@inkmity.com</a>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default About;