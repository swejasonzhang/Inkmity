import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSignUp, useClerk, useAuth } from "@clerk/clerk-react";
import type { SignUpResource } from "@clerk/types";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Building2, Loader2 } from "lucide-react";
import Header from "@/components/header/Header";
import VideoBackground from "@/components/VideoBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LegalLink from "@/components/legal/LegalModal";
import StudioLocationPicker, { type StudioLocation } from "@/components/studio/StudioLocationPicker";
import { validateEmail, validatePassword } from "@/lib/utils";
import { apiPost } from "@/api";
import { setCachedRole } from "@/lib/roleCache";
import { resetActivityTimer } from "@/hooks/useInactivityLogout";

export default function StudioSignup() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { signOut } = useClerk();
  const { getToken, userId } = useAuth();
  const navigate = useNavigate();

  const [studioName, setStudioName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState<StudioLocation>({ address: "", city: "" });
  const [password, setPassword] = useState("");
  const [attempt, setAttempt] = useState<SignUpResource | null>(null);
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const valid =
    !!studioName.trim() &&
    validateEmail(email) &&
    validatePassword(password) &&
    !!location.address.trim() &&
    agreedToTerms;

  const pwdMsg = password.length > 0 && !validatePassword(password) ? "Use at least 8 characters, including a number." : "";

  const buildProfile = () => ({
    studioName: studioName.trim(),
    city: location.city.trim(),
    address: location.address.trim(),
    lat: location.lat,
    lng: location.lng,
    placeId: location.placeId,
  });

  const start = async () => {
    if (!valid || !isLoaded || !signUp || loading) return;
    setLoading(true);
    try {
      if (userId) {
        try {
          await signOut();
        } catch {
        }
      }
      const unsafeMetadata = {
        role: "studio",
        displayName: studioName.trim(),
        email: email.trim().toLowerCase(),
        profile: buildProfile(),
      };
      const created = await signUp.create({
        emailAddress: email.trim().toLowerCase(),
        password,
        unsafeMetadata,
      } as any);
      setAttempt(created as SignUpResource);
      await created.prepareEmailAddressVerification({ strategy: "email_code" });
      setAwaitingCode(true);
    } catch (e: any) {
      const taken =
        e?.errors?.[0]?.code === "form_identifier_exists" ||
        /taken|already (exists|registered|in use)/i.test(
          e?.errors?.[0]?.message || e?.message || ""
        );
      toast.error(
        taken
          ? "That email is already registered. Try logging in instead."
          : e?.errors?.[0]?.message || e?.message || "Could not start signup"
      );
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (!code.trim() || !attempt || !isLoaded || !setActive || loading) return;
    setLoading(true);
    try {
      const result = await attempt.attemptEmailAddressVerification({
        code: code.trim(),
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        resetActivityTimer();
        const token = (await getToken()) ?? undefined;
        await apiPost(
          "/users/sync",
          {
            email: email.trim().toLowerCase(),
            role: "studio",
            username: studioName.trim(),
            profile: buildProfile(),
          },
          token
        );
        setCachedRole("studio");
        try {
          localStorage.setItem("trustedDevice", email);
          localStorage.setItem("lastLogin", Date.now().toString());
          localStorage.removeItem("logoutType");
        } catch {
        }
        toast.success("Studio account created");
        navigate("/studios", { replace: true });
        return;
      }
      toast.error("That code didn't work. Check your email and try again.");
    } catch (e: any) {
      try {
        await signOut();
      } catch {
      }
      toast.error(
        e?.errors?.[0]?.message || e?.message || "Verification failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-svh flex-col text-white">
      <VideoBackground />
      <ToastContainer
        position="top-center"
        theme="dark"
        newestOnTop
        closeOnClick
        hideProgressBar
        style={{ zIndex: 2147483647 }}
      />
      <Header />
      <main className="grid flex-1 place-items-center px-4 py-6">
        <div className="w-full max-w-md rounded-3xl border border-app bg-card p-6 sm:p-8 text-center">
          <div className="mb-5 flex items-center justify-center gap-2">
            <Building2 className="h-5 w-5 text-white" />
            <h1 className="text-lg font-bold text-white">Create a studio account</h1>
          </div>

          {!awaitingCode ? (
            <div className="flex flex-col gap-3">
              <div>
                <Label className="text-xs text-white/70">Studio name</Label>
                <Input
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  placeholder="Inkwell Tattoo Co."
                  className="mt-1 text-center text-white placeholder:text-white/50"
                />
              </div>
              <div>
                <Label className="text-xs text-white/70">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="studio@example.com"
                  className="mt-1 text-center text-white placeholder:text-white/50"
                />
              </div>
              <div className="text-left">
                <Label className="block text-center text-xs text-white/70 mb-1">Find your studio</Label>
                <StudioLocationPicker
                  value={location}
                  onChange={(next) => {
                    setLocation(next);
                    if (next.name) setStudioName(next.name);
                  }}
                />
              </div>
              <div>
                <Label className="text-xs text-white/70">Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="mt-1 text-center text-white placeholder:text-white/50"
                  aria-describedby={pwdMsg ? "studio-password-help" : undefined}
                />
                {pwdMsg && <p id="studio-password-help" className="mt-1 text-[10px] text-white text-center">{pwdMsg}</p>}
              </div>
              <div className="mt-1 flex items-start justify-center gap-2 text-[11px] text-white/70 select-none text-center">
                <input
                  id="studio-agree-terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-neutral-700 cursor-pointer"
                />
                <span>
                  <label htmlFor="studio-agree-terms" className="cursor-pointer">I agree to Inkmity's </label>
                  <LegalLink doc="terms">Terms of Service</LegalLink>
                  <label htmlFor="studio-agree-terms" className="cursor-pointer"> and </label>
                  <LegalLink doc="privacy">Privacy Policy</LegalLink>
                  <label htmlFor="studio-agree-terms" className="cursor-pointer">.</label>
                </span>
              </div>
              <Button
                disabled={!valid || loading}
                onClick={start}
                className="mt-2"
              >
                {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Continue
              </Button>
              <p className="mt-1 text-center text-[11px] text-white/70">
                You&apos;ll verify your business with Stripe and finish setup after
                signing in. Not a studio?{" "}
                <a href="/signup" className="underline">
                  Sign up as an artist or client
                </a>
                .
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-white/70">
                Enter the verification code we emailed to{" "}
                <span className="text-white">{email}</span>.
              </p>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                inputMode="numeric"
                onKeyDown={(e) => e.key === "Enter" && verify()}
                className="text-center text-white placeholder:text-white/50"
              />
              <Button disabled={!code.trim() || loading} onClick={verify}>
                {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Verify &amp; create studio
              </Button>
              <button
                onClick={() => setAwaitingCode(false)}
                className="text-center text-[11px] text-white/70 underline"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
