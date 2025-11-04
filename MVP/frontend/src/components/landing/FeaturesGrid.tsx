import React from "react";
import {
    LazyMotion,
    domAnimation,
    MotionConfig,
    useReducedMotion,
    m,
    type Variants,
    type Transition,
} from "framer-motion";

export type Feature = {
    title: string;
    body: string;
    tags: string[];
};

const features: Feature[] = [
    { title: "Conversations that actually move", body: "No scattered DMs or buried emails. One clear thread holds ideas, references, and decisions so momentum never stalls. It feels like gliding instead of herding apps.", tags: ["One thread", "Share refs", "Stay aligned"] },
    { title: "Booking without the back-and-forth", body: "Pick a time, confirm details, reschedule without fuss. Calendars line up and expectations stay obvious. Effort shifts to the art, not logistics.", tags: ["Time picks", "Fast confirm", "Easy changes"] },
    { title: "Money talk that feels simple", body: "Deposits are handled, balances are clear, checkout is smooth. Everyone knows what’s next, so the only surprise is how easy it all felt.", tags: ["Clear deposits", "Transparent", "Smooth pay"] },
    { title: "Find your person in minutes", body: "Describe your vibe and budget. The right artists surface with the work that matches. It feels less like searching and more like recognition.", tags: ["Style fit", "Budget fit", "Right away"] },
    { title: "Reviews that read like real stories", body: "Only people who actually sat in the chair can review, so feedback sounds human and helpful. Confidence comes before you step inside the studio.", tags: ["Real sessions", "Signal only", "Confidence"] },
    { title: "Momentum that builds", body: "Clear chats, clear expectations, on-time appointments. Each step nudges the next. The platform fades while your project comes into focus.", tags: ["Flow", "Clarity", "Progress"] },
];

const TWEEN: Transition = { type: "tween", duration: 0.45, ease: [0.22, 1, 0.36, 1] };
const card: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: TWEEN }, hover: { y: -3, scale: 1.01, transition: { duration: 0.25 } }, tap: { scale: 0.995 } };
const shine: Variants = { rest: { x: "-130%" }, hover: { x: "130%", transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } } };
const tagsWrap: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const tagItem: Variants = { hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: TWEEN } };

const normalize3 = (tags: string[]) => {
    const base = (tags || []).map((t) => String(t).trim()).filter(Boolean);
    const t = base.slice(0, 3);
    const fillers = ["Simple", "Fast", "Clear"];
    while (t.length < 3) t.push(fillers[(t.length - base.length + 3) % 3]);
    return t;
};

const FeaturesGrid: React.FC<{ textFadeUp: any; wc?: React.CSSProperties }> = ({ textFadeUp, wc }) => {
    const prefersReduced = useReducedMotion();
    const vp = { once: true, amount: 0.18 } as const;

    return (
        <section className="px-1 sm:px-3 grid place-items-center">
            <div className="mx-auto w-full max-w-[100rem] text-center mb-4 sm:mb-6 md:mb-12">
                <m.h2
                    variants={textFadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.5 }}
                    id="features"
                    className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight text-transparent bg-clip-text bg-[linear-gradient(90deg,var(--fg)_0%,var(--fg)_55%,white_100%)]"
                    style={wc}
                >
                    Features
                </m.h2>
                <div className="mx-auto mt-2 sm:mt-3 md:mt-4 h-px w-32 sm:w-40 md:w-64 lg:w-80 bg-gradient-to-r from-transparent via-[color:var(--border)] to-transparent" />
            </div>

            <div className="relative mx-auto w-full max-w-[100rem]">
                <div aria-hidden className="pointer-events-none absolute -inset-40 opacity-[0.06] blur-3xl" style={{ background: "radial-gradient(60% 50% at 50% 50%, rgba(255,255,255,.6) 0%, rgba(255,255,255,0) 70%)" }} />
                <LazyMotion features={domAnimation} strict>
                    <MotionConfig reducedMotion={prefersReduced ? "always" : "never"}>
                        <m.div role="list" className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-3 md:gap-6">
                            {features.map((f) => (
                                <m.article
                                    key={f.title}
                                    role="listitem"
                                    variants={card}
                                    initial="hidden"
                                    whileInView="show"
                                    viewport={vp}
                                    whileHover={prefersReduced ? undefined : "hover"}
                                    whileTap={prefersReduced ? undefined : "tap"}
                                    className="relative"
                                >
                                    <div className="relative rounded-xl p-[1px] overflow-hidden">
                                        <m.div initial="rest" animate="rest" whileHover="hover" className="pointer-events-none absolute inset-0">
                                            <m.div variants={shine} className="absolute top-0 bottom-0 w-1/2 -skew-x-12 opacity-20" style={{ background: "linear-gradient(90deg, transparent 0%, white 35%, transparent 70%)" }} />
                                        </m.div>
                                        <div className="absolute inset-0 rounded-xl opacity-90" style={{ background: "conic-gradient(from 140deg at 50% 50%, rgba(255,255,255,.2), rgba(255,255,255,.08), rgba(255,255,255,.2))" }} aria-hidden />
                                        <div className="relative rounded-xl bg-card">
                                            <div className="flex flex-col items-center justify-center text-center px-3 sm:px-5 md:px-8 py-4 sm:py-6 md:py-8 min-h-[340px] sm:min-h-[400px] md:h-[460px] lg:h-[500px]">
                                                <m.h3 variants={card} className="text-sm sm:text-lg md:text-2xl font-bold tracking-tight text-[color:var(--fg)]" style={wc}>
                                                    {f.title}
                                                </m.h3>
                                                <m.p variants={card} className="mt-2 sm:mt-3 text-[color:var(--fg)]/92 text-xs sm:text-sm md:text-lg leading-relaxed mx-auto max-w-[66ch]">
                                                    {f.body}
                                                </m.p>
                                                <m.div variants={tagsWrap} initial="hidden" whileInView="show" viewport={vp} className="mt-3 sm:mt-4 md:mt-6 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 md:gap-3.5">
                                                    {normalize3(f.tags).map((tag) => (
                                                        <m.span key={tag} variants={tagItem} className="rounded-full bg-elevated px-2.5 py-1 sm:px-3.5 sm:py-1.5 text-[10px] sm:text-xs md:text-sm font-semibold tracking-tight text-[color:var(--fg)]">
                                                            {tag}
                                                        </m.span>
                                                    ))}
                                                </m.div>
                                            </div>
                                        </div>
                                    </div>
                                </m.article>
                            ))}
                        </m.div>
                    </MotionConfig>
                </LazyMotion>
            </div>
        </section>
    );
};

export default FeaturesGrid;