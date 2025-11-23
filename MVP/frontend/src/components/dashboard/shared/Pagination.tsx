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
                className || "",
            ].join(" ")}
        >
            <div
                className="hidden md:flex justify-center items-center gap-2 text-app pointer-events-auto"
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
                    className={[
                        "h-[38px] w-[38px] flex items-center justify-center rounded-full leading-none",
                        "border-2 border-app bg-app text-bg hover:brightness-110 active:scale-[0.99]",
                        "focus:outline-none focus:ring-2 focus:ring-app",
                        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100",
                    ].join(" ")}
                >
                    <ChevronLeft size={30} aria-hidden className="block" />
                </button>

                <span
                    className={[
                        "inline-flex items-center justify-center",
                        "h-[38px] min-w-[10rem] px-6",
                        "rounded-full border-2 border-app bg-app text-bg",
                        "text-xl leading-none",
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
                        "h-[38px] w-[38px] flex items-center justify-center rounded-full leading-none",
                        "border-2 border-app bg-app text-bg hover:brightness-110 active:scale-[0.99]",
                        "focus:outline-none focus:ring-2 focus:ring-app",
                        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100",
                    ].join(" ")}
                >
                    <ChevronRight size={30} aria-hidden className="block" />
                </button>
            </div>

            <div className="md:hidden pointer-events-auto">
                <div
                    className="grid place-items-center w-full"
                    role="navigation"
                    aria-label="Pagination (mobile)"
                    style={{ minHeight: 48 }}
                >
                    <div className="flex flex-col items-center justify-center gap-2 text-app">
                        <button
                            type="button"
                            onClick={onNext}
                            disabled={atEnd}
                            aria-label="Next page"
                            className={[
                                "h-12 w-12 grid place-items-center rounded-full",
                                "border-2 border-app bg-app text-bg hover:brightness-110 active:scale-[0.99]",
                                "focus:outline-none focus:ring-2 focus:ring-app",
                                "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100",
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
