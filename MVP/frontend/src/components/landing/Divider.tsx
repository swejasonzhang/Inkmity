import React from "react";

const Divider: React.FC<{ className?: string }> = ({ className = "" }) => (
    <div className={`px-4 ${className}`}>
        <div className="mx-auto max-w-7xl">
            <div className="h-px w-full bg-[color:var(--border)]/80" />
        </div>
    </div>
);

export default Divider;