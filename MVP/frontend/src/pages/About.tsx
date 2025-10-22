import React from "react";
import Header from "@/components/header/Header";

const About: React.FC = () => {
    React.useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const prevHtml = html.style.overflow;
        const prevBody = body.style.overflow;
        html.style.overflow = "hidden";
        body.style.overflow = "hidden";
        return () => {
            html.style.overflow = prevHtml;
            body.style.overflow = prevBody;
        };
    }, []);

    return (
        <div className="h-dvh bg-app text-app flex flex-col overflow-hidden">
            <Header />

            <main className="relative z-10 grid place-items-center h-[100svh] px-4 py-0">
                <div className="w-full max-w-3xl mx-auto rounded-3xl border-2 border-app bg-card/90 backdrop-blur p-6 sm:p-10 text-center max-h-[80svh] overflow-y-hidden">
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Jason’s Story</h1>

                    <p className="mt-4 text-white leading-relaxed text-base sm:text-lg font-semibold">
                        I’ve always been drawn to tattoos—the way a simple line becomes a story you carry with you.
                        I love that it’s a <span className="font-extrabold">permanent expression of art</span> and a
                        visible story of who we are. Over time, friends kept asking for help: “How do I find the
                        right artist?” “What should I say?” “Why is booking so messy?” I’d see artists juggling DMs,
                        missed emails, and half-formed ideas. Both sides cared deeply, yet the process felt harder
                        than it should be.
                    </p>

                    <p className="mt-4 text-white leading-relaxed text-base sm:text-lg font-semibold">
                        Inkmity started as a personal challenge: could I build something that feels respectful to
                        artists and genuinely helpful to clients? Not another growth-hack platform, but a place
                        where communication is clear, expectations are aligned, and bookings feel calm and
                        intentional.
                    </p>

                    <p className="mt-4 text-white leading-relaxed text-base sm:text-lg font-semibold">
                        I read every message that comes in. I fix rough edges, remove distractions, and ship small
                        improvements week after week. If something feels off—or you have an idea that would make
                        Inkmity better—please tell me. Your feedback directly shapes the decisions I make.
                    </p>

                    <div className="mt-8 rounded-2xl bg-elevated border-2 border-app p-5 sm:p-6">
                        <h2 className="text-xl font-bold text-app">What guides the work</h2>
                        <ul className="mt-3 space-y-2 text-white inline-block text-left mx-auto font-semibold">
                            <li>• Clarity over noise—make it easy to find, talk, and book.</li>
                            <li>• Respect for artists’ time—fewer dead ends, better context.</li>
                            <li>• Real feedback loops—ship, listen, refine.</li>
                            <li>• Earned trust—transparent fees and thoughtful product choices.</li>
                        </ul>
                    </div>

                    <div className="mt-8 rounded-2xl bg-elevated border-2 border-app p-5 sm:p-6">
                        <h2 className="text-xl font-bold text-app">A note for you</h2>
                        <p className="mt-3 text-white leading-relaxed font-semibold">
                            If Inkmity helps you find the right artist—or helps your clients communicate better—that’s the win.
                            Thanks for being here and for helping shape where this goes next.
                        </p>
                    </div>
                </div>
            </main>

            <video
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                className={[
                    "fixed top-0 left-1/2 -translate-x-1/2 z-[999]",
                    "w-auto max-w-none",
                    "h-[100svh]",
                    "md:inset-0 md:left-0 md:translate-x-0 md:w-full md:h-full",
                    "object-contain md:object-cover",
                    "pointer-events-none opacity-20 mix-blend-screen",
                ].join(" ")}
                aria-hidden
            >
                <source src="/Landing.mp4" type="video/mp4" />
            </video>
        </div>
    );
};

export default About;