import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type StepBarRowProps = {
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
    centerHint = "Scroll to explore the portfolio",
    prefersReducedMotion,
    className = "",
}) => {
    const sysReduced = useReducedMotion();
    const reduce = prefersReducedMotion ?? sysReduced;

    const prevDisabled = active === 0;
    const nextDisabled = active === 2;
    const handlePrev = () => { if (!prevDisabled) onGoToStep?.((active - 1) as 0 | 1 | 2); };
    const handleNext = () => { if (!nextDisabled) onGoToStep?.((active + 1) as 0 | 1 | 2); };

    const preventMouseFocus: React.MouseEventHandler = e => e.preventDefault();
    const preventPointerFocus: React.PointerEventHandler = e => e.preventDefault();

    return (
        <div className={`col-span-3 grid items-center h-full w-full py-2.5 ${className}`} style={{ gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)" }}>
            <div className="flex items-center h-full justify-self-start">
                <div className="flex items-center gap-1.5 sm:gap-3">
                    {[0, 1, 2].map((i) => (
                        <button
                            key={i}
                            onClick={() => onGoToStep?.(i as 0 | 1 | 2)}
                            aria-label={i === 0 ? "Portfolio" : i === 1 ? "Booking & Message" : "Reviews"}
                            className="h-2 w-5 rounded-full transition-all"
                            style={{
                                backgroundColor:
                                    i === active
                                        ? "color-mix(in srgb, var(--fg) 95%, transparent)"
                                        : "color-mix(in srgb, var(--fg) 40%, transparent)",
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-center h-full justify-self-center">
                <motion.div
                    initial={{ y: 0, opacity: 0.95 }}
                    animate={reduce ? {} : { y: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                    className="hidden sm:inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium shadow-sm min-h-[34px] sm:min-h-[36px]"
                    style={{
                        backgroundColor: "color-mix(in srgb, var(--elevated) 92%, transparent)",
                        color: "color-mix(in srgb, var(--fg) 90%, transparent)",
                    }}
                >
                    <ChevronDown className="h-4 w-4" />
                    <span>{centerHint}</span>
                </motion.div>
                <div className="sm:hidden h-[34px]" />
            </div>

            <div className="flex items-center justify-end h-full gap-2 justify-self-end">
                <Button
                    type="button"
                    onClick={handlePrev}
                    disabled={prevDisabled}
                    onMouseDown={preventMouseFocus}
                    onPointerDown={preventPointerFocus}
                    className="w-[4.75rem] sm:w-[5.75rem] justify-center gap-1 rounded-full px-2 text-xs sm:text-[13px] font-semibold shadow-sm border-0 min-h-[34px] sm:min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "color-mix(in srgb, var(--elevated) 96%, transparent)", color: "var(--fg)" }}
                    variant="outline"
                    aria-label="Previous step"
                >
                    <ChevronLeft className="h-3.5 w-3.5" /> Back
                </Button>
                <Button
                    type="button"
                    onClick={handleNext}
                    disabled={nextDisabled}
                    onMouseDown={preventMouseFocus}
                    onPointerDown={preventPointerFocus}
                    className="w-[4.75rem] sm:w-[5.75rem] justify-center gap-1 rounded-full px-2 text-xs sm:text-[13px] font-semibold shadow-sm border-0 min-h-[34px] sm:min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "color-mix(in srgb, var(--elevated) 96%, transparent)", color: "var(--fg)" }}
                    variant="outline"
                    aria-label="Next step"
                >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
};

export default StepBarRow;