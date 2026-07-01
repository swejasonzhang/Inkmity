import React from "react";
import { LazyMotion, domAnimation, MotionConfig, useReducedMotion, m } from "framer-motion";
import { Check, X, Minus } from "lucide-react";

type Cell = "yes" | "no" | "partial" | { text: string };
type Row = { label: string; inspiration: Cell; booking: Cell };

const ROWS: Row[] = [
    { label: "Discover artists & get inspired", inspiration: "yes", booking: "no" },
    { label: "Send a real booking brief", inspiration: "partial", booking: "partial" },
    { label: "Deposits + secure full payment", inspiration: "no", booking: "yes" },
    { label: "Verified check-in & no-show protection", inspiration: "no", booking: "no" },
    { label: "Waivers, health intake & 18+ built in", inspiration: "partial", booking: "partial" },
    { label: "100% of tips go to the artist", inspiration: "no", booking: "partial" },
    { label: "Aftercare & rebooking follow-up", inspiration: "no", booking: "partial" },
    { label: "Monthly fee", inspiration: { text: "Shop plans" }, booking: { text: "$$ / mo" } },
];

const INKMITY: Cell[] = ["yes", "yes", "yes", "yes", "yes", "yes", "yes", { text: "$0" }];

function Mark({ cell, strong = false }: { cell: Cell; strong?: boolean }) {
    if (typeof cell === "object") {
        return (
            <span className={`font-semibold text-sm ${strong ? "text-[color:var(--fg)]" : "text-[color:var(--fg)]/55"}`}>
                {cell.text}
            </span>
        );
    }
    if (cell === "yes") return <Check aria-label="Yes" className="mx-auto h-5 w-5 text-[color:var(--fg)]" />;
    if (cell === "partial") return <Minus aria-label="Partial" className="mx-auto h-5 w-5 text-[color:var(--fg)]/45" />;
    return <X aria-label="No" className="mx-auto h-[1.05rem] w-[1.05rem] text-[color:var(--fg)]/25" />;
}

const ComparisonTable: React.FC<{ textFadeUp: any; wc?: React.CSSProperties }> = ({ textFadeUp, wc }) => {
    const prefersReduced = useReducedMotion();

    return (
        <div className="mt-8 pt-8 border-t border-[color:var(--border)]/60">
            <LazyMotion features={domAnimation} strict>
                    <MotionConfig reducedMotion={prefersReduced ? "always" : "never"}>
                        <m.h3
                            variants={textFadeUp}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.5 }}
                            className="text-xl md:text-2xl font-bold tracking-tight text-center text-[color:var(--fg)]"
                            style={wc}
                        >
                            See it side by side
                        </m.h3>
                        <m.p
                            variants={textFadeUp}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.5 }}
                            className="mt-3 text-center text-[color:var(--fg)]/80 max-w-3xl mx-auto leading-relaxed"
                            style={wc}
                        >
                            Inspiration apps stop at ideas. Booking software only starts once you&rsquo;ve already found your artist. Inkmity is the one place for the whole journey.
                        </m.p>

                        <m.div
                            variants={textFadeUp}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.2 }}
                            className="mt-8 overflow-x-auto"
                            style={wc}
                        >
                            <table className="w-full border-collapse" style={{ minWidth: 560 }}>
                                <thead>
                                    <tr>
                                        <th className="text-left align-bottom pb-3 pr-3" />
                                        <th className="align-bottom pb-3 px-3 text-center">
                                            <div className="font-semibold text-sm text-[color:var(--fg)]/80">Inspiration apps</div>
                                            <div className="text-xs text-[color:var(--fg)]/45">discovery only</div>
                                        </th>
                                        <th className="align-bottom pb-3 px-3 text-center">
                                            <div className="font-semibold text-sm text-[color:var(--fg)]/80">Booking software</div>
                                            <div className="text-xs text-[color:var(--fg)]/45">tools, monthly fee</div>
                                        </th>
                                        <th className="align-bottom px-3 pt-3 pb-3 text-center rounded-t-2xl bg-[color:var(--fg)]/[0.06]">
                                            <div className="font-bold text-base text-[color:var(--fg)]">Inkmity</div>
                                            <div className="text-xs text-[color:var(--fg)]/55">the whole journey</div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ROWS.map((row, i) => (
                                        <tr key={row.label} className="border-t border-[color:var(--border)]/70">
                                            <td className="py-3 pr-3 text-sm sm:text-[0.95rem] text-[color:var(--fg)]/90">{row.label}</td>
                                            <td className="py-3 px-3 text-center"><Mark cell={row.inspiration} /></td>
                                            <td className="py-3 px-3 text-center"><Mark cell={row.booking} /></td>
                                            <td
                                                className={`py-3 px-3 text-center bg-[color:var(--fg)]/[0.06] ${i === ROWS.length - 1 ? "rounded-b-2xl" : ""}`}
                                            >
                                                <Mark cell={INKMITY[i]} strong />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </m.div>
                    </MotionConfig>
            </LazyMotion>
        </div>
    );
};

export default ComparisonTable;
