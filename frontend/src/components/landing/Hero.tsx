import React from "react";
import { m } from "framer-motion";
import { Link } from "react-router-dom";
import { useOnboarded } from "@/hooks/useOnboarded";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

type HeroProps = {
    textFadeUp: any;
    prefersReduced: boolean;
    wc?: React.CSSProperties;
    onReveal: () => void;
};

const Hero: React.FC<HeroProps> = ({ wc, textFadeUp, onReveal }) => {
    const { onboarded } = useOnboarded();
    const isOnboarded = onboarded === true;
    const findArtistTo = isOnboarded ? "/login" : "/signup";

    return (
        <div className="text-center">
            <h1 className="font-extrabold leading-[1.02] tracking-tight mb-fluid-4" style={wc}>
                <m.span variants={textFadeUp} className="block text-fluid-6xl text-[color:var(--fg)]" style={wc}>
                    One place to discover,
                </m.span>
                <m.span variants={textFadeUp} className="block text-fluid-6xl text-[color:var(--fg)]" style={wc}>
                    book, and earn.
                </m.span>
            </h1>

            <m.p
                variants={textFadeUp}
                className="text-fluid-lg text-[color:var(--fg)]/65 font-medium leading-relaxed max-w-2xl mx-auto mb-fluid-8"
                style={wc}
            >
                Find tattoo artists across the US by style and availability. Talk through every reference, lock in your slot, and earn as you go.
            </m.p>

            <m.div variants={textFadeUp} className="flex-center flex-wrap gap-fluid-sm mb-fluid-4" style={wc}>
                <Button
                    asChild
                    className="rounded-xl px-fluid-md py-3 h-auto text-fluid-base font-semibold bg-[color:var(--fg)] text-[color:var(--bg)] hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-[color:var(--fg)]/30"
                >
                    <Link to={findArtistTo} aria-label={isOnboarded ? "Go to your dashboard" : "Create your Inkmity account"}>
                        Find your artist
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
                <Button
                    asChild
                    variant="outline"
                    className="rounded-xl px-fluid-md py-3 h-auto text-fluid-base font-semibold border border-[color:var(--border)] bg-[color:var(--card)]/70 text-[color:var(--fg)] hover:bg-[color:var(--card)] transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--border)]/40"
                >
                    <Link to="/login" aria-label="Sign in to your account">Sign in</Link>
                </Button>
            </m.div>

            <m.button
                variants={textFadeUp}
                type="button"
                onClick={onReveal}
                className="inline-flex items-center gap-2 text-fluid-xs text-[color:var(--fg)]/40 hover:text-[color:var(--fg)]/65 transition-colors font-medium"
                style={wc}
                aria-label="Scroll to learn more"
            >
                Scroll to explore
                <span className="inline-grid h-5 w-5 place-items-center rounded-full border border-[color:var(--border)]/50">
                    <span className="text-[10px] leading-none">↓</span>
                </span>
            </m.button>

            <m.div
                variants={textFadeUp}
                className="mx-auto mt-fluid-8 h-px w-32 sm:w-48 md:w-64 bg-gradient-to-r from-transparent via-[color:var(--border)] to-transparent"
                style={wc}
            />
        </div>
    );
};

export default Hero;
