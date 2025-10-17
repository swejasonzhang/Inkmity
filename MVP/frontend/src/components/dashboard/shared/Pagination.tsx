import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
    currentPage: number;
    totalPages: number;
    onPrev: () => void;
    onNext: () => void;
    className?: string;
};

const Pagination: React.FC<Props> = ({
    currentPage,
    totalPages,
    onPrev,
    onNext,
    className,
}) => {
    if (totalPages <= 1) return null;

    const atStart = currentPage === 1;
    const atEnd = currentPage === totalPages;

    return (
        <div
            className={`flex justify-center items-center gap-3 sm:gap-4 mt-2 sm:mt-3 text-app ${className || ""}`}
            role="navigation"
            aria-label="Pagination"
        >
            <button
                type="button"
                onClick={onPrev}
                disabled={atStart}
                aria-label="Previous page"
                className={[
                    "h-10 w-10 sm:h-11 sm:w-11 grid place-items-center rounded-full",
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
                    "h-11 sm:h-12 min-w-[10rem] px-5 sm:px-6",
                    "rounded-full border border-app bg-card/70 backdrop-blur",
                    "text-base sm:text-lg leading-none",
                ].join(" ")}
                aria-live="polite"
            >
                Page <span className="ml-2 font-semibold">{currentPage}</span>{" "}
                <span className="mx-2 text-subtle">of</span>
                <span className="font-semibold">{totalPages}</span>
            </span>


            <button
                type="button"
                onClick={onNext}
                disabled={atEnd}
                aria-label="Next page"
                className={[
                    "h-10 w-10 sm:h-11 sm:w-11 grid place-items-center rounded-full",
                    "border border-app bg-elevated hover:bg-elevated active:scale-[0.99]",
                    "focus:outline-none focus:ring-2 focus:ring-[color:var(--border)]",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                ].join(" ")}
            >
                <ChevronRight size={18} aria-hidden />
            </button>
        </div>
    );
};

export default Pagination;