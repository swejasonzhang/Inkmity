import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type Props = {
    scrim?: number;
};

const VideoBackground: React.FC<Props> = ({ scrim = 58 }) => {
    const ref = useRef<HTMLVideoElement>(null);

    useEffect(() => {
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
    }, []);

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
            <video
                ref={ref}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="absolute inset-0 h-full w-full object-cover grayscale"
            >
                <source src="/Landing.mp4" type="video/mp4" />
            </video>
            <div
                className="absolute inset-0"
                style={{ background: `color-mix(in srgb, var(--bg) ${scrim}%, transparent)` }}
            />
        </div>,
        document.body
    );
};

export default VideoBackground;
