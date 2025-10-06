import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useSignUp, useUser, useClerk, useAuth } from "@clerk/clerk-react";
import FormInput from "@/components/dashboard/FormInput";
import Header from "@/components/header/Header";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { validateEmail, validatePassword } from "@/utils/validation";
import CircularProgress from "@mui/material/CircularProgress";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

const LOGOUT_TYPE_KEY = "logoutType";
const LOGIN_TIMESTAMP_KEY = "lastLogin";

const SignUp: React.FC = () => {
  const [form, setForm] = useState({ email: "", password: "", code: "", role: "client" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [signUpAttempt, setSignUpAttempt] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);

  const navigate = useNavigate();
  const { signUp, setActive } = useSignUp();
  const { signOut } = useClerk();
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const logoutType = localStorage.getItem(LOGOUT_TYPE_KEY);
    const lastLogin = localStorage.getItem(LOGIN_TIMESTAMP_KEY);
    if (isSignedIn && !awaitingCode) {
      const within3Days =
        lastLogin && Date.now() - parseInt(lastLogin, 10) <= 3 * 24 * 60 * 60 * 1000;
      if (within3Days && logoutType !== "manual") {
        toast.info("You are already signed in! Redirecting to dashboard...", {
          position: "top-center",
          theme: "dark",
        });
        const t = setTimeout(() => navigate("/dashboard"), 2000);
        return () => clearTimeout(t);
      }
    }
  }, [isSignedIn, navigate, awaitingCode]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const syncUserToBackend = async (role: "client" | "artist") => {
    const token = await getToken();
    const clerkId = user?.id ?? undefined;
    const payload: any = {
      clerkId,
      email: form.email,
      role,
      username: form.email.split("@")[0],
    };
    const res = await fetch("http://localhost:5005/api/users/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Sync failed ${res.status}: ${t}`);
    }
    return res.json();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const emailOk = validateEmail(form.email);
    const pwOk = validatePassword(form.password);
    const codeOk = !awaitingCode || !!form.code;

    if (!emailOk || !pwOk || !codeOk) {
      if (!emailOk) toast.error("Please enter a valid email", { position: "top-center", theme: "dark" });
      if (!pwOk) toast.error("Password must be 6+ chars, uppercase & number", { position: "top-center", theme: "dark" });
      if (!codeOk) toast.error("Enter the verification code", { position: "top-center", theme: "dark" });
      return;
    }

    setLoading(true);
    try {
      await signOut();

      if (!signUp) {
        toast.error("Signup unavailable", { position: "top-center", theme: "dark" });
        setLoading(false);
        return;
      }

      if (!awaitingCode) {
        const attempt = await signUp.create({
          emailAddress: form.email,
          password: form.password,
          publicMetadata: { role: form.role },
        } as any);
        await attempt.prepareEmailAddressVerification();
        setSignUpAttempt(attempt);
        setAwaitingCode(true);
        toast.info("Verification code sent to your email!", { position: "top-center", theme: "dark" });
      } else {
        const result = await signUpAttempt.attemptEmailAddressVerification({ code: form.code });
        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId });
          localStorage.setItem("trustedDevice", form.email);
          localStorage.setItem(LOGIN_TIMESTAMP_KEY, Date.now().toString());
          localStorage.removeItem(LOGOUT_TYPE_KEY);

          setTimeout(async () => {
            try {
              await syncUserToBackend(form.role as "client" | "artist");
              toast.success("Signup successful! Redirecting...", { position: "top-center", theme: "dark" });
              navigate("/dashboard");
            } catch (syncErr: any) {
              console.error(syncErr);
              toast.error(
                "Signed up but failed to sync user. You can continue, but some features may be limited.",
                { position: "top-center", theme: "dark" }
              );
              navigate("/dashboard");
            }
          }, 250);
        } else {
          toast.error("Verification failed. Check your code and try again.", {
            position: "top-center",
            theme: "dark",
          });
        }
      }
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message || err.message || "An unexpected error occurred", {
        position: "top-center",
        theme: "dark",
      });
    } finally {
      setLoading(false);
    }
  };

  const emailInvalid = submitted && !validateEmail(form.email);
  const pwInvalid = submitted && !validatePassword(form.password);
  const codeInvalid = submitted && awaitingCode && !form.code;

  return (
    <div className="relative min-h-dvh bg-app text-app flex flex-col">
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="fixed inset-0 z-0 h-full w-full object-cover pointer-events-none"
        aria-hidden
      >
        <source src="/Background.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 -z-10 bg-black/50" />

      <Header disableDashboardLink />

      <main className="flex-1 grid place-items-center px-4 py-8">
        <motion.div
          className="w-full max-w-md p-8 mx-4 rounded-2xl border border-app bg-elevated backdrop-blur flex flex-col items-center justify-center min-h-[500px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <AnimatePresence>
            {pageLoading && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center rounded-2xl bg-elevated"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <CircularProgress sx={{ color: "#ffffff" }} />
              </motion.div>
            )}
          </AnimatePresence>

          {!pageLoading && (
            <motion.div className="flex flex-col w-full">
              <h1 className="text-3xl font-bold text-center mb-4">Welcome!</h1>
              <p className="text-subtle text-center mb-6 text-sm sm:text-base">
                Sign up to discover tattoo artists, explore styles, and start your personalized tattoo journey.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <FormInput
                    type="email"
                    name="email"
                    value={form.email}
                    placeholder="Email"
                    onChange={handleChange}
                    isValid={!emailInvalid}
                    message={
                      !form.email
                        ? "Enter your email"
                        : validateEmail(form.email)
                          ? "Valid email address"
                          : "Enter a valid email address"
                    }
                  />
                  {emailInvalid && <p className="mt-1 text-red-400 text-sm">Please enter a valid email.</p>}
                </div>

                <div>
                  <FormInput
                    type="password"
                    name="password"
                    value={form.password}
                    placeholder="Password"
                    onChange={handleChange}
                    showPasswordToggle
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword(!showPassword)}
                    isValid={!pwInvalid}
                    message={
                      validatePassword(form.password)
                        ? "Valid password"
                        : "Must be 6+ chars, uppercase & number"
                    }
                  />
                  {pwInvalid && (
                    <p className="mt-1 text-red-400 text-sm">Password must be 6+ chars, include an uppercase and a number.</p>
                  )}
                </div>

                {awaitingCode && (
                  <div>
                    <FormInput
                      type="text"
                      name="code"
                      value={form.code}
                      placeholder="Enter verification code"
                      onChange={handleChange}
                      isValid={!codeInvalid}
                      message="Check your email for the code"
                    />
                    {codeInvalid && <p className="mt-1 text-red-400 text-sm">Enter the verification code.</p>}
                  </div>
                )}

                <div className="w-full mt-2 flex items-center gap-3">
                  <label className="shrink-0 text-subtle whitespace-nowrap">
                    I am a:
                  </label>

                  <div className="flex-1">
                    <Select
                      value={form.role}
                      onValueChange={(value) => setForm({ ...form, role: value })}
                    >
                      <SelectTrigger className="w-full bg-black text-white rounded-lg px-3 py-2 text-sm border border-white/30">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>

                      <SelectContent className="w-[--radix-select-trigger-width] bg-black text-white border border-white/20 rounded-lg shadow-lg">
                        <SelectItem value="client" className="focus:bg-white/10">
                          Client
                        </SelectItem>
                        <SelectItem value="artist" className="focus:bg-white/10">
                          Artist
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="bg-white/20 hover:bg-white/30 text-white font-semibold py-3 rounded-lg transition-colors"
                  disabled={loading}
                >
                  {loading ? (awaitingCode ? "Verifying..." : "Signing Up...") : awaitingCode ? "Verify Code" : "Sign Up"}
                </Button>
              </form>

              <p className="text-subtle text-center text-sm mt-4">
                Already have an account?{" "}
                <Link to="/login" className="underline hover:opacity-80">
                  Login
                </Link>
              </p>
            </motion.div>
          )}
        </motion.div>
      </main>

      <ToastContainer
        position="top-center"
        autoClose={2000}
        hideProgressBar
        closeOnClick
        pauseOnHover={false}
        draggable={false}
        toastClassName="bg-black/80 text-white text-lg rounded-lg shadow-lg text-center px-6 py-4 min-w-[300px] flex items-center justify-center"
      />
    </div>
  );
};

export default SignUp;
