import React from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export type ArtistWithGroups = {
    _id: string;
    clerkId?: string;
    username: string;
    bio?: string;
    pastWorks: string[];
    sketches?: string[];
};

type PortfolioProps = {
    artist: ArtistWithGroups;
    onNext?: () => void;
};

const ArtistPortfolio: React.FC<PortfolioProps> = ({ artist, onNext }) => {
    return (
        <div
            className="w-full"
            style={{ background: "var(--card)", color: "var(--fg)" }}
        >
            <div
                className="sticky top-0 z-10 flex items-center justify-between px-6 py-3"
                style={{
                    background: "color-mix(in oklab, var(--card) 92%, transparent)",
                    borderBottom: `1px solid var(--border)`,
                }}
            >
                <motion.div
                    initial={{ y: 0, opacity: 0.9 }}
                    animate={{ y: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shadow-sm"
                    style={{
                        background: "color-mix(in oklab, var(--elevated) 90%, transparent)",
                        color: "color-mix(in oklab, var(--fg) 90%, transparent)",
                        border: `1px solid var(--border)`,
                    }}
                >
                    <ChevronDown className="h-4 w-4" />
                    <span>Scroll down to see more images</span>
                </motion.div>
            </div>

            <Separator
                className="mt-0"
                style={{
                    background: "color-mix(in oklab, var(--fg) 18%, transparent)",
                }}
            />

            <div className="p-6 space-y-10 flex flex-col items-center text-center">
                <section className="space-y-3 w-full max-w-7xl">
                    <h3 className="text-lg font-semibold">About {artist.username}</h3>
                    <p style={{ color: "color-mix(in oklab, var(--fg) 85%, transparent)" }}>
                        {artist.bio || "No bio available"}
                    </p>

                    <Button
                        onClick={onNext}
                        className="rounded-lg px-4 py-2 text-sm font-medium"
                        style={{
                            background: "color-mix(in oklab, var(--elevated) 92%, transparent)",
                            color: "var(--fg)",
                            border: `1px solid var(--border)`,
                        }}
                        variant="outline"
                    >
                        Next: Booking &amp; Message
                    </Button>
                </section>

                <section className="space-y-4 w-full max-w-7xl">
                    <h3 className="text-lg font-semibold">Past Works</h3>
                    {artist.pastWorks?.length ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 place-items-stretch">
                            {artist.pastWorks.map((src, i) => (
                                <div key={`${src}-${i}`} className="w-full">
                                    <img
                                        src={src}
                                        alt={`Past work ${i + 1}`}
                                        className="w-full h-[260px] sm:h-[300px] md:h-[360px] lg:h-[420px] object-cover rounded-2xl border shadow-sm"
                                        style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p
                            className="text-sm"
                            style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}
                        >
                            No past works to show yet.
                        </p>
                    )}
                </section>

                {artist.sketches && artist.sketches.length > 0 && (
                    <section className="space-y-4 w-full max-w-7xl">
                        <h3 className="text-lg font-semibold">Upcoming Sketches &amp; Ideas</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 place-items-stretch">
                            {artist.sketches.map((src, i) => (
                                <div key={`${src}-${i}`} className="w-full">
                                    <img
                                        src={src}
                                        alt={`Sketch ${i + 1}`}
                                        className="w-full h-[240px] sm:h-[280px] md:h-[340px] lg:h-[400px] object-cover rounded-2xl border shadow-sm"
                                        style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default ArtistPortfolio;