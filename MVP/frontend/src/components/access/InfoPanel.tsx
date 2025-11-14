import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Sparkles } from "lucide-react";
import InkMascot from "./InkMascot";
import { slide } from "../../lib/animations";

type Props = {
    show: boolean;
    prefersReduced: boolean;
    hasError?: boolean;
    isPasswordHidden?: boolean;
    mode?: "signup" | "login";
};

export default function InfoPanel({
    show,
    prefersReduced,
    hasError,
    isPasswordHidden,
    mode = "signup",
}: Props) {
    const panelRef = useRef<HTMLDivElement | null>(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const smoothX = useSpring(mouseX, { stiffness: 150, damping: 30, mass: 0.8 });
    const smoothY = useSpring(mouseY, { stiffness: 150, damping: 30, mass: 0.8 });

    const [pupil, setPupil] = useState({ dx: 0, dy: 0 });
    const [delayed, setDelayed] = useState(false);

    useEffect(() => {
        let t: number | null = null;
        if (show) {
            setDelayed(false);
            t = window.setTimeout(() => setDelayed(true), 1000);
        } else {
            setDelayed(false);
        }
        return () => {
            if (t !== null) window.clearTimeout(t);
        };
    }, [show]);

    useEffect(() => {
        if (prefersReduced || !delayed) return;
        const onMove = (e: PointerEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        return () => window.removeEventListener("pointermove", onMove);
    }, [prefersReduced, delayed, mouseX, mouseY]);

    useEffect(() => {
        if (prefersReduced || !delayed) return;
        let raf = 0;
        const compute = () => {
            const box = panelRef.current?.getBoundingClientRect();
            if (box) {
                const cx = box.left + box.width / 2;
                const cy = box.top + box.height / 2;
                const dx = (smoothX.get() - cx) / (box.width / 2);
                const dy = (smoothY.get() - cy) / (box.height / 2);
                const max = 2.5;
                const nx = Math.max(-1, Math.min(1, dx)) * max;
                const ny = Math.max(-1, Math.min(1, dy)) * max;
                setPupil({ dx: nx, dy: ny });
            }
            raf = requestAnimationFrame(compute);
        };
        raf = requestAnimationFrame(compute);
        return () => cancelAnimationFrame(raf);
    }, [smoothX, smoothY, prefersReduced, delayed]);

    const message =
        mode === "login"
            ? "Thanks for using Inkmity! Share with friends and make finding an artist easier—with rewards!"
            : "We connect clients with artists through clear expectations, transparent pricing, and respectful collaboration.";

    return (
        <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: delayed ? 1 : 0, x: delayed ? 0 : 16 }}
            transition={prefersReduced ? { duration: 0 } : slide}
            className="w-full h-full"
        >
            <div
                ref={panelRef}
                className="w-full h-full rounded-t-3xl md:rounded-tl-3xl md:rounded-bl-3xl md:rounded-tr-none md:rounded-br-none"
                style={{
                    background:
                        "linear-gradient(135deg, rgba(255,255,255,0.28), rgba(255,255,255,0.12) 45%, rgba(255,255,255,0.06))",
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.12), 0 10px 40px -12px rgba(0,0,0,0.5)",
                }}
            >
                <div className="w-full h-full rounded-t-3xl md:rounded-tl-3xl md:rounded-bl-3xl md:rounded-tr-none md:rounded-br-none bg-[#0b0b0b]/80 backdrop-blur-xl px-5 py-6 sm:px-6 sm:py-8 md:px-10 md:py-12 flex flex-col">
                    <div className="w-full mx-auto text-center flex-1 flex flex-col items-center justify-center">
                        <div className="inline-flex items-center gap-2 text-white/80 text-xs sm:text-sm mb-3 sm:mb-4 select-none">
                            <Sparkles className="h-4 w-4" />
                            <span>Inkmity</span>
                        </div>

                        <h2 className="text-2xl sm:text-3xl md:text-3xl font-semibold text-white select-none">
                            {mode === "login" ? "We’ve missed you" : "Our Mission"}
                        </h2>

                        <motion.p
                            initial={false}
                            animate={{ opacity: delayed ? 1 : 0 }}
                            transition={{ duration: 0.45, ease: "easeOut" }}
                            className="mt-3 sm:mt-4 text-white/70 text-sm sm:text-base leading-relaxed select-none will-change-[opacity]"
                        >
                            {message}
                        </motion.p>

                        <div className="mt-6 sm:mt-7 md:mt-8 isolate">
                            <InkMascot dx={pupil.dx} dy={pupil.dy} hasError={hasError} isPasswordHidden={isPasswordHidden} />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}