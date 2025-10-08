import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fadeUp, slide, shake } from "./animations";
import ProgressDots from "./ProgressDots";

import SharedAccountStep from "@/components/signup/SharedAccountStep";
import ClientDetailsStep from "@/components/signup/ClientDetailsStep";
import ArtistDetailsStep from "@/components/signup/ArtistDetailsStep";
import ReviewStep from "@/components/signup/ReviewStep";
import OtpStep from "@/components/signup/OtpStep";

type Role = "client" | "artist";
type SharedAccount = { username: string; email: string; password: string };
type ClientProfile = { budget: string; location: string; placement: string; size: string; notes: string };
type ArtistProfile = { location: string; shop: string; years: string; baseRate: string; instagram: string; portfolio: string };

type Props = {
    showInfo: boolean;
    role: Role;
    setRole: (r: Role) => void;
    step: number;
    setStep: (n: number) => void;
    slides: readonly { key: string; valid: boolean }[];
    shared: SharedAccount;
    client: ClientProfile;
    artist: ArtistProfile;
    onSharedChange: React.ChangeEventHandler<HTMLInputElement>;
    onClientChange: React.ChangeEventHandler<HTMLInputElement>;
    onArtistChange: React.ChangeEventHandler<HTMLInputElement>;
    awaitingCode: boolean;
    code: string;
    setCode: (s: string) => void;
    loading: boolean;
    isLoaded: boolean;
    onNext: () => void;
    onBack: () => void;
    onStartVerification: () => void;
    onVerify: () => void;
    onPasswordVisibilityChange?: (hidden: boolean) => void;
};

export default function FormCard(props: Props) {
    const {
        showInfo, role, setRole, step, slides, shared, client, artist,
        onSharedChange, onClientChange, onArtistChange, awaitingCode,
        code, setCode, loading, isLoaded, onNext, onBack, onStartVerification, onVerify, onPasswordVisibilityChange,
    } = props;

    return (
        <motion.div
            layout
            className={`relative -ml-px p-[1px] ${showInfo ? "rounded-r-3xl rounded-l-none" : "rounded-3xl"}`}
            animate={{
                boxShadow: [
                    "0 0 0 1px rgba(255,255,255,0.10), 0 10px 40px -12px rgba(0,0,0,0.5)",
                    "0 0 0 1px rgba(255,255,255,0.18), 0 12px 46px -10px rgba(0,0,0,0.55)",
                    "0 0 0 1px rgba(255,255,255,0.10), 0 10px 40px -12px rgba(0,0,0,0.5)",
                ],
            }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{
                background:
                    "linear-gradient(135deg, rgba(255,255,255,0.35), rgba(255,255,255,0.12) 45%, rgba(255,255,255,0.06))",
            }}
        >
            <motion.div
                variants={shake}
                className={`bg-[#0b0b0b]/70 backdrop-blur-xl p-10 sm:p-12 ${showInfo ? "rounded-r-3xl rounded-l-none" : "rounded-3xl"}`}
            >
                <motion.div variants={fadeUp} className="mb-6 flex items-center justify-center gap-2 text-white/80">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">
                        <Sparkles className="h-4 w-4" />
                        <span>Join the Inkmity community</span>
                    </div>
                </motion.div>

                <div className="text-center">
                    <h1 className="text-4xl font-semibold text-white">Sign up</h1>
                    <p className="text-white/60 mt-3 text-base">A few quick signup to personalize your experience.</p>
                </div>

                <div className="mt-8">
                    <div className="mb-6">
                        <ProgressDots total={slides.length} current={step} showVerify={awaitingCode} />
                    </div>

                    <div className="relative overflow-hidden">
                        <AnimatePresence initial={false} mode="wait">
                            {!awaitingCode ? (
                                <motion.div
                                    key={slides[step].key}
                                    initial={{ x: 40, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -40, opacity: 0 }}
                                    transition={slide}
                                    className="grid gap-6"
                                >
                                    <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }}>
                                        {slides[step].key === "role" && (
                                            <SharedAccountStep
                                                role={role}
                                                setRole={setRole}
                                                shared={shared}
                                                onChange={onSharedChange}
                                                onPasswordVisibilityChange={onPasswordVisibilityChange}
                                            />
                                        )}
                                        {slides[step].key === "client-1" && <ClientDetailsStep client={client} onChange={onClientChange} />}
                                        {slides[step].key === "artist-1" && <ArtistDetailsStep artist={artist} onChange={onArtistChange} />}
                                        {slides[step].key === "review" && <ReviewStep role={role} shared={shared} client={client} artist={artist} />}
                                    </motion.div>

                                    <div className="flex items-center gap-4 mt-2">
                                        <Button type="button" onClick={onBack} disabled={step === 0} className="bg-white/10 hover:bg-white/20 text-white w-32 h-11 text-base rounded-xl">
                                            Back
                                        </Button>
                                        {step < slides.length - 1 && (
                                            <Button type="button" onClick={onNext} className="bg-white/15 hover:bg-white/25 text-white flex-1 h-11 text-base rounded-xl">
                                                Next
                                            </Button>
                                        )}
                                        {step === slides.length - 1 && (
                                            <Button
                                                type="button"
                                                onClick={onStartVerification}
                                                className="bg-white/15 hover:bg-white/25 text-white flex-1 h-11 text-base rounded-xl"
                                                disabled={loading || !isLoaded}
                                            >
                                                Send Verification Code
                                            </Button>
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="otp"
                                    initial={{ x: 40, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -40, opacity: 0 }}
                                    transition={slide}
                                    className="grid gap-6"
                                >
                                    <OtpStep code={code} setCode={setCode} onBack={() => window.history.back()} onVerify={onVerify} loading={loading || !isLoaded} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <p className="text-white/60 text-center text-sm mt-6">
                        Already have an account? <a href="/login" className="underline hover:opacity-80">Login</a>
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
}