import React from "react";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";

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
    const total = Math.max(1, totalPages);
    const atStart = currentPage <= 1;
    const atEnd = currentPage >= total;

    const btn =
        "grid place-items-center rounded-full border border-app bg-card text-app transition " +
        "hover:bg-elevated active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fg)]/30 " +
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-card";

    return (
        <div className={className || ""}>
            <div
                className="hidden md:flex items-center gap-2 pointer-events-auto select-none"
                role="navigation"
                aria-label="Pagination"
                aria-disabled={!desktopEnabled}
                data-pagination
                style={{ opacity: desktopEnabled ? 1 : 0.5, pointerEvents: desktopEnabled ? "auto" : "none" }}
            >
                <button
                    type="button"
                    onClick={onPrev}
                    disabled={atStart}
                    aria-label="Previous page"
                    className={`${btn} h-9 w-9`}
                >
                    <ChevronLeft size={18} aria-hidden className="block" />
                </button>

                <span
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-app bg-card text-sm leading-none"
                    aria-live="polite"
                >
                    <span className="text-subtle text-xs uppercase tracking-wide">Page</span>
                    <span className="font-semibold tabular-nums text-app">{currentPage}</span>
                    <span className="text-subtle">/</span>
                    <span className="font-semibold tabular-nums text-app">{total}</span>
                </span>

                <button
                    type="button"
                    onClick={onNext}
                    disabled={atEnd}
                    aria-label="Next page"
                    className={`${btn} h-9 w-9`}
                >
                    <ChevronRight size={18} aria-hidden className="block" />
                </button>
            </div>

            <div className="md:hidden pointer-events-auto">
                <div
                    className="flex items-center justify-center gap-2"
                    role="navigation"
                    aria-label="Pagination (mobile)"
                    style={{ minHeight: 48 }}
                >
                    <button
                        type="button"
                        onClick={onPrev}
                        disabled={atStart}
                        aria-label="Previous"
                        className={`${btn} h-11 w-11`}
                    >
                        <ChevronUp size={20} aria-hidden />
                    </button>
                    <button
                        type="button"
                        onClick={onNext}
                        disabled={atEnd}
                        aria-label="Next"
                        className={`${btn} h-11 w-11`}
                    >
                        <ChevronDown size={20} aria-hidden />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Pagination;
