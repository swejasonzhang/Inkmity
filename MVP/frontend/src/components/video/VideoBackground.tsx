import * as React from "react";

type Props = {
    mp4: string;
    webm?: string;
    poster?: string;
    prefersReduced?: boolean;
    zClass?: string;
    overlayClass?: string;
    crossOrigin?: "anonymous" | "use-credentials";
    preload?: "none" | "metadata" | "auto";
};

const VideoBackground: React.FC<Props> = ({
    mp4,
    webm,
    prefersReduced = false,
    zClass = "-z-10",
    overlayClass = "bg-black/45",
    crossOrigin,
    preload = "metadata",
}) => {
    if (prefersReduced) {
        return (
            <>
                <div
                    className={`fixed inset-0 ${zClass} bg-center bg-cover`}
                    style={{ backgroundImage: `url("${poster}")`, backgroundColor: "black" }}
                    aria-hidden
                />
                <div className={`fixed inset-0 ${zClass} ${overlayClass}`} aria-hidden />
            </>
        );
    }

    const ref = React.useRef<HTMLVideoElement>(null);

    React.useEffect(() => {
        const v = ref.current;
        if (!v) return;

        v.muted = true;
        v.defaultMuted = true;
        v.volume = 0;
        v.playsInline = true;

        const tryPlay = () => v.play().catch(() => { });
        const onCanPlay = () => tryPlay();

        v.addEventListener("canplay", onCanPlay, { once: true });
        tryPlay();
        return () => v.removeEventListener("canplay", onCanPlay);
    }, []);

    return (
        <>
            <video
                ref={ref}
                autoPlay
                loop
                muted
                playsInline
                preload={preload}
                poster={poster}
                className={`fixed inset-0 ${zClass} h-full w-full object-cover pointer-events-none`}
                aria-hidden
                {...(crossOrigin ? { crossOrigin } : {})}
            >
                {webm ? <source src={webm} type="video/webm" /> : null}
                <source src={mp4} type="video/mp4" />
            </video>
            <div className={`fixed inset-0 ${zClass} ${overlayClass}`} aria-hidden />
        </>
    );
};

export default VideoBackground;
