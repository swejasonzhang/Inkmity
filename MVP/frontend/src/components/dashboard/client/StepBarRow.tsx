import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export type StepBarRowProps = {
    active?: 0 | 1 | 2;
    onGoToStep?: (step: 0 | 1 | 2) => void;
    leftLabel?: string;
    onLeftClick?: () => void;
    rightLabel?: string;
    onRightClick?: () => void;
    centerHint?: string;
    prefersReducedMotion?: boolean;
    className?: string;
};

const StepBarRow: React.FC<StepBarRowProps> = ({
    active = 0,
    onGoToStep,
    leftLabel,
    onLeftClick,
    rightLabel,
    onRightClick,
    centerHint = "Scroll to explore the portfolio",
    prefersReducedMotion,
    className = "",
}) => {
    const sysReduced = useReducedMotion();
    const reduce = prefersReducedMotion ?? sysReduced;

    const computedLeftLabel = leftLabel ?? (active === 1 ? "Back: Portfolio" : undefined);

    const handleLeft =
        onLeftClick ??
        (() => {
            if (active === 1) onGoToStep?.(0);
            else if (active === 2) onGoToStep?.(1);
        });

    const computedRightLabel =
        rightLabel ??
        (active === 0
            ? "Next: Booking & Message"
            : active === 1
                ? "Next: Reviews"
                : "Back: Booking & Message");

    const handleRight =
        onRightClick ??
        (() => {
            if (active === 0) onGoToStep?.(1);
            else if (active === 1) onGoToStep?.(2);
            else if (active === 2) onGoToStep?.(1);
        });

    const preventMouseFocus: React.MouseEventHandler = e => e.preventDefault();
    const preventPointerFocus: React.PointerEventHandler = e => e.preventDefault();

    return (
        <div className={`col-span-3 flex items-center justify-between h-full w-full pt-6 sm:pt-14 pb-3 sm:pb-4 ${className}`}>
            <div className="flex items-center h-full">
                <div className="flex items-center gap-2 sm:gap-4">
                    {[0, 1, 2].map((i) => (
                        <button
                            key={i}
                            onClick={() => onGoToStep?.(i as 0 | 1 | 2)}
                            aria-label={i === 0 ? "Portfolio" : i === 1 ? "Booking & Message" : "Reviews"}
                            className="h-2.5 w-6 rounded-full transition-all"
                            style={{
                                backgroundColor:
                                    i === active
                                        ? "color-mix(in oklab, var(--fg) 95%, transparent)"
                                        : "color-mix(in oklab, var(--fg) 40%, transparent)",
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center h-full">
                <motion.div
                    initial={{ y: 0, opacity: 0.95 }}
                    animate={reduce ? {} : { y: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                    className="hidden sm:inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium shadow-sm min-h-[40px] sm:min-h-[44px]"
                    style={{
                        backgroundColor: "color-mix(in oklab, var(--elevated) 92%, transparent)",
                        color: "color-mix(in oklab, var(--fg) 90%, transparent)",
                    }}
                >
                    <ChevronDown className="h-4 w-4" />
                    <span>{centerHint}</span>
                </motion.div>
                <div className="sm:hidden h-[40px]" />
            </div>

            <div className="flex items-center justify-end h-full gap-2 sm:gap-3">
                {computedLeftLabel ? (
                    <Button
                        type="button"
                        onClick={handleLeft}
                        onMouseDown={preventMouseFocus}
                        onPointerDown={preventPointerFocus}
                        className="rounded-full px-3 sm:px-4 text-xs sm:text-sm font-medium shadow-sm border-0 min-h-[40px] sm:min-h-[44px]"
                        style={{ backgroundColor: "color-mix(in oklab, var(--elevated) 96%, transparent)", color: "var(--fg)" }}
                        variant="outline"
                    >
                        {computedLeftLabel}
                    </Button>
                ) : null}
                <Button
                    type="button"
                    onClick={handleRight}
                    onMouseDown={preventMouseFocus}
                    onPointerDown={preventPointerFocus}
                    className="rounded-full px-3 sm:px-4 text-xs sm:text-sm font-medium shadow-sm border-0 min-h-[40px] sm:min-h-[44px]"
                    style={{ backgroundColor: "color-mix(in oklab, var(--elevated) 96%, transparent)", color: "var(--fg)" }}
                    variant="outline"
                >
                    {computedRightLabel}
                </Button>
            </div>
        </div>
    );
};

export default StepBarRow;