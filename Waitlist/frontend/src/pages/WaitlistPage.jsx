"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import FeatureShowcase from "../components/FeatureShowcase";
import WaitlistForm from "../components/WaitlistForm";
import BackgroundVideo from "../components/BackgroundVideo";
import LaunchHero from "../components/LaunchHero";
import { fireSideCannons } from "@/lib/confettiSideCannons";

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

export default function WaitlistPage() {
  const [confettiKey, setConfettiKey] = useState(0);
  const container = "container mx-auto w-full max-w-4xl px-4";

  function onSuccessConfetti() {
    setConfettiKey((k) => k + 1);
    fireSideCannons(3000, 0.25);
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
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <LaunchHero />
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section
            key={`features-${confettiKey}`}
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
            <WaitlistForm onSuccess={onSuccessConfetti} />
          </motion.section>
        </main>
      </div>
    </div>
  );
}