"use client";
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import FeatureShowcase from "../components/FeatureShowcase";
import WaitlistForm from "../components/WaitlistForm";
import BackgroundVideo from "../components/BackgroundVideo";
import LaunchHero from "../components/LaunchHero";

const fade = {
  hidden: { opacity: 0, y: 16, scale: 0.99 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35 + i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
};

function ConfettiBurst({ fire }) {
  const prefersReduced = useReducedMotion();
  const pieces = useMemo(() => {
    const arr = [];
    const n = 16;
    for (let i = 0; i < n; i++) {
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
  const vp = { once: true, amount: 0.12, margin: "200px 0px" };
  const [confettiKey, setConfettiKey] = useState(0);
  const [fire, setFire] = useState(false);

  function triggerConfetti() {
    setConfettiKey((k) => k + 1);
    setFire(true);
    setTimeout(() => setFire(false), 250);
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center">
      <BackgroundVideo />
      <ConfettiBurst fire={fire} key={confettiKey} />
      <div className="relative z-10 w-full">
        <main className="w-full flex flex-col items-center pt-4 pb-5">
          <motion.section
            variants={fade}
            initial="hidden"
            whileInView="show"
            viewport={vp}
            className="w-full min-h-screen flex items-center justify-center"
          >
            <LaunchHero />
          </motion.section>
          <motion.section
            custom={1}
            variants={fade}
            initial="hidden"
            whileInView="show"
            viewport={vp}
            className="container mx-auto w-full max-w-4xl px-4"
          >
            <FeatureShowcase />
          </motion.section>
          <motion.section
            custom={2}
            variants={fade}
            initial="hidden"
            whileInView="show"
            viewport={vp}
            className="container mx-auto w-full max-w-4xl px-4"
          >
            <WaitlistForm onSuccess={triggerConfetti} />
          </motion.section>
        </main>
      </div>
    </div>
  );
}
