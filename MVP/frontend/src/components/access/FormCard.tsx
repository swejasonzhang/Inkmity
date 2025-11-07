import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shake } from "../../lib/animations";
import ProgressDots from "./ProgressDots";
import SharedAccountStep from "@/components/access/SharedAccountStep";
import ClientDetailsStep from "@/components/access/ClientDetailsStep";
import ArtistDetailsStep from "@/components/access/ArtistDetailsStep";
import ReviewStep from "@/components/access/ReviewStep";
import OtpStep from "@/components/access/OtpStep";
import SignupUpload from "@/components/upload/SignupUpload";

type Role = "client" | "artist";
type SharedAccount = { username: string; email: string; password: string };
type ClientProfile = { budgetMin: string; budgetMax: string; location: string; placement: string; size: string };
type ArtistProfile = {
  location: string;
  shop: string;
  years: string;
  baseRate: string;
  bookingPreference?: "open" | "waitlist" | "closed" | "referral" | "guest";
  travelFrequency?: "rare" | "sometimes" | "often" | "touring" | "guest_only";
  portfolio: string;
  styles: string[];
  bio?: string;
};

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
  onEmailBlur?: () => void;
  emailTaken?: boolean;
  clientRefs: string[];
  setClientRefs: (v: string[]) => void;
  artistPortfolioImgs: string[];
  setArtistPortfolioImgs: (v: string[]) => void;
  onCancelVerification: () => void;
  bio: string;
  onBioChange: React.ChangeEventHandler<HTMLTextAreaElement>;
};

type LoginProps = BaseProps & { mode: "login" };
type Props = SignupProps | LoginProps;

