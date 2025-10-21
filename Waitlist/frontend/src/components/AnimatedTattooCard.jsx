"use client";
import React, { useRef } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

export default function AnimatedTattooCard({
  src,
  alt,
  styleTag = "Black & Grey",
  size = "md",
}) {
  const ref = useRef(null);
  const H = size === "lg" ? "h-[28rem]" : size === "sm" ? "h-64" : "h-80";
  function onMove(e) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    el.style.setProperty("--rx", `${y * -6}deg`);
    el.style.setProperty("--ry", `${x * 6}deg`);
  }
  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", `0deg`);
    el.style.setProperty("--ry", `0deg`);
  }
  return (
    <Card
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`relative overflow-hidden border-white/15 bg-white/[0.04] backdrop-blur-md ${H}`}
      style={{
        transformStyle: "preserve-3d",
        transform: "rotateX(var(--rx,0)) rotateY(var(--ry,0))",
      }}
    >
      <div className="absolute left-3 top-3 z-30">
        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white">
          {styleTag}
        </span>
      </div>
      <motion.img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover object-center"
        whileHover={{ scale: 1.03 }}
        transition={{ type: "tween", duration: 0.35 }}
      />
    </Card>
  );
}