import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

type Props = {
  dx: number;
  dy: number;
  hasError?: boolean;
  isPasswordHidden?: boolean;
};

const bezier = [0.22, 1, 0.36, 1] as const;

const headVariants: Variants = {
  ok: { rotate: 0, x: 0, transition: { duration: 0.25, ease: bezier } },
  error: {
    rotate: [0, -6, 6, -4, 4, 0],
    x: [0, -2, 2, -1, 1, 0],
    transition: { duration: 0.6, ease: bezier },
  },
};

export default function InkMascot({
  dx,
  dy,
  hasError = false,
  isPasswordHidden = false,
}: Props) {
  const smile = "M105 112c12 10 38 10 50 0";
  const frown = "M105 112c12 -10 38 -10 50 0";

  const [blinking, setBlinking] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [allowClose, setAllowClose] = useState(false);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => setMounted(true));
    const t = window.setTimeout(() => setAllowClose(true), 350);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (!mounted || isPasswordHidden) {
      setBlinking(false);
      return;
    }
    let t1: number | undefined;
    let t2: number | undefined;
    const schedule = () => {
      const delay = 2500 + Math.random() * 3000;
      t1 = window.setTimeout(() => {
        setBlinking(true);
        t2 = window.setTimeout(() => {
          setBlinking(false);
          schedule();
        }, 120);
      }, delay);
    };
    schedule();
    return () => {
      if (t1) window.clearTimeout(t1);
      if (t2) window.clearTimeout(t2);
    };
  }, [mounted, isPasswordHidden]);

  const eyesClosed = allowClose ? isPasswordHidden || blinking : false;
  const eyeRy = eyesClosed ? 2 : 16;
  const eyeFill = eyesClosed ? "#0a0a0a" : "#ffffff";
  const pupilOpacity = eyesClosed ? 0 : 1;

  return (
    <svg width="260" height="170" viewBox="0 0 260 170" aria-hidden>
      <defs>
        <radialGradient id="inkGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#1f1f1f" />
          <stop offset="70%" stopColor="#0f0f0f" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
        <filter id="shadowBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="eyeLeftClip">
          <ellipse cx="100" cy="85" rx="18" ry="16" />
        </clipPath>
        <clipPath id="eyeRightClip">
          <ellipse cx="160" cy="85" rx="18" ry="16" />
        </clipPath>
      </defs>

      <motion.g
        variants={headVariants}
        animate={hasError ? "error" : "ok"}
        style={{ transformOrigin: "130px 85px" }}
      >
        <motion.path
          d="M130 15c36 0 74 20 74 52 0 16-9 26-19 33 14 3 25 11 25 22 0 18-22 31-80 31s-80-13-80-31c0-11 10-19 25-22-10-7-19-17-19-33 0-32 38-52 74-52z"
          fill="url(#inkGrad)"
          filter="url(#shadowBlur)"
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: bezier }}
          shapeRendering="geometricPrecision"
        />

        <motion.ellipse
          cx="100"
          cy="85"
          rx="18"
          ry={16}
          initial={false}
          animate={{ ry: eyeRy, fill: eyeFill }}
          transition={{ duration: 0.12, ease: bezier }}
          shapeRendering="geometricPrecision"
        />
        <motion.ellipse
          cx="160"
          cy="85"
          rx="18"
          ry={16}
          initial={false}
          animate={{ ry: eyeRy, fill: eyeFill }}
          transition={{ duration: 0.12, ease: bezier }}
          shapeRendering="geometricPrecision"
        />

        <g clipPath="url(#eyeLeftClip)">
          <motion.circle
            cx={100 + dx}
            cy={85 + dy}
            r="6.5"
            fill="#0a0a0a"
            initial={{ opacity: 1 }}
            animate={{ opacity: pupilOpacity }}
            transition={{ duration: 0.1 }}
          />
        </g>
        <g clipPath="url(#eyeRightClip)">
          <motion.circle
            cx={160 + dx}
            cy={85 + dy}
            r="6.5"
            fill="#0a0a0a"
            initial={{ opacity: 1 }}
            animate={{ opacity: pupilOpacity }}
            transition={{ duration: 0.1 }}
          />
        </g>

        <motion.path
          initial={{ d: smile }}
          d={smile}
          animate={{ d: hasError ? frown : smile }}
          transition={{ duration: 0.25, ease: bezier }}
          stroke="white"
          strokeWidth="4.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.95"
          shapeRendering="geometricPrecision"
        />

        <motion.circle
          cx="90"
          cy="105"
          r="4.5"
          animate={{ fill: hasError ? "#8ec5ff" : "#ff8598" }}
          opacity="0.9"
        />
        <motion.circle
          cx="170"
          cy="105"
          r="4.5"
          animate={{ fill: hasError ? "#8ec5ff" : "#ff8598" }}
          opacity="0.9"
        />
      </motion.g>
    </svg>
  );
}