export default function FormCard(props: Props) {
  const { showInfo, hasError, titleOverride, subtitleOverride, children, className } = props;
  const isSignup = props.mode === "signup";
  const title = titleOverride ?? (isSignup ? "Sign up" : "Welcome Back!");
  const subtitle =
    subtitleOverride ??
    (isSignup ? "A few quick steps to personalize your experience." : "Login to continue exploring artists, styles, and your tattoo journey.");
  const isRoleSlide = isSignup && (props as SignupProps).slides[(props as SignupProps).step].key === "role";
  const disableNextForEmail = isRoleSlide && (props as SignupProps).emailTaken;
  const totalSteps = isSignup ? (props as SignupProps).slides.length + 1 : 0;
  const currentIndex = isSignup
    ? (props as SignupProps).awaitingCode
      ? (props as SignupProps).slides.length
      : (props as SignupProps).step
    : 0;

  return (
    <div className={`relative w-full ${className ?? ""}`}>
      <div className={`${showInfo ? "rounded-3xl md:rounded-r-3xl md:rounded-l-none" : "rounded-3xl"} w-full m-0 bg-[#0b0b0b]/80 border border-white/10 ring-1 ring-white/10 p-5 sm:p-6 h-full`}>
        <div className="h-full w-full flex flex-col gap-4">
          <div className="flex flex-col items-center text-center gap-1">
            <div className="text-white">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">
                <Sparkles className="h-3 w-3" />
                <span>{isSignup ? "Join the Inkmity community" : "Welcome to Inkmity"}</span>
              </div>
            </div>
            <div className="space-y-0.5">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white">{title}</h1>
              <p className="text-white/90 text-sm sm:text-base">{subtitle}</p>
            </div>
          </div>

          {isSignup ? (
            <div className="w-full flex flex-col">
              <div className="w-full px-0 sm:px-1 md:px-2 mb-3 sm:mb-4">
                <ProgressDots total={totalSteps} current={currentIndex} showVerify={(props as SignupProps).awaitingCode} />
              </div>

              <motion.div variants={shake} animate={hasError ? "error" : "idle"} className="w-full">
                <AnimatePresence initial={false} mode="wait">
                  {!(props as SignupProps).awaitingCode ? (
                    <motion.div
                      key={(props as SignupProps).slides[(props as SignupProps).step].key}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="w-full"
                    >
                      <div className="w-full">
                        {isRoleSlide && (
                          <div className="w-full">
                            <SharedAccountStep
                              role={(props as SignupProps).role}
                              setRole={(props as SignupProps).setRole}
                              shared={(props as SignupProps).shared}
                              onChange={(props as SignupProps).onSharedChange}
                              onPasswordVisibilityChange={props.onPasswordVisibilityChange}
                              onEmailBlur={(props as SignupProps).onEmailBlur}
                            />
                          </div>
                        )}

                        {(props as SignupProps).slides[(props as SignupProps).step].key === "client-1" && (
                          <ClientDetailsStep client={(props as SignupProps).client} onChange={(props as SignupProps).onClientChange} />
                        )}

                        {(props as SignupProps).slides[(props as SignupProps).step].key === "artist-1" && (
                          <ArtistDetailsStep artist={(props as SignupProps).artist} onChange={(props as SignupProps).onArtistChange} />
                        )}

                        {(props as SignupProps).slides[(props as SignupProps).step].key === "upload" &&
                          ((props as SignupProps).role === "client" ? (
                            <SignupUpload
                              label="Reference images (up to 3)"
                              kind="client_ref"
                              value={(props as SignupProps).clientRefs}
                              onChange={(props as SignupProps).setClientRefs}
                            />
                          ) : (
                            <SignupUpload
                              label="Portfolio highlights (up to 3)"
                              kind="artist_portfolio"
                              value={(props as SignupProps).artistPortfolioImgs}
                              onChange={(props as SignupProps).setArtistPortfolioImgs}
                            />
                          ))}

                        {(props as SignupProps).slides[(props as SignupProps).step].key === "review" && (
                          <ReviewStep
                            role={(props as SignupProps).role}
                            shared={(props as SignupProps).shared}
                            client={(props as SignupProps).client}
                            artist={(props as SignupProps).artist}
                            clientImages={(props as SignupProps).clientRefs}
                            artistImages={(props as SignupProps).artistPortfolioImgs}
                            bio={(props as SignupProps).bio}
                            onBioChange={(props as SignupProps).onBioChange}
                          />
                        )}
                      </div>

                      <div className="w-full mt-3 sm:mt-4 flex flex-col gap-2">
                        <Button
                          type="button"
                          onClick={(props as SignupProps).onBack}
                          disabled={(props as SignupProps).step === 0}
                          className="w-full bg-white/10 hover:bg-white/20 text-white h-11 text-sm rounded-xl"
                        >
                          Back
                        </Button>

                        {(props as SignupProps).step < (props as SignupProps).slides.length - 1 && (
                          <Button
                            type="button"
                            onClick={(props as SignupProps).onNext}
                            disabled={!!disableNextForEmail || (props as SignupProps).loading}
                            className={`w-full ${disableNextForEmail ? "bg-white/10 text-white/40 cursor-not-allowed" : "bg-white/15 hover:bg-white/25 text-white"} h-11 text-sm rounded-xl`}
                          >
                            Next
                          </Button>
                        )}

                        {(props as SignupProps).step === (props as SignupProps).slides.length - 1 && (
                          <Button
                            type="button"
                            onClick={(props as SignupProps).onStartVerification}
                            disabled={(props as SignupProps).loading || !(props as SignupProps).isLoaded || !!(props as SignupProps).emailTaken}
                            className="w-full bg-white/15 hover:bg-white/25 text-white h-11 text-sm rounded-xl"
                          >
                            Send Verification Code
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="otp" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="w-full">
                      <OtpStep
                        code={(props as SignupProps).code}
                        setCode={(props as SignupProps).setCode}
                        onVerify={(props as SignupProps).onVerify}
                        onBack={() => {
                          (props as SignupProps).setStep((props as SignupProps).slides.length - 1);
                          (props as SignupProps).onCancelVerification();
                        }}
                        loading={(props as SignupProps).loading || !(props as SignupProps).isLoaded}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          ) : (
            <div className="w-full">
              <motion.div variants={shake} animate={hasError ? "error" : "idle"} className="w-full">
                {children}
              </motion.div>
            </div>
          )}

          <div className="text-white/90 text-center text-xs sm:text-sm">
            {isSignup ? (
              <span>Already have an account? <a href="/login" className="underline hover:opacity-80">Login</a></span>
            ) : (
              <span>Don&apos;t have an account? <a href="/signup" className="underline hover:opacity-80">Sign Up</a></span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}