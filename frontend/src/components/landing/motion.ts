import { type Variants } from "framer-motion";

export const EASE = [0.22, 1, 0.36, 1] as const;

export const directionalReveal: Variants = {
    hidden: (dir: number = 0) => ({
        opacity: 0,
        x: dir * 56,
        y: dir === 0 ? 34 : 0,
        filter: "blur(10px)",
    }),
    show: {
        opacity: 1,
        x: 0,
        y: 0,
        filter: "blur(0px)",
        transition: {
            opacity: { duration: 0.6, ease: EASE },
            x: { type: "spring", stiffness: 200, damping: 26, mass: 0.8 },
            y: { type: "spring", stiffness: 200, damping: 26, mass: 0.8 },
            filter: { duration: 0.55, ease: EASE },
        },
    },
};

export const dirForColumn = (index: number, cols: number): number => {
    if (cols <= 1) return 0;
    const col = index % cols;
    if (col === 0) return -1;
    if (col === cols - 1) return 1;
    return 0;
};
