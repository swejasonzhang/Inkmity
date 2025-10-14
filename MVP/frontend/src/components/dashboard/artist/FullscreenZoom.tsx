import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import useResponsiveLensSize from "./useResponsiveLensSize.ts";

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
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className="absolute left-1/2 -translate-x-1/2 top-3 sm:top-4 flex items-center gap-2 rounded-full border px-2 py-1.5 shadow-sm bg-card/80 backdrop-blur"
                    style={{ borderColor: "var(--border)", color: "var(--fg)" }}
                >
                    <Button variant="ghost" size="icon" onClick={onPrev} className="rounded-full h-8 w-8" aria-label="Previous image">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <span className="text-sm font-semibold px-2">{count}</span>
                    <Button variant="ghost" size="icon" onClick={onNext} className="rounded-full h-8 w-8" aria-label="Next image">
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>

                <div
                    ref={wrapRef}
                    className="relative max-w-[98vw] max-h-[96vh] w-screen h-screen flex items-center justify-center overflow-hidden"
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
                        className="w-screen h-screen object-contain select-none"
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
                                    className="w-screen h-screen object-contain select-none"
                                    style={{ transform: `scale(${zoom})`, transformOrigin: `${origin.oxPct}% ${origin.oyPct}%` }}
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
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 rounded-full"
                    aria-label="Close image"
                >
                    <X className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
};

export default FullscreenZoom;