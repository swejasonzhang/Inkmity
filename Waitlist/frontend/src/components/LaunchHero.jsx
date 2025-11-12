import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function LaunchHero() {
  const [cueVisible, setCueVisible] = useState(false);

  useEffect(() => {
    const LAST_INDEX = 7;
    const ITEM_DELAY = 0.12;
    const ITEM_DURATION = 0.6;
    const BUFFER = 0.25;
    const totalMs = (LAST_INDEX * ITEM_DELAY + ITEM_DURATION + BUFFER) * 1000;
    const t = setTimeout(() => setCueVisible(true), totalMs);
    return () => clearTimeout(t);
  }, []);

  const fade = {
    hidden: { opacity: 0, y: 16, scale: 0.98 },
    show: (i = 0) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  return (
    <section className="container mx-auto max-w-5xl px-3 sm:px-4 touch-pan-y">
      <div className="mx-auto rounded-2xl p-3 sm:p-8 md:p-12 text-center">
        <a href="/" aria-label="Inkmity home" className="mx-auto block w-fit">
          <img
            src="/logo.png"
            alt="Inkmity"
            className="h-[56px] w-[56px] md:h-[144px] md:w-[144px] lg:h-[168px] lg:w-[168px] object-contain"
          />
        </a>

        <motion.h1
          custom={0}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mt-2 md:mt-6 text-[clamp(1.4rem,6.5vw,2rem)] md:text-[clamp(2.25rem,6vw,5rem)] leading-[1.06] md:leading-[0.95] font-black tracking-tight"
        >
          <span className="inline-block text-white/85">About</span>{" "}
          <span className="bg-clip-text text-transparent bg-[conic-gradient(at_30%_120%,#fff,rgba(255,255,255,.6)_35%,#fff_70%)] drop-shadow-[0_1px_20px_rgba(255,255,255,0.18)]">
            Inkmity
          </span>
        </motion.h1>

        <motion.p
          custom={1}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mt-1.5 md:mt-4 text-[0.85rem] md:text-base text-white/80 tracking-tight"
        >
          Inkmity is in active development. Launch timing will be announced. We
          are focused on building a reliable, high-quality experience and will
          share updates as we progress.
        </motion.p>

        <motion.p
          custom={3}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mx-auto mt-2.5 md:mt-8 max-w-3xl text-pretty text-[0.95rem] sm:text-xl md:text-2xl font-semibold text-white/95"
        >
          One hub to discover artists, keep every message and reference in one
          place, and book with zero guesswork on price or availability.
        </motion.p>

        <motion.div
          custom={4}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mx-auto mt-4 md:mt-6 grid w-full max-w-3xl grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3"
        >
          <div className="rounded-xl border border-white/15 bg-white/5 p-2.5 sm:p-4 text-center">
            <div className="text-[13px] md:text-sm font-semibold text-white/90">
              Search that understands style
            </div>
            <p className="mt-1 text-[11px] md:text-xs text-white/70">
              Filter by technique, healed results, budget, and travel radius.
            </p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/5 p-2.5 sm:p-4 text-center">
            <div className="text-[13px] md:text-sm font-semibold text-white/90">
              Chat with context
            </div>
            <p className="mt-1 text-[11px] md:text-xs text-white/70">
              Share references, approve sketches, and lock details without
              losing threads.
            </p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/5 p-2.5 sm:p-4 text-center">
            <div className="text-[13px] md:text-sm font-semibold text-white/90">
              Clear pricing and rewards
            </div>
            <p className="mt-1 text-[11px] md:text-xs text-white/70">
              Up-front quotes, verified reviews, and perks that stack as you
              book.
            </p>
          </div>
        </motion.div>

        <motion.h2
          custom={5}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mt-6 md:mt-10 text-lg sm:text-3xl md:text-4xl font-extrabold"
        >
          Built to spotlight artists
        </motion.h2>

        <motion.p
          custom={6}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mt-1.5 md:mt-3 text-sm sm:text-lg md:text-2xl text-white/90 font-semibold"
        >
          Portfolios that load fast, metrics that matter, and tools that turn
          interest into bookings.
        </motion.p>

        <motion.div
          custom={7}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mt-3.5 md:mt-6 inline-flex flex-wrap items-center justify-center gap-1.5 md:gap-2"
        >
          {[
            "Earn as you book",
            "Keep context with your artist",
            "Transparent pricing",
          ].map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] md:text-sm text-white/90"
            >
              {t}
            </span>
          ))}
        </motion.div>

        <div
          className={[
            "mt-5 md:mt-9 flex flex-col items-center gap-1.5 md:gap-2 select-none transition-all duration-500",
            cueVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 pointer-events-none",
          ].join(" ")}
          aria-hidden={!cueVisible}
        >
          <span className="text-white/80 text-[12px] md:text-base font-medium tracking-tight">
            Scroll to learn more
          </span>
          <svg
            className="h-5 w-5 md:h-7 md:w-7 text-white/80 animate-bounce"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>
    </section>
  );
}