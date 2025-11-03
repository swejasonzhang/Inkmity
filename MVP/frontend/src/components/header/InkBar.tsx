import React from "react";

export const InkBar: React.FC<{ active: boolean }> = ({ active }) => (
    <span className="pointer-events-none absolute -bottom-2 left-0 right-0">
        <span className="block h-[3px] rounded-full bg-app/15 overflow-hidden">
            <span
                aria-hidden
                className={[
                    "block h-full origin-left transform-gpu",
                    "bg-[linear-gradient(90deg,#000,#777,#fff)]",
                    active
                        ? "scale-x-100 opacity-100"
                        : "scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100",
                ].join(" ")}
                style={{
                    transition: "transform 380ms cubic-bezier(0.22,1,0.36,1), opacity 300ms ease-out",
                    willChange: "transform, opacity",
                }}
            />
        </span>
    </span>
);

export const InkAccentMobile: React.FC<{ active: boolean }> = ({ active }) => (
    <span
        className={[
            "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full",
            active ? "opacity-100" : "opacity-0",
        ].join(" ")}
        style={{
            background: "linear-gradient(#000,#777,#fff)",
            transition: "opacity 260ms ease-out",
            willChange: "opacity",
        }}
    />
);