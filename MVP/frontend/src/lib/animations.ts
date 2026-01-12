import type { Variants, Transition } from "framer-motion";

export const spring: Transition = {
  type: "spring",
  stiffness: 180,
  damping: 28,
  mass: 0.9,
  bounce: 0,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

export const slide: Transition = {
  type: "tween",
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1],
};

export const shake: Variants = {
  idle: { x: 0 },
  nudge: {
    x: [0, -4, 4, -3, 3, -1.5, 1.5, 0],
    transition: { duration: 0.4 },
  },
};

export const microSpring: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 24,
  mass: 0.6,
  bounce: 0,
};

export const hoverSpring: Transition = {
  type: "spring",
  stiffness: 240,
  damping: 20,
  mass: 0.7,
  bounce: 0,
};