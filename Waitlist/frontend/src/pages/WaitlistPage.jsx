"use client";
import { useMemo, useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import FeatureShowcase from "../components/FeatureShowcase";
import WaitlistForm from "../components/WaitlistForm";
import BackgroundVideo from "../components/BackgroundVideo";
import LaunchHero from "../components/LaunchHero";

const fade = {
  hidden: { opacity: 0, y: 8, scale: 0.995 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.28 + i * 0.05, ease: [0.22, 1, 0.36, 1] },
  }),
};

function ConfettiBurst({ fire }) {
  const prefersReduced = useReducedMotion();
  const pieces = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 16; i++) {
      const fromLeft = i % 2 === 0;
      const y = Math.random() * 100;
      const delay = 0.006 * i;
      const rotate = (Math.random() - 0.5) * 120;
      const scale = 0.6 + Math.random() * 0.9;
      arr.push({ fromLeft, y, delay, rotate, scale, id: i });
    }
    return arr;
  }, []);
  if (!fire || prefersReduced) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{
            x: p.fromLeft ? "-12%" : "12%",
            y: `${p.y}%`,
            opacity: 0,
            rotate: p.rotate,
            scale: p.scale,
          }}
          animate={{
            x: "0%",
            opacity: 1,
            rotate: p.rotate * 1.3,
            scale: p.scale * 0.9,
          }}
          transition={{ duration: 0.28, ease: "easeOut", delay: p.delay }}
          className="absolute block h-2 w-3 rounded-[2px]"
          style={{
            left: p.fromLeft ? 0 : "auto",
            right: p.fromLeft ? "auto" : 0,
            background:
              p.id % 3 === 0
                ? "#FFFFFF"
                : p.id % 3 === 1
                ? "#FFE8CC"
                : "#E6D4BE",
          }}
        />
      ))}
    </div>
  );
}

export default function WaitlistPage() {
  const vp = { once: true, amount: 0.18, margin: "-10% 0px" };
  const [confettiKey, setConfettiKey] = useState(0);
  const [fire, setFire] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  const container = "container mx-auto w-full max-w-4xl px-4";

  function triggerConfetti() {
    setConfettiKey((k) => k + 1);
    setFire(true);
    setTimeout(() => setFire(false), 250);
  }

  useEffect(() => {
    const activate = () => setHasScrolled(true);
    const onScroll = () => {
      if (window.scrollY > 0) activate();
    };
    const onKeydown = (e) => {
      if (["Space", "ArrowDown", "PageDown"].includes(e.code)) activate();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", activate, { passive: true });
    window.addEventListener("touchstart", activate, { passive: true });
    window.addEventListener("keydown", onKeydown);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", activate);
      window.removeEventListener("touchstart", activate);
      window.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center">
      <BackgroundVideo />
      <ConfettiBurst fire={fire} key={confettiKey} />
      <div className="relative z-10 w-full">
        <main className="w-full flex flex-col items-center pt-0 pb-5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <motion.section
            variants={fade}
            initial="hidden"
            whileInView="show"
            viewport={vp}
            className="w-full flex items-center transform-gpu"
            style={{ willChange: "opacity, transform" }}
          >
            <div className={container}>
              <LaunchHero />
            </div>
          </motion.section>

          {hasScrolled && (
            <>
              <motion.section
                custom={1}
                variants={fade}
                initial="hidden"
                animate="show"
                className={`${container} transform-gpu`}
                style={{ willChange: "opacity, transform" }}
              >
                <FeatureShowcase />
              </motion.section>

              <motion.section
                custom={2}
                variants={fade}
                initial="hidden"
                animate="show"
                className={`${container} transform-gpu`}
                style={{ willChange: "opacity, transform" }}
              >
                <WaitlistForm onSuccess={triggerConfetti} />
              </motion.section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
