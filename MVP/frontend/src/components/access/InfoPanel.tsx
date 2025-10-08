import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Sparkles } from "lucide-react";
import InkMascot from "./InkMascot";
import { slide } from "./animations";

type Props = {
    show: boolean;
    prefersReduced: boolean;
    hasError?: boolean;
    isPasswordHidden?: boolean;
    className?: string;
    mode?: "signup" | "login";
};

export default function InfoPanel({
    show,
    prefersReduced,
    hasError,
    isPasswordHidden,
    className,
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

    const [revealText, setRevealText] = useState(prefersReduced);

    useEffect(() => {
        let t: number | null = null;
        if (prefersReduced) {
            setRevealText(delayed);
        } else if (!delayed) {
            setRevealText(false);
        } else {
            t = window.setTimeout(() => setRevealText(true), 1000);
        }
        return () => {
            if (t !== null) window.clearTimeout(t);
        };
    }, [delayed, prefersReduced]);

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
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: delayed ? 520 : 0, opacity: delayed ? 1 : 0 }}
            transition={prefersReduced ? { duration: 0 } : slide}
            className={`overflow-hidden will-change-transform self-stretch ${className ?? ""}`}
        >
            <div
                ref={panelRef}
                className="h-full rounded-l-3xl p-[1px] transform-gpu"
                style={{
                    background:
                        "linear-gradient(135deg, rgba(255,255,255,0.28), rgba(255,255,255,0.12) 45%, rgba(255,255,255,0.06))",
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.12), 0 10px 40px -12px rgba(0,0,0,0.5)",
                }}
            >
                <div className="h-full rounded-l-3xl bg-[#0b0b0b]/80 backdrop-blur-xl px-10 py-12 flex flex-col">
                    <div className="w-full max-w-md mx-auto text-center flex-1 flex flex-col items-center justify-center">
                        <div className="inline-flex items-center gap-2 text-white/80 text-sm mb-4 select-none">
                            <Sparkles className="h-4 w-4" />
                            <span>Inkmity</span>
                        </div>
                        <h2 className="text-3xl font-semibold text-white select-none">{mode === "login" ? "Welcome back" : "Our Mission"}</h2>
                        {prefersReduced ? (
                            delayed && <p className="mt-4 text-white/70 text-base leading-relaxed select-none">{message}</p>
                        ) : (
                            <motion.p
                                initial={false}
                                animate={{ opacity: revealText ? 1 : 0 }}
                                transition={{ duration: 0.45, ease: "easeOut" }}
                                className="mt-4 text-white/70 text-base leading-relaxed select-none will-change-[opacity]"
                            >
                                {message}
                            </motion.p>
                        )}
                        <div
                            className="mt-8 w-full flex items-center justify-center h-40 md:h-48 isolate flex-none"
                            style={{ contain: "layout paint", willChange: "transform" }}
                        >
                            <InkMascot dx={pupil.dx} dy={pupil.dy} hasError={hasError} isPasswordHidden={isPasswordHidden} />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}