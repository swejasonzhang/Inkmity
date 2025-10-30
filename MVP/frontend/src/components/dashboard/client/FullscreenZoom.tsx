import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import useResponsiveLensSize from "../../../hooks/useResponsiveLensSize.ts";

type Props = {
    src: string;
    count: string;
    onPrev: () => void;
    onNext: () => void;
    onClose: () => void;
};

const FullscreenZoom: React.FC<Props> = ({ src, count, onPrev, onNext, onClose }) => {
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);

    const [lensOn, setLensOn] = useState(false);
    const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
    const [origin, setOrigin] = useState({ oxPct: 50, oyPct: 50 });
    const zoom = 2.2;
    const lensSize = useResponsiveLensSize();

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const updateFromPointer = (clientX: number, clientY: number) => {
        const wrap = wrapRef.current;
        const img = imgRef.current;
        if (!wrap || !img) return;

        const wrapRect = wrap.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - wrapRect.left, wrapRect.width));
        const y = Math.max(0, Math.min(clientY - wrapRect.top, wrapRect.height));
        setLensPos({ x, y });

        const imgRect = img.getBoundingClientRect();
        const rx = Math.max(0, Math.min((clientX - imgRect.left) / imgRect.width, 1));
        const ry = Math.max(0, Math.min((clientY - imgRect.top) / imgRect.height, 1));
        setOrigin({ oxPct: rx * 100, oyPct: ry * 100 });
    };

    const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        setLensOn(true);
        updateFromPointer(e.clientX, e.clientY);
    };

    const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
        if (!lensOn) return;
        updateFromPointer(e.clientX, e.clientY);
    };

    const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
        setLensOn(false);
    };

    const stop = (e: React.MouseEvent | React.PointerEvent) => {
        e.stopPropagation();
        e.preventDefault();
    };

    return (
        <div
            className="fixed inset-0 z-[1300] flex items-center justify-center"
            style={{ background: "color-mix(in oklab, var(--bg) 85%, black 15%)" }}
            role="dialog"
            aria-modal="true"
            aria-label="Zoomed artwork"
            onClick={onClose}
        >
            <div className="absolute inset-0 backdrop-blur-sm" aria-hidden />

            <div
                className="relative w-screen h-screen flex items-center justify-center px-2 sm:px-4"
                onClick={stop}
            >
                <div
                    className="absolute left-1/2 -translate-x-1/2 top-3 sm:top-4 rounded-full shadow-sm z-[9999] pointer-events-none"
                    style={{ background: "var(--bg)", border: "2px solid #000", color: "#000" }}
                >
                    <div className="flex items-center gap-2 px-5 py-2 text-white font-semibold">
                        <span>{count}</span>
                    </div>
                </div>

                <div
                    ref={wrapRef}
                    className="relative max-w-[98vw] w-screen flex items-center justify-center overflow-hidden"
                    style={{ maxHeight: "calc(100vh - 20px)", height: "calc(100vh - 20px)" }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerLeave={() => setLensOn(false)}
                >
                    <motion.img
                        ref={imgRef}
                        key={src}
                        src={src}
                        alt="Zoomed artwork"
                        className="w-screen select-none"
                        style={{ height: "calc(100vh - 20px)", objectFit: "contain" }}
                        draggable={false}
                        initial={{ opacity: 0, scale: 0.985 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 26 }}
                    />

                    {lensOn && (
                        <>
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{ clipPath: `circle(${lensSize / 2}px at ${lensPos.x}px ${lensPos.y}px)` }}
                            >
                                <img
                                    src={src}
                                    alt=""
                                    className="w-screen select-none"
                                    style={{
                                        height: "calc(100vh - 20px)",
                                        objectFit: "contain",
                                        transform: `scale(${zoom})`,
                                        transformOrigin: `${origin.oxPct}% ${origin.oyPct}%`,
                                    }}
                                    draggable={false}
                                />
                            </div>

                            <div
                                className="pointer-events-none absolute rounded-full border"
                                style={{
                                    width: lensSize,
                                    height: lensSize,
                                    left: lensPos.x - lensSize / 2,
                                    top: lensPos.y - lensSize / 2,
                                    borderColor: "var(--border)",
                                    boxShadow: "0 10px 30px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.06)",
                                }}
                            />
                        </>
                    )}

                    <button
                        onClick={(e) => { stop(e); onPrev(); }}
                        className="group absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 h-14 w-14 sm:h-16 sm:w-16 rounded-full border backdrop-blur bg-card/70 shadow-xl grid place-items-center z-10"
                        style={{ borderColor: "var(--border)", color: "var(--fg)" }}
                        aria-label="Previous image"
                    >
                        <ChevronLeft className="h-7 w-7 transition-transform group-hover:-translate-x-0.5" />
                    </button>

                    <button
                        onClick={(e) => { stop(e); onNext(); }}
                        className="group absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 h-14 w-14 sm:h-16 sm:w-16 rounded-full border backdrop-blur bg-card/70 shadow-xl grid place-items-center z-10"
                        style={{ borderColor: "var(--border)", color: "var(--fg)" }}
                        aria-label="Next image"
                    >
                        <ChevronRight className="h-7 w-7 transition-transform group-hover:translate-x-0.5" />
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 h-12 w-12 rounded-full border backdrop-blur bg-card/75 shadow-xl grid place-items-center z-20"
                    style={{ borderColor: "var(--border)", color: "var(--fg)" }}
                    aria-label="Close image"
                >
                    <X className="h-8 w-8" />
                </button>
            </div>
        </div>
    );
};

export default FullscreenZoom;