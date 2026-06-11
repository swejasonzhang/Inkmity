import { type Variants } from "framer-motion";

export const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Directional reveal used across the landing page.
 * Pass a direction via framer-motion's `custom` prop:
 *   -1 → enters from the left
 *    1 → enters from the right
 *    0 → rises from below
 * Each element also blurs into focus, giving a polished, high-end feel.
 */
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

/**
 * Maps a grid item's index to a reveal direction so the outer columns slide in
 * from the sides and the middle column rises — a clean "converge" effect.
 */
export const dirForColumn = (index: number, cols: number): number => {
    if (cols <= 1) return 0;
    const col = index % cols;
    if (col === 0) return -1;
    if (col === cols - 1) return 1;
    return 0;
};
