import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function LaunchHero() {
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [cueVisible, setCueVisible] = useState(false);

  const nextLaunchEnd = () => {
    const now = new Date();
    let year = now.getFullYear();
    let target = new Date(year, 10, 7, 23, 59, 59, 999); 
    if (now > target) {
      year += 1;
      target = new Date(year, 10, 7, 23, 59, 59, 999);
    }
    return target.getTime();
  };

  useEffect(() => {
    const target = nextLaunchEnd();
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

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

  const Seg = ({ value, label }) => (
    <div className="flex items-end gap-1 rounded-lg bg-white/8 backdrop-blur px-2.5 py-2 border border-white/15 md:rounded-xl md:px-3 md:py-2">
      <span className="text-lg md:text-2xl font-extrabold [font-variant-numeric:tabular-nums] tracking-tight">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[11px] md:text-sm text-white/70">{label}</span>
    </div>
  );

  return (
    <section className="container mx-auto max-w-5xl px-4">
      <div className="mx-auto rounded-3xl p-6 sm:p-8 md:p-12 text-center">
        <a href="/" aria-label="Inkmity home" className="mx-auto block w-fit">
          <img
            src="/logo.png"
            alt="Inkmity"
            className="h-[120px] w-[120px] md:h-[144px] md:w-[144px] lg:h-[168px] lg:w-[168px] object-contain"
          />
        </a>

        <motion.h1
          custom={0}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mt-6 text-[clamp(2.25rem,6vw,5rem)] leading-[0.95] font-black tracking-tight"
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
          className="mt-4 text-sm md:text-base text-white/75 tracking-tight"
        >
          Launching <span className="font-semibold text-white">November 7</span>
        </motion.p>

        <motion.div
          custom={2}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mx-auto w-full max-w-[8rem] sm:max-w-md md:max-w-lg mt-6 flex items-center justify-center gap-1 sm:gap-3"
        >
          <Seg value={countdown.days} label="days" />
          <span className="opacity-60">:</span>
          <Seg value={countdown.hours} label="hrs" />
          <span className="opacity-60">:</span>
          <Seg value={countdown.minutes} label="min" />
          <span className="opacity-60">:</span>
          <Seg value={countdown.seconds} label="sec" />
        </motion.div>

        <motion.p
          custom={3}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mx-auto mt-8 max-w-3xl text-balance text-lg sm:text-xl md:text-2xl font-semibold text-white/95"
        >
          One hub to discover artists, keep every message and reference in one
          place, and book with zero guesswork on price or availability.
        </motion.p>

        <motion.div
          custom={4}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mx-auto mt-6 grid w-full max-w-3xl grid-cols-1 sm:grid-cols-3 gap-3 text-left"
        >
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <div className="text-sm font-semibold text-white/90">
              Search that understands style
            </div>
            <p className="mt-1 text-xs text-white/70">
              Filter by technique, healed results, budget, and travel radius.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <div className="text-sm font-semibold text-white/90">
              Chat with context
            </div>
            <p className="mt-1 text-xs text-white/70">
              Share references, approve sketches, and lock details without
              losing threads.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <div className="text-sm font-semibold text-white/90">
              Clear pricing and rewards
            </div>
            <p className="mt-1 text-xs text-white/70">
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
          className="mt-10 text-2xl sm:text-3xl md:text-4xl font-extrabold"
        >
          Built to spotlight artists
        </motion.h2>

        <motion.p
          custom={6}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mt-3 text-base sm:text-lg md:text-2xl text-white/90 font-semibold"
        >
          Portfolios that load fast, metrics that matter, and tools that turn
          interest into bookings.
        </motion.p>

        <motion.div
          custom={7}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mt-6 inline-flex flex-wrap items-center justify-center gap-2"
        >
          {[
            "Earn as you book",
            "Keep context with your artist",
            "Transparent pricing",
          ].map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs md:text-sm text-white/90"
            >
              {t}
            </span>
          ))}
        </motion.div>

        <div
          className={[
            "mt-9 flex flex-col items-center gap-2 select-none transition-all duration-500",
            cueVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 pointer-events-none",
          ].join(" ")}
          aria-hidden={!cueVisible}
        >
          <span className="text-white/80 text-sm md:text-base font-medium tracking-tight">
            Scroll to learn more
          </span>
          <svg
            className="h-6 w-6 md:h-7 md:w-7 text-white/80 animate-bounce"
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