import React, { useCallback, useEffect, useRef, useState } from "react";
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
    const [origin, setOrigin] = useState({ oxPct: 50, oyPct: 50, oxPx: 0, oyPx: 0 });
    const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
    const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 });
    const zoom = 1.55;
    const lensSize = useResponsiveLensSize();

    const measureImage = useCallback(() => {
        const img = imgRef.current;
        if (!img) return;
        const rect = img.getBoundingClientRect();
        setImageSize({
            width: rect.width || 1,
            height: rect.height || 1
        });
        setNaturalSize({
            width: img.naturalWidth || rect.width || 1,
            height: img.naturalHeight || rect.height || 1
        });
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    useEffect(() => {
        measureImage();
    }, [measureImage, src]);

    useEffect(() => {
        const handleResize = () => measureImage();
        window.addEventListener("resize", handleResize, { passive: true });
        return () => window.removeEventListener("resize", handleResize);
    }, [measureImage]);

    const scaleX = imageSize.width ? naturalSize.width / imageSize.width : 1;
    const scaleY = imageSize.height ? naturalSize.height / imageSize.height : 1;

    const updateFromPointer = (clientX: number, clientY: number) => {
        const wrap = wrapRef.current;
        const img = imgRef.current;
        if (!wrap || !img) return;

        const wrapRect = wrap.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - wrapRect.left, wrapRect.width));
        const y = Math.max(0, Math.min(clientY - wrapRect.top, wrapRect.height));
        setLensPos({ x, y });

        const imgRect = img.getBoundingClientRect();
        const relX = Math.max(0, Math.min(clientX - imgRect.left, imgRect.width));
        const relY = Math.max(0, Math.min(clientY - imgRect.top, imgRect.height));
        const rx = imgRect.width ? relX / imgRect.width : 0.5;
        const ry = imgRect.height ? relY / imgRect.height : 0.5;
        setOrigin({ oxPct: rx * 100, oyPct: ry * 100, oxPx: relX, oyPx: relY });
        setImageSize({ width: imgRect.width || 1, height: imgRect.height || 1 });
    };

    const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
        e.preventDefault();
        setLensOn(true);
        updateFromPointer(e.clientX, e.clientY);
    };

    const onPointerEnter: React.PointerEventHandler<HTMLDivElement> = (e) => {
        setLensOn(true);
        updateFromPointer(e.clientX, e.clientY);
    };

    const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
        if (!lensOn) return;
        updateFromPointer(e.clientX, e.clientY);
    };

    const onPointerUp: React.PointerEventHandler<HTMLDivElement> = () => {
        setLensOn(false);
    };

    const stop = (e: React.MouseEvent | React.PointerEvent) => {
        e.stopPropagation();
        e.preventDefault();
    };

    const frost: React.CSSProperties = {
        background: "color-mix(in srgb, var(--card) 82%, transparent)",
        borderColor: "color-mix(in srgb, var(--fg) 25%, transparent)",
        color: "var(--fg)",
    };

    return (
        <div
            className="fixed inset-0 z-[1300] flex items-center justify-center"
            style={{ background: "color-mix(in srgb, var(--bg) 85%, black 15%)" }}
            role="dialog"
            aria-modal="true"
            aria-label="Zoomed artwork"
            onClick={onClose}
        >
            <div className="absolute inset-0 backdrop-blur-sm" aria-hidden />

            <div
                className="relative w-screen h-screen flex items-center justify-center p-2 sm:p-3"
                onClick={stop}
            >
                <div
                    ref={wrapRef}
                    className="relative inline-flex overflow-hidden rounded-2xl border"
                    style={{ maxHeight: "calc(100vh - 24px)", maxWidth: "min(94vw, 1500px)", borderColor: "var(--border)" }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerEnter={onPointerEnter}
                    onPointerUp={onPointerUp}
                    onPointerLeave={() => setLensOn(false)}
                >
                    <motion.img
                        ref={imgRef}
                        key={src}
                        src={src}
                        alt="Zoomed artwork"
                        className="select-none block h-auto w-auto max-h-full max-w-full object-contain"
                        onLoad={measureImage}
                        draggable={false}
                        initial={{ opacity: 0, scale: 0.985 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 26 }}
                    />

                    {lensOn && (
                        <div
                            className="pointer-events-none absolute"
                            style={{
                                width: lensSize,
                                height: lensSize,
                                left: lensPos.x - lensSize / 2,
                                top: lensPos.y - lensSize / 2,
                                borderRadius: "50%",
                                overflow: "hidden",
                                border: "1px solid var(--border)",
                                boxShadow: "0 10px 30px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.1)",
                                zIndex: 6,
                                backgroundImage: `url(${src})`,
                                backgroundRepeat: "no-repeat",
                                backgroundSize: `${naturalSize.width * zoom}px ${naturalSize.height * zoom}px`,
                                backgroundPosition: `${lensSize / 2 - origin.oxPx * (scaleX * zoom)}px ${lensSize / 2 - origin.oyPx * (scaleY * zoom)}px`,
                                backgroundColor: "var(--card)"
                            }}
                        />
                    )}

                    <div
                        className="absolute top-2 left-2 z-20 rounded-full px-3 py-1 text-[11px] sm:text-xs font-semibold backdrop-blur-md border shadow-lg"
                        style={frost}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        {count}
                    </div>
                    <button
                        onClick={(e) => { stop(e); onClose(); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="absolute top-2 right-2 z-20 h-9 w-9 sm:h-10 sm:w-10 rounded-full border backdrop-blur-md shadow-lg grid place-items-center transition active:scale-90"
                        style={frost}
                        aria-label="Close image"
                    >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                    <button
                        onClick={(e) => { stop(e); onPrev(); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="absolute bottom-2 left-2 z-20 h-9 w-9 sm:h-11 sm:w-11 rounded-full border backdrop-blur-md shadow-lg grid place-items-center transition active:scale-90"
                        style={frost}
                        aria-label="Previous image"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                        onClick={(e) => { stop(e); onNext(); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="absolute bottom-2 right-2 z-20 h-9 w-9 sm:h-11 sm:w-11 rounded-full border backdrop-blur-md shadow-lg grid place-items-center transition active:scale-90"
                        style={frost}
                        aria-label="Next image"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FullscreenZoom;