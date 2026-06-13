import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
    scrim?: number;
    video?: boolean;
};

const POSTER = "/poster.jpg";
const VIDEO = "/Landing.mp4";

const VideoBackground: React.FC<Props> = ({ scrim = 58, video = true }) => {
    const ref = useRef<HTMLVideoElement>(null);
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return;
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const on = () => setReduced(mq.matches);
        on();
        mq.addEventListener?.("change", on);
        return () => mq.removeEventListener?.("change", on);
    }, []);

    const showVideo = video && !reduced;

    useEffect(() => {
        if (!showVideo) return;
        const v = ref.current;
        if (!v) return;
        v.muted = true;
        v.defaultMuted = true;
        const tryPlay = () => {
            const p = v.play();
            if (p && typeof p.catch === "function") p.catch(() => { });
        };
        tryPlay();
        v.addEventListener("canplay", tryPlay, { once: true });
        return () => v.removeEventListener("canplay", tryPlay);
    }, [showVideo]);

    useEffect(() => {
        const prev = document.body.style.backgroundColor;
        document.body.style.backgroundColor = "transparent";
        return () => {
            document.body.style.backgroundColor = prev;
        };
    }, []);

    if (typeof document === "undefined") return null;

    return createPortal(
        <div
            className="fixed inset-0 overflow-hidden pointer-events-none bg-app"
            style={{ zIndex: -1 }}
            aria-hidden
        >
            <img
                src={POSTER}
                alt=""
                className="absolute inset-0 h-full w-full object-cover grayscale"
                decoding="async"
            />
            {showVideo && (
                <video
                    ref={ref}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    poster={POSTER}
                    className="absolute inset-0 h-full w-full object-cover grayscale"
                >
                    <source src={VIDEO} type="video/mp4" />
                </video>
            )}
            <div
                className="absolute inset-0"
                style={{ background: `color-mix(in srgb, var(--bg) ${scrim}%, transparent)` }}
            />
        </div>,
        document.body
    );
};

export default VideoBackground;
