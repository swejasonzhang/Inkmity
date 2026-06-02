import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { shake } from "@/lib/animations";
import ProgressDots from "@/components/access/ProgressDots";
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
  className?: string;
  invalidFields?: string[];
  flashToken?: number;
  success?: boolean;
  successHeading?: string;
  successSubtitle?: string;
};

type SignupProps = BaseProps & {
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
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
};

export default function SignupFormCard(props: SignupProps) {
  const {
    showInfo,
    hasError,
    className,
    role,
    setRole,
    step,
    setStep,
    slides,
    shared,
    client,
    artist,
    onSharedChange,
    onClientChange,
    onArtistChange,
    awaitingCode,
    code,
    setCode,
    loading,
    isLoaded,
    onNext,
    onBack,
    onStartVerification,
    onVerify,
    onPasswordVisibilityChange,
    onEmailBlur,
    emailTaken,
    clientRefs,
    setClientRefs,
    artistPortfolioImgs,
    setArtistPortfolioImgs,
    onCancelVerification,
    bio,
    onBioChange,
    invalidFields,
    flashToken,
    success,
    successHeading,
    successSubtitle,
    confirmPassword,
    setConfirmPassword
  } = props;

  const { isSignedIn, isLoaded: authLoaded } = useAuth();

  const shouldShowForm = authLoaded && !isSignedIn;

  if (success) {
    return (
      <motion.div 
        className={`relative w-full ${className ?? ""}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="rounded-3xl w-full m-0 bg-card border border-app p-5 sm:p-6 h-full mx-auto">
          <div className="w-full h-full flex items-center justify-center min-h-[560px] md:min-h-[680px]">
            <div className="ink-success-wrap flex flex-col items-center justify-center gap-8 py-16">
              <div className="ink-spinner" />
              <div className="text-center space-y-2">
                <div className="text-app text-2xl md:text-3xl font-semibold">{successHeading || "Signup Successful!"}</div>
                <div className="text-subtle text-base md:text-lg">
                  {successSubtitle || "Redirecting to Dashboard"}
                  <span className="ink-dots" aria-hidden="true">
                    <span className="ink-dot" />
                    <span className="ink-dot" />
                    <span className="ink-dot" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!shouldShowForm && !success) {
    return (
      <motion.div 
        className={`relative w-full ${className ?? ""}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className={`${showInfo ? "rounded-b-3xl md:rounded-tr-3xl md:rounded-br-3xl md:rounded-tl-none md:rounded-bl-none" : "rounded-3xl"} w-full m-0 bg-card border border-app p-5 sm:p-6 h-full mx-auto`}>
        </div>
      </motion.div>
    );
  }

  const isRoleSlide = slides[step].key === "role";
  const disableNextForEmail = isRoleSlide && emailTaken;
  const totalSteps = slides.length + 1;
  const currentIndex = awaitingCode ? slides.length : step;

  return (
    <motion.div
      className={`relative w-full h-full flex flex-col ${className ?? ""}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className={`${showInfo ? "rounded-b-3xl md:rounded-tr-3xl md:rounded-br-3xl md:rounded-tl-none md:rounded-bl-none" : "rounded-3xl"} w-full m-0 bg-card border border-app p-5 sm:p-6 h-full mx-auto flex items-center justify-center`}>
        <div className="w-full flex flex-col items-center justify-center gap-3">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-app/40 bg-elevated px-3 py-1 text-xs text-app/70">
              <Sparkles className="h-3 w-3" />
              <span>Join the Inkmity community</span>
            </div>
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-app">Sign up</h1>
              <p className="text-subtle text-xs sm:text-sm">A few quick steps to personalize your experience.</p>
            </div>
          </div>
          <div className="w-full flex flex-col">
            <div className="w-full px-0 sm:px-1 md:px-2 mb-3 sm:mb-4">
              <ProgressDots total={totalSteps} current={currentIndex} showVerify={awaitingCode} />
            </div>
            <motion.div variants={shake} animate={hasError ? "error" : "idle"} className="w-full">
              <AnimatePresence initial={false} mode="wait">
                {!awaitingCode ? (
                  <motion.div key={slides[step].key} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="w-full">
                    <div className="w-full">
                      {isRoleSlide && (
                        <div className="w-full">
                          <SharedAccountStep
                            role={role}
                            setRole={setRole}
                            shared={shared}
                            onChange={onSharedChange}
                            onPasswordVisibilityChange={onPasswordVisibilityChange}
                            onEmailBlur={onEmailBlur}
                            invalidFields={invalidFields}
                            flashToken={flashToken}
                            confirmPassword={confirmPassword}
                            setConfirmPassword={setConfirmPassword}
                          />
                        </div>
                      )}
                      {slides[step].key === "client-1" && <ClientDetailsStep client={client} onChange={onClientChange} />}
                      {slides[step].key === "artist-1" && <ArtistDetailsStep artist={artist} onChange={onArtistChange} />}
                      {slides[step].key === "upload" &&
                        (role === "client" ? (
                          <SignupUpload label="Reference images (up to 3)" kind="client_ref" value={clientRefs} onChange={setClientRefs} />
                        ) : (
                          <SignupUpload label="Portfolio highlights (up to 3)" kind="artist_portfolio" value={artistPortfolioImgs} onChange={setArtistPortfolioImgs} />
                        ))}
                      {slides[step].key === "review" && (
                        <ReviewStep role={role} shared={shared} client={client} artist={artist} clientImages={clientRefs} artistImages={artistPortfolioImgs} bio={bio} onBioChange={onBioChange} />
                      )}
                    </div>
                    <div className={`w-full mt-3 sm:mt-4 flex flex-row gap-2`}>
                      {step > 0 && (
                        <Button type="button" onClick={onBack} className="flex-1 bg-elevated border border-app text-app hover:bg-elevated/70 h-11 text-sm rounded-xl">
                          Back
                        </Button>
                      )}
                      {step < slides.length - 1 && (
                        <Button
                          type="button"
                          onClick={onNext}
                          disabled={!!disableNextForEmail || loading}
                          className={`${step === 0 ? "w-full" : "flex-1"} ${disableNextForEmail ? "bg-elevated text-app/40 cursor-not-allowed" : "bg-neutral-700 text-white hover:bg-neutral-600"} h-11 text-sm rounded-xl font-semibold`}
                        >
                          Next
                        </Button>
                      )}
                      {step === slides.length - 1 && (
                        <Button type="button" onClick={onStartVerification} disabled={loading || !isLoaded || !!emailTaken} className="flex-1 bg-neutral-700 text-white hover:bg-neutral-600 h-11 text-sm rounded-xl font-semibold">
                          {loading ? "Sending..." : "Send Verification Code"}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="otp" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="w-full">
                    <OtpStep
                      code={code}
                      setCode={setCode}
                      onVerify={onVerify}
                      onBack={() => {
                        setStep(slides.length - 1);
                        onCancelVerification();
                      }}
                      loading={loading || !isLoaded}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
          <div className="text-subtle text-center text-xs sm:text-sm">
            <span>Already have an account? <a href="/login" className="underline text-app hover:opacity-80">Login</a></span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}