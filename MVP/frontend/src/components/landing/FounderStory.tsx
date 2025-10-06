import React from "react";
import { m } from "framer-motion";

const FounderStory: React.FC<{ textFadeUp: any; wc?: React.CSSProperties }> = ({ textFadeUp, wc }) => {
    return (
        <section className="px-4 grid place-items-center">
            <div className="mx-auto max-w-4xl w-full rounded-2xl border border-app bg-card/60 p-6 md:p-8 text-center">
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
                    className="mt-3 md:mt-4 text-subtle text-base md:text-lg leading-relaxed mx-auto max-w-prose"
                    style={wc}
                >
                    Finding the right artist shouldn’t feel like a part-time job—but it did. I’d spend hours scrolling
                    Instagram, DM’ing artists, waiting, following up, and still not knowing basic things like availability.
                    The back-and-forth dragged on: “Are you taking bookings?” “What’s your waitlist?” “Do you have this date?”
                    Half the time I’d finally get a reply only to realize the design was out of my budget or the timeline
                    didn’t work.
                </m.p>

                <m.p
                    variants={textFadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.6 }}
                    className="mt-4 text-subtle text-base md:text-lg leading-relaxed mx-auto max-w-prose"
                    style={wc}
                >
                    And then the platform hopping: DMs for questions, iMessage for updates, email for references, and a
                    bank app like Chase for deposits. Threads got lost. Context went missing. I felt like I was managing a
                    project plan just to get a simple booking.
                </m.p>

                <m.p
                    variants={textFadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.6 }}
                    className="mt-4 text-subtle text-base md:text-lg leading-relaxed mx-auto max-w-prose"
                    style={wc}
                >
                    Inkmity is my fix: one place with real availability, clear pricing, verified reviews, and messaging that
                    keeps everything together—from first idea to deposit to appointment. It’s built so clients don’t waste
                    hours chasing answers, and artists don’t have to juggle five apps to do one job.
                </m.p>
            </div>
        </section>
    );
};

export default FounderStory;