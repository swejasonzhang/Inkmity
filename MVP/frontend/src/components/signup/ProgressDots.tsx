import { motion } from "framer-motion";

export default function ProgressDots({ total, current, showVerify }: { total: number; current: number; showVerify?: boolean }) {
    return (
        <div className="flex items-center justify-between text-xs text-white/70">
            <div className="flex items-center gap-2">
                {Array.from({ length: total }).map((_, i) => (
                    <motion.div
                        key={i}
                        className="h-2.5 w-2.5 rounded-full"
                        animate={{ scale: current === i ? [1, 1.2, 1] : 1 }}
                        transition={{ duration: 0.5 }}
                        style={{ background: current >= i ? "rgb(255 255 255 / 1)" : "rgb(255 255 255 / 0.3)" }}
                    />
                ))}
                {showVerify && <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />}
            </div>
            <span className="text-white/50">{showVerify ? "Verify" : `Step ${current + 1} of ${total}`}</span>
        </div>
    );
}