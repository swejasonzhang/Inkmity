import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSignUp, useClerk, useAuth } from "@clerk/clerk-react";
import type { SignUpResource } from "@clerk/types";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Building2, Loader2 } from "lucide-react";
import Header from "@/components/header/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [attempt, setAttempt] = useState<SignUpResource | null>(null);
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const valid =
    !!studioName.trim() &&
    validateEmail(email) &&
    validatePassword(password) &&
    password === confirm;

  const start = async () => {
    if (!valid || !isLoaded || !signUp || loading) return;
    setLoading(true);
    try {
      if (userId) {
        try {
          await signOut();
        } catch {
          /* ignore stale session */
        }
      }
      const unsafeMetadata = {
        role: "studio",
        displayName: studioName.trim(),
        email: email.trim().toLowerCase(),
        profile: { studioName: studioName.trim(), city: city.trim() },
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
            profile: { studioName: studioName.trim(), city: city.trim() },
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
    <div className="relative flex h-svh flex-col text-app">
      <div id="clerk-captcha" />
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
        <div className="w-full max-w-md rounded-3xl border border-app bg-card p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-app" />
            <h1 className="text-lg font-bold text-app">Create a studio account</h1>
          </div>

          {!awaitingCode ? (
            <div className="flex flex-col gap-3">
              <div>
                <Label className="text-xs text-muted">Studio name</Label>
                <Input
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  placeholder="Inkwell Tattoo Co."
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="studio@example.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted">City (optional)</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="New York, NY"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted">Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted">Confirm password</Label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                disabled={!valid || loading}
                onClick={start}
                className="mt-2"
              >
                {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Continue
              </Button>
              <p className="mt-1 text-center text-[11px] text-muted">
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
              <p className="text-sm text-muted">
                Enter the verification code we emailed to{" "}
                <span className="text-app">{email}</span>.
              </p>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                inputMode="numeric"
                onKeyDown={(e) => e.key === "Enter" && verify()}
              />
              <Button disabled={!code.trim() || loading} onClick={verify}>
                {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Verify &amp; create studio
              </Button>
              <button
                onClick={() => setAwaitingCode(false)}
                className="text-center text-[11px] text-muted underline"
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
