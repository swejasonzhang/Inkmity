import React from "react";

type Props = {
    currentPage: number;
    totalPages: number;
    onPrev: () => void;
    onNext: () => void;
    className?: string;
};

const Pagination: React.FC<Props> = ({ currentPage, totalPages, onPrev, onNext, className }) => {
    if (totalPages <= 1) return null;

    return (
        <div className={`flex justify-center items-center gap-3 sm:gap-4 mt-2 sm:mt-3 ${className || ""}`}>
            <button
                className="px-3 py-2 sm:px-4 bg-gray-700 text-white rounded disabled:opacity-50"
                disabled={currentPage === 1}
                onClick={onPrev}
            >
                Previous
            </button>
            <span className="text-gray-300 text-sm sm:text-base">
                Page {currentPage} of {totalPages}
            </span>
            <button
                className="px-3 py-2 sm:px-4 bg-gray-700 text-white rounded disabled:opacity-50"
                disabled={currentPage === totalPages}
                onClick={onNext}
            >
                Next
            </button>
        </div>
    );
};

export default Pagination;