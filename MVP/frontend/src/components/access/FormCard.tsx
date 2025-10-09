import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fadeUp, slide, shake } from "./animations";
import ProgressDots from "./ProgressDots";
import SharedAccountStep from "@/components/access/SharedAccountStep";
import ClientDetailsStep from "@/components/access/ClientDetailsStep";
import ArtistDetailsStep from "@/components/access/ArtistDetailsStep";
import ReviewStep from "@/components/access/ReviewStep";
import OtpStep from "@/components/access/OtpStep";

type Role = "client" | "artist";
type SharedAccount = { firstName: string; lastName: string; email: string; password: string };
type ClientProfile = { budgetMin: string; budgetMax: string; location: string; placement: string; size: string; notes: string };
type ArtistProfile = { location: string; shop: string; years: string; baseRate: string; instagram: string; portfolio: string };

type BaseProps = {
  showInfo: boolean;
  onPasswordVisibilityChange?: (hidden: boolean) => void;
  hasError?: boolean;
  titleOverride?: string;
  subtitleOverride?: string;
  children?: React.ReactNode;
  className?: string;
};

type SignupProps = BaseProps & {
  mode: "signup";
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
};

type LoginProps = BaseProps & {
  mode: "login";
};

type Props = SignupProps | LoginProps;

export default function FormCard(props: Props) {
  const { showInfo, hasError, titleOverride, subtitleOverride, children, className } = props;
  const isSignup = props.mode === "signup";
  const title = titleOverride ?? (isSignup ? "Sign up" : "Welcome Back!");
  const subtitle =
    subtitleOverride ??
    (isSignup
      ? "A few quick steps to personalize your experience."
      : "Login to continue exploring artists, styles, and your tattoo journey.");

  return (
    <motion.div
      layout
      className={`relative md:-ml-px p-[1px] ${showInfo
        ? "rounded-3xl md:rounded-r-3xl md:rounded-l-none"
        : "rounded-3xl"
        } ${className ?? ""}`}
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
        animate={hasError ? "error" : "idle"}
        className={`bg-[#0b0b0b]/80 px-5 py-6 sm:px-6 sm:py-8 md:p-10 md:py-12 ${showInfo
          ? "rounded-3xl md:rounded-r-3xl md:rounded-l-none"
          : "rounded-3xl"
          } h-full`}
      >
        <motion.div variants={fadeUp} className="mb-5 sm:mb-6 flex items-center justify-center gap-2 text-white/80">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm">
            <Sparkles className="h-4 w-4" />
            <span>{isSignup ? "Join the Inkmity community" : "Welcome to Inkmity"}</span>
          </div>
        </motion.div>

        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold text-white">{title}</h1>
          <p className="text-white/60 mt-2 sm:mt-3 text-sm sm:text-base">{subtitle}</p>
        </div>

        <div className="mt-6 sm:mt-8">
          {isSignup ? (
            <>
              <div className="mb-5 sm:mb-6">
                <ProgressDots total={props.slides.length} current={props.step} showVerify={props.awaitingCode} />
              </div>
              <div className="relative overflow-hidden">
                <AnimatePresence initial={false} mode="wait">
                  {!props.awaitingCode ? (
                    <motion.div
                      key={props.slides[props.step].key}
                      initial={{ x: 40, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -40, opacity: 0 }}
                      transition={slide}
                      className="grid gap-6"
                    >
                      <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }}>
                        {props.slides[props.step].key === "role" && (
                          <SharedAccountStep
                            role={props.role}
                            setRole={props.setRole}
                            shared={props.shared}
                            onChange={props.onSharedChange}
                            onPasswordVisibilityChange={props.onPasswordVisibilityChange}
                          />
                        )}
                        {props.slides[props.step].key === "client-1" && (
                          <ClientDetailsStep client={props.client} onChange={props.onClientChange} />
                        )}
                        {props.slides[props.step].key === "artist-1" && (
                          <ArtistDetailsStep artist={props.artist} onChange={props.onArtistChange} />
                        )}
                        {props.slides[props.step].key === "review" && (
                          <ReviewStep role={props.role} shared={props.shared} client={props.client} artist={props.artist} />
                        )}
                      </motion.div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mt-2">
                        <Button
                          type="button"
                          onClick={props.onBack}
                          disabled={props.step === 0}
                          className="bg-white/10 hover:bg-white/20 text-white h-11 text-base rounded-xl sm:w-32"
                        >
                          Back
                        </Button>

                        {props.step < props.slides.length - 1 && (
                          <Button
                            type="button"
                            onClick={props.onNext}
                            className="bg-white/15 hover:bg-white/25 text-white h-11 text-base rounded-xl sm:flex-1"
                          >
                            Next
                          </Button>
                        )}

                        {props.step === props.slides.length - 1 && (
                          <Button
                            type="button"
                            onClick={props.onStartVerification}
                            className="bg-white/15 hover:bg-white/25 text-white h-11 text-base rounded-xl sm:flex-1"
                            disabled={props.loading || !props.isLoaded}
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
                      <OtpStep
                        code={props.code}
                        setCode={props.setCode}
                        onBack={() => window.history.back()}
                        onVerify={props.onVerify}
                        loading={props.loading || !props.isLoaded}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <p className="text-white/60 text-center text-xs sm:text-sm mt-5 sm:mt-6">
                Already have an account? <a href="/login" className="underline hover:opacity-80">Login</a>
              </p>
            </>
          ) : (
            <>
              <div className="relative">{children}</div>
              <p className="text-white/60 text-center text-xs sm:text-sm mt-5 sm:mt-6">
                Don&apos;t have an account? <a href="/signup" className="underline hover:opacity-80">Sign Up</a>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}