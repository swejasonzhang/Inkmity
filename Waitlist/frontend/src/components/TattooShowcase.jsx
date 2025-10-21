"use client";
import React from "react";
import { motion } from "framer-motion";
import AnimatedTattooCard from "./AnimatedTattooCard";

export default function TattooShowcase() {
  const items = [
    { src: "/tattoos/snake.jpg", alt: "Snake forearm", tag: "Black & Grey" },
    {
      src: "/tattoos/peony.jpg",
      alt: "Peony shoulder",
      tag: "Neo-Traditional",
    },
    { src: "/tattoos/skull.jpg", alt: "Skull chest", tag: "Realism" },
  ];

  return (
    <section className="container mx-auto max-w-7xl px-4 pt-8 pb-16">
      <motion.h2
        className="text-3xl md:text-5xl font-extrabold tracking-tight text-center bg-clip-text text-transparent bg-[linear-gradient(180deg,#fff,rgba(255,255,255,.6))]"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        See the energy
      </motion.h2>
      <div className="mx-auto mt-4 h-px w-48 bg-white/20" />
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {items.map((it) => (
          <motion.div
            key={it.src}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <AnimatedTattooCard src={it.src} alt={it.alt} styleTag={it.tag} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}