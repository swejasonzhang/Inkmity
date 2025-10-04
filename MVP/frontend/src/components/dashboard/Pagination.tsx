import React from "react";

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

    return (
        <div
            className={`flex justify-center items-center gap-3 sm:gap-4 mt-2 sm:mt-3 text-app ${className || ""}`}
        >
            <button
                className="px-3 py-2 sm:px-4 rounded border border-app bg-elevated text-app hover:bg-elevated active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPage === 1}
                onClick={onPrev}
            >
                Previous
            </button>

            <span className="text-sm sm:text-base text-app">
                Page {currentPage} of {totalPages}
            </span>

            <button
                className="px-3 py-2 sm:px-4 rounded border border-app bg-elevated text-app hover:bg-elevated active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPage === totalPages}
                onClick={onNext}
            >
                Next
            </button>
        </div>
    );
};

export default Pagination;