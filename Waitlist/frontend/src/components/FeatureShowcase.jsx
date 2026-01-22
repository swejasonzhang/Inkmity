"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import {
  MessagingCard,
  FiltersCard,
  RewardsCard,
  FlashDealsCard,
  LoyaltyCard,
  PreferencesCard,
  GalleryCard,
  AnalyticsCard,
} from "./FeatureCards";

export default function FeatureShowcase() {
  const [mobileRole, setMobileRole] = useState("client");

  const fade = {
    hidden: { opacity: 0, y: 10 },
    show: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  return (
    <section className="container mx-auto max-w-6xl px-3 xs:px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6 w-full">
      <h2 className="text-center text-2xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-[linear-gradient(180deg,#fff,rgba(255,255,255,.7))]" style={{ filter: 'drop-shadow(0 2px 25px rgba(255,255,255,0.2))', textShadow: '0 1px 20px rgba(255,255,255,0.15)' }}>
        Our Features
      </h2>
      <div className="py-3 md:py-4">
        <Separator className="mx-auto bg-white/20 w-40 md:w-48" />
      </div>

      <div className="mt-6 md:mt-8">
        <div className="mb-3 md:mb-4 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/22 bg-white/[0.1] backdrop-blur-sm px-3.5 py-1.5 text-[11px] md:text-xs uppercase tracking-wide font-semibold shadow-[0_3px_15px_rgba(0,0,0,0.3)]">
            <span className="opacity-85 text-white/93">Shared</span>
            <span className="h-1 w-1 rounded-full bg-white/60" />
            <span className="text-white/93">Real-time messaging</span>
          </div>
        </div>
        <MessagingCard compact />
      </div>

      {/* Mobile Toggle */}
      <div className="mt-6 md:hidden">
        <div className="mx-auto w-full max-w-xs">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="relative flex rounded-full border border-white/18 bg-white/[0.08] backdrop-blur-sm p-1 shadow-[0_2px_10px_rgba(0,0,0,0.25)]"
          >
            <motion.div
              className="absolute top-1 bottom-1 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
              initial={false}
              animate={{
                left: mobileRole === "client" ? "4px" : "50%",
                width: "calc(50% - 4px)",
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
              }}
            />
            <button
              onClick={() => setMobileRole("client")}
              className={`relative z-10 flex-1 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors duration-300 ${
                mobileRole === "client" ? "bg-white !text-black" : "text-white"
              }`}
            >
              Client
            </button>
            <button
              onClick={() => setMobileRole("artist")}
              className={`relative z-10 flex-1 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors duration-300 ${
                mobileRole === "artist" ? "bg-white !text-black" : "text-white"
              }`}
            >
              Artist
            </button>
          </motion.div>
        </div>
      </div>

      {/* Side by side layout for desktop, single view for mobile */}
      <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
        {/* Client Section */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className={`${
            mobileRole === "client" ? "flex" : "hidden"
          } md:flex flex-col items-stretch gap-6 md:gap-8`}
        >
          <motion.div
            custom={0}
            variants={fade}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/22 bg-white/[0.1] backdrop-blur-sm px-4 py-2 text-sm md:text-base font-extrabold uppercase tracking-wide shadow-[0_3px_15px_rgba(0,0,0,0.3)]" style={{ textShadow: '0 1px 8px rgba(255,255,255,0.1)' }}>
              Client
            </div>
          </motion.div>
          <motion.div custom={1} variants={fade}>
            <FiltersCard compact />
          </motion.div>
          <motion.div custom={2} variants={fade}>
            <PreferencesCard compact />
          </motion.div>
          <motion.div custom={3} variants={fade}>
            <GalleryCard compact />
          </motion.div>
          <motion.div custom={4} variants={fade}>
            <RewardsCard compact />
          </motion.div>
        </motion.div>

        {/* Artist Section */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className={`${
            mobileRole === "artist" ? "flex" : "hidden"
          } md:flex flex-col items-stretch gap-6 md:gap-8`}
        >
          <motion.div
            custom={0}
            variants={fade}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/22 bg-white/[0.1] backdrop-blur-sm px-4 py-2 text-sm md:text-base font-extrabold uppercase tracking-wide shadow-[0_3px_15px_rgba(0,0,0,0.3)]" style={{ textShadow: '0 1px 8px rgba(255,255,255,0.1)' }}>
              Artist
            </div>
          </motion.div>
          <motion.div custom={1} variants={fade}>
            <AnalyticsCard compact />
          </motion.div>
          <motion.div custom={2} variants={fade}>
            <LoyaltyCard compact />
          </motion.div>
          <motion.div custom={3} variants={fade}>
            <FlashDealsCard compact />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}