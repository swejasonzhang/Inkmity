import React from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

type Props = {
    currentPage: number;
    totalPages: number;
    onPrev: () => void;
    onNext: () => void;
    className?: string;
    desktopEnabled?: boolean;
};

const Pagination: React.FC<Props> = ({
    currentPage,
    totalPages,
    onPrev,
    onNext,
    className,
    desktopEnabled = true,
}) => {
    const atStart = currentPage === 1;
    const atEnd = currentPage === totalPages;

    return (
        <div
            className={[
                "fixed z-[1001] pointer-events-none",
                "left-1/2 -translate-x-1/2",
                "w-auto max-w-[calc(100vw-24px)]",
                className || "",
            ].join(" ")}
            style={{
                bottom: `calc(env(safe-area-inset-bottom, 0px) + 20px)`,
            }}
        >
            
            <div
                className="hidden md:flex justify-center items-center gap-4 text-app pointer-events-auto"
                role="navigation"
                aria-label="Pagination"
                aria-disabled={!desktopEnabled}
                style={{ opacity: desktopEnabled ? 1 : 0.5, pointerEvents: desktopEnabled ? "auto" : "none" }}
            >
                <button
                    type="button"
                    onClick={onPrev}
                    disabled={atStart}
                    aria-label="Previous page"
                    className={[
                        "h-11 w-11 grid place-items-center rounded-full",
                        "border border-app bg-elevated hover:bg-elevated active:scale-[0.99]",
                        "focus:outline-none focus:ring-2 focus:ring-[color:var(--border)]",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                    ].join(" ")}
                >
                    <ChevronLeft size={18} aria-hidden />
                </button>

                <span
                    className={[
                        "inline-flex items-center justify-center",
                        "h-12 min-w-[10rem] px-6",
                        "rounded-full border border-app bg-card/70 backdrop-blur",
                        "text-lg leading-none",
                    ].join(" ")}
                    aria-live="polite"
                >
                    Page <span className="ml-2 font-semibold">{currentPage}</span>
                    <span className="mx-2 text-subtle">of</span>
                    <span className="font-semibold">{Math.max(1, totalPages)}</span>
                </span>

                <button
                    type="button"
                    onClick={onNext}
                    disabled={atEnd}
                    aria-label="Next page"
                    className={[
                        "h-11 w-11 grid place-items-center rounded-full",
                        "border border-app bg-elevated hover:bg-elevated active:scale-[0.99]",
                        "focus:outline-none focus:ring-2 focus:ring-[color:var(--border)]",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                    ].join(" ")}
                >
                    <ChevronRight size={18} aria-hidden />
                </button>
            </div>

            {}
            <div className="md:hidden pointer-events-auto mt-2">
                <div
                    className="grid place-items-center w-full"
                    role="navigation"
                    aria-label="Pagination (mobile)"
                    style={{ minHeight: 72 }}
                >
                    <div className="flex flex-col items-center justify-center gap-2 text-app">
                        <button
                            type="button"
                            onClick={onNext}
                            disabled={atEnd}
                            aria-label="Next page"
                            className={[
                                "h-12 w-12 grid place-items-center rounded-full",
                                "border border-app bg-elevated hover:bg-elevated active:scale-[0.99]",
                                "focus:outline-none focus:ring-2 focus:ring-[color:var(--border)]",
                                "disabled:opacity-50 disabled:cursor-not-allowed",
                            ].join(" ")}
                        >
                            <ChevronDown size={22} aria-hidden />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Pagination;