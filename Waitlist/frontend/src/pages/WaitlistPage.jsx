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

const vp = { once: true, amount: 0.01, margin: "0px 0px" };

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
  const [confettiKey, setConfettiKey] = useState(0);
  const [fire, setFire] = useState(false);

  const container = "container mx-auto w-full max-w-4xl px-4";

  function triggerConfetti() {
    setConfettiKey((k) => k + 1);
    setFire(true);
    setTimeout(() => setFire(false), 250);
  }

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.classList.add("overscroll-none");
    body.classList.add("overscroll-none", "overflow-x-hidden");
    return () => {
      html.classList.remove("overscroll-none");
      body.classList.remove("overscroll-none", "overflow-x-hidden");
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center">
      <BackgroundVideo />
      <ConfettiBurst fire={fire} key={confettiKey} />
      <div className="relative z-10 w-full">
        <main className="w-full flex flex-col items-center pt-0 pb-5 overflow-visible">
          <motion.section
            variants={fade}
            initial="hidden"
            whileInView="show"
            viewport={vp}
            className="w-full flex items-center transform-gpu min-h-screen"
            style={{ willChange: "opacity, transform" }}
          >
            <div className={container}>
              <LaunchHero />
            </div>
          </motion.section>

          <motion.section
            custom={1}
            variants={fade}
            initial="hidden"
            whileInView="show"
            viewport={vp}
            className={`${container} transform-gpu`}
            style={{ willChange: "opacity, transform" }}
          >
            <FeatureShowcase />
          </motion.section>

          <motion.section
            custom={2}
            variants={fade}
            initial="hidden"
            whileInView="show"
            viewport={vp}
            className={`${container} transform-gpu`}
            style={{ willChange: "opacity, transform" }}
          >
            <WaitlistForm onSuccess={triggerConfetti} />
          </motion.section>
        </main>
      </div>
    </div>
  );
}