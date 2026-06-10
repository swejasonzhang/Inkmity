import type { Variants, Transition } from "framer-motion";

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
