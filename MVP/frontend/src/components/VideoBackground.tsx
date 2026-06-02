import React from "react";

type Props = {
    scrim?: number;
};

const VideoBackground: React.FC<Props> = ({ scrim = 55 }) => (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-app" aria-hidden>
        <video
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
        >
            <source src="/Landing.mp4" type="video/mp4" />
        </video>
        <div
            className="absolute inset-0"
            style={{ background: `color-mix(in oklab, var(--bg) ${scrim}%, transparent)` }}
        />
    </div>
);

export default VideoBackground;
