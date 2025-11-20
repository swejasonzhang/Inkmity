import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { shake } from "../../lib/animations";

type Props = {
    showInfo: boolean;
    hasError?: boolean;
    titleOverride?: string;
    subtitleOverride?: string;
    children?: React.ReactNode;
    className?: string;
    hideHeader?: boolean;
};

export default function LoginFormCard({ showInfo, hasError, titleOverride, subtitleOverride, children, className, hideHeader }: Props) {
    const { isSignedIn, isLoaded } = useAuth();
    
    const title = titleOverride ?? "Welcome Back!";
    const subtitle = subtitleOverride ?? "Login to continue exploring artists, styles, and your tattoo journey.";

    const shouldShowForm = isLoaded && !isSignedIn;
    const shouldRenderChildren = shouldShowForm || (children !== undefined && children !== null);
    const isShowingSuccess = !shouldShowForm && shouldRenderChildren;

    return (
        <motion.div 
            className={`relative w-full h-full flex flex-col ${className ?? ""}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <div className={`${isShowingSuccess ? "rounded-3xl" : showInfo ? "rounded-b-3xl md:rounded-tr-3xl md:rounded-br-3xl md:rounded-tl-none md:rounded-bl-none" : "rounded-3xl"} w-full m-0 bg-[#0b0b0b]/80 border border-white/10 ring-1 ring-white/10 p-4 sm:p-5 h-full mx-auto flex flex-col items-center justify-center overflow-hidden`}>
                {shouldShowForm ? (
                    <div className="w-full flex flex-col items-center justify-center gap-3">
                        {!hideHeader && (
                            <div className="flex flex-col items-center text-center gap-2 flex-shrink-0">
                                <div className="text-white">
                                    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">
                                        <Sparkles className="h-3 w-3" />
                                        <span>Welcome to Inkmity</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white">{title}</h1>
                                    <p className="text-white/90 text-xs sm:text-sm">{subtitle}</p>
                                </div>
                            </div>
                        )}

                        <div className="w-full grid place-items-center">
                            <motion.div variants={shake} animate={hasError ? "error" : "idle"} className="w-full max-w-sm mx-auto">
                                {children}
                            </motion.div>
                        </div>

                        {!hideHeader && (
                            <div className="text-white/90 text-center text-xs sm:text-sm flex-shrink-0">
                                <span>Don&apos;t have an account? <a href="/signup" className="underline hover:opacity-80">Sign Up</a></span>
                            </div>
                        )}
                    </div>
                ) : shouldRenderChildren ? (
                    <div className="h-full w-full">
                        {children}
                    </div>
                ) : null}
            </div>
        </motion.div>
    );
}