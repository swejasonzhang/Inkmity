import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { shake } from "../../lib/animations";

type Props = {
    showInfo: boolean;
    hasError?: boolean;
    titleOverride?: string;
    subtitleOverride?: string;
    children?: React.ReactNode;
    className?: string;
};

export default function LoginFormCard({ showInfo, hasError, titleOverride, subtitleOverride, children, className }: Props) {
    const title = titleOverride ?? "Welcome Back!";
    const subtitle = subtitleOverride ?? "Login to continue exploring artists, styles, and your tattoo journey.";

    return (
        <div className={`relative w-full ${className ?? ""}`}>
            <div className={`${showInfo ? "rounded-3xl md:rounded-r-3xl md:rounded-l-none" : "rounded-3xl"} w-full m-0 bg-[#0b0b0b]/80 border border-white/10 ring-1 ring-white/10 p-5 sm:p-6 h-full mx-auto`}>
                <div className="h-full w-full flex flex-col gap-5">
                    <div className="flex flex-col items-center text-center gap-1">
                        <div className="text-white">
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">
                                <Sparkles className="h-3 w-3" />
                                <span>Welcome to Inkmity</span>
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white">{title}</h1>
                            <p className="text-white/90 text-sm sm:text-base">{subtitle}</p>
                        </div>
                    </div>

                    <div className="w-full grid place-items-center">
                        <motion.div variants={shake} animate={hasError ? "error" : "idle"} className="w-full max-w-sm mx-auto">
                            {children}
                        </motion.div>
                    </div>

                    <div className="text-white/90 text-center text-xs sm:text-sm">
                        <span>Don&apos;t have an account? <a href="/signup" className="underline hover:opacity-80">Sign Up</a></span>
                    </div>
                </div>
            </div>
        </div>
    );
}