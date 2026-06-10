import React from "react";
import { m } from "framer-motion";
import { Link } from "react-router-dom";
import { useOnboarded } from "@/hooks/useOnboarded";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";

type HeroProps = {
    textFadeUp: any;
    prefersReduced: boolean;
    wc?: React.CSSProperties;
    onReveal: () => void;
};

const Hero: React.FC<HeroProps> = ({ prefersReduced, wc, textFadeUp, onReveal }) => {
    const { onboarded } = useOnboarded();
    const isOnboarded = onboarded === true;
    const findArtistTo = isOnboarded ? "/login" : "/signup";
    const gradientInitial = { backgroundPositionX: "100%" as const };
    const gradientAnimate  = { backgroundPositionX: "0%" as const };
    const gradientTransition = {
        backgroundPositionX: { duration: 2.2, ease: [0.22, 1, 0.36, 1], delay: 0.1 },
    } as const;

    return (
        <div className="text-center">
            <m.div
                variants={textFadeUp}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--elevated)] px-4 py-1.5 text-fluid-xs font-medium text-[color:var(--fg)]/60 mb-fluid-6"
                style={wc}
            >
                <MapPin className="h-3 w-3 opacity-60" />
                US-only · Active development · Launch coming soon
            </m.div>

            <h1 className="font-extrabold leading-[1.02] tracking-tight mb-fluid-4" style={wc}>
                <m.span
                    initial={gradientInitial}
                    {...(!prefersReduced && { animate: gradientAnimate })}
                    transition={gradientTransition}
                    className="block text-fluid-6xl bg-clip-text text-transparent bg-[linear-gradient(90deg,var(--fg)_0%,var(--fg)_50%,rgba(255,255,255,0.5)_100%)] bg-[length:200%_100%]"
                >
                    One place to discover,
                </m.span>
                <m.span
                    variants={textFadeUp}
                    className="block text-fluid-6xl text-[color:var(--fg)]"
                    style={wc}
                >
                    book, and earn.
                </m.span>
            </h1>

            <m.p
                variants={textFadeUp}
                className="text-fluid-lg text-[color:var(--fg)]/65 font-medium leading-relaxed max-w-2xl mx-auto mb-fluid-8"
                style={wc}
            >
                Find tattoo artists across the US by style, technique, and availability. Message with full context. Book with clear pricing. Earn rewards every time you sit.
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
