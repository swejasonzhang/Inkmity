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
    (isSignup
      ? "A few quick steps to personalize your experience."
      : "Login to continue exploring artists, styles, and your tattoo journey.");
  const isRoleSlide = isSignup && (props as SignupProps).slides[(props as SignupProps).step].key === "role";
  const disableNextForEmail = isRoleSlide && (props as SignupProps).emailTaken;
  const totalSteps = isSignup ? (props as SignupProps).slides.length + 1 : 0;
  const currentIndex = isSignup
    ? (props as SignupProps).awaitingCode
      ? (props as SignupProps).slides.length
      : (props as SignupProps).step
    : 0;

  return (
    <div
      className={`relative md:-ml-px max-w-5xl h-full min-h-0 ${showInfo ? "rounded-3xl md:rounded-r-3xl md:rounded-l-none" : "rounded-3xl"
        } ${className ?? ""}`}
    >
      <div
        className={`bg-[#0b0b0b]/80 border border-white/10 px-5 py-6 sm:px-6 sm:py-8 md:p-10 md:py-12 ${showInfo ? "rounded-3xl md:rounded-r-3xl md:rounded-l-none" : "rounded-3xl"
          } h-full flex flex-col`}
      >
        <div className="mb-5 sm:mb-6">
          <div className="flex items-center justify-center gap-2 text-white/80">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm">
              <Sparkles className="h-4 w-4" />
              <span>{isSignup ? "Join the Inkmity community" : "Welcome to Inkmity"}</span>
            </div>
          </div>
          <div className="text-center mt-3">
            <h1 className="text-3xl sm:text-4xl font-semibold text-white">{title}</h1>
            <p className="text-white/60 mt-2 sm:mt-3 text-sm sm:text-base">{subtitle}</p>
          </div>
        </div>

        <div className="mt-2 sm:mt-4 flex-1 min-h-0 flex flex-col">
          {isSignup ? (
            <>
              <div className="mb-5 sm:mb-6">
                <ProgressDots
                  total={totalSteps}
                  current={currentIndex}
                  showVerify={(props as SignupProps).awaitingCode}
                />
              </div>

              <motion.div
                variants={shake}
                animate={hasError ? "error" : "idle"}
                className="relative h-full min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain"
              >
                <AnimatePresence initial={false} mode="wait">
                  {!(props as SignupProps).awaitingCode ? (
                    <motion.div
                      key={(props as SignupProps).slides[(props as SignupProps).step].key}
                      initial={{ x: 40, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -40, opacity: 0 }}
                      className={`min-w-0 break-words hyphens-auto ${isRoleSlide ? "w-full" : "grid gap-6"
                        }`}
                    >
                      <div className={`${isRoleSlide ? "w-full" : ""}`}>
                        {isRoleSlide && (
                          <div className="w-full max-w-none [&_*]:max-w-none">
                            <SharedAccountStep
                              role={(props as SignupProps).role}
                              setRole={(props as SignupProps).setRole}
                              shared={(props as SignupProps).shared}
                              onChange={(props as SignupProps).onSharedChange}
                              onPasswordVisibilityChange={props.onPasswordVisibilityChange}
                              onEmailBlur={(props as SignupProps).onEmailBlur}
                              bio={(props as SignupProps).bio}
                              onBioChange={(props as SignupProps).onBioChange}
                            />
                          </div>
                        )}

                        {(props as SignupProps).slides[(props as SignupProps).step].key === "client-1" && (
                          <ClientDetailsStep
                            client={(props as SignupProps).client}
                            onChange={(props as SignupProps).onClientChange}
                          />
                        )}

                        {(props as SignupProps).slides[(props as SignupProps).step].key === "artist-1" && (
                          <ArtistDetailsStep
                            artist={(props as SignupProps).artist}
                            onChange={(props as SignupProps).onArtistChange}
                          />
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
                          />
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mt-2">
                        <Button
                          type="button"
                          onClick={(props as SignupProps).onBack}
                          disabled={(props as SignupProps).step === 0}
                          className="bg-white/10 hover:bg-white/20 text-white h-11 text-base rounded-xl sm:w-32"
                        >
                          Back
                        </Button>

                        {(props as SignupProps).step < (props as SignupProps).slides.length - 1 && (
                          <Button
                            type="button"
                            onClick={(props as SignupProps).onNext}
                            disabled={!!disableNextForEmail || (props as SignupProps).loading}
                            className={`${disableNextForEmail
                              ? "bg-white/10 text-white/40 cursor-not-allowed"
                              : "bg-white/15 hover:bg-white/25 text-white"
                              } h-11 text-base rounded-xl sm:flex-1`}
                          >
                            Next
                          </Button>
                        )}

                        {(props as SignupProps).step === (props as SignupProps).slides.length - 1 && (
                          <Button
                            type="button"
                            onClick={(props as SignupProps).onStartVerification}
                            disabled={
                              (props as SignupProps).loading ||
                              !(props as SignupProps).isLoaded ||
                              !!(props as SignupProps).emailTaken
                            }
                            className="bg-white/15 hover:bg-white/25 text-white h-11 text-base rounded-xl sm:flex-1"
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
                      className="grid gap-6 min-w-0 break-words hyphens-auto"
                    >
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

              <p className="text-white text-center text-xs sm:text-sm mt-5 sm:mt-6">
                Already have an account?{" "}
                <a href="/login" className="underline hover:opacity-80">
                  Login
                </a>
              </p>
            </>
          ) : (
            <>
              <motion.div
                variants={shake}
                animate={hasError ? "error" : "idle"}
                className="relative min-w-0 break-words hyphens-auto"
              >
                {children}
              </motion.div>
              <p className="text-white/60 text-center text-xs sm:text-sm mt-5 sm:mt-6">
                Don&apos;t have an account?{" "}
                <a href="/signup" className="underline hover:opacity-80">
                  Sign Up
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}