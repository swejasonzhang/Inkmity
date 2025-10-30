import React from "react";
import { THEME_MS } from "../../hooks/useTheme";

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
                    "transition-[transform,opacity] motion-reduce:transition-none",
                    "ease-[cubic-bezier(0.22,1,0.36,1)]",
                ].join(" ")}
                style={{ transitionDuration: `calc(${THEME_MS}ms * 1.1)`, willChange: "transform, opacity" }}
            />
        </span>
    </span>
);

export const InkAccentMobile: React.FC<{ active: boolean }> = ({ active }) => (
    <span
        className={[
            "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full",
            active ? "bg-[linear-gradient(#000,#777,#fff)]" : "bg-transparent",
        ].join(" ")}
    />
);