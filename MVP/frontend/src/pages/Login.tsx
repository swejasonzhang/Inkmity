import { useState, FormEvent, useEffect, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useSignIn, useUser } from "@clerk/clerk-react";
import Header from "@/components/header/Header";
import FormInput from "@/components/dashboard/FormInput";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { validateEmail } from "@/utils/validation";
import CircularProgress from "@mui/material/CircularProgress";
import { motion, AnimatePresence } from "framer-motion";

const LOGOUT_TYPE_KEY = "logoutType";
const LOGIN_TIMESTAMP_KEY = "lastLogin";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [signInAttempt, setSignInAttempt] = useState<any>(null);
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const navigate = useNavigate();
  const { signIn, setActive } = useSignIn();
  const { isSignedIn } = useUser();

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isSignedIn && !awaitingCode) {
      toast.info("Already signed in! Redirecting to dashboard...", {
        position: "top-center",
        theme: "dark",
      });
      const t = setTimeout(() => navigate("/dashboard"), 2000);
      return () => clearTimeout(t);
    }
  }, [isSignedIn, navigate, awaitingCode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const emailOk = validateEmail(email);
    const codeOk = !awaitingCode || !!code.trim();

    if (!emailOk || !codeOk) {
      if (!emailOk) toast.error("Please enter a valid email", { position: "top-center", theme: "dark" });
      if (!codeOk) toast.error("Enter the verification code", { position: "top-center", theme: "dark" });
      return;
    }

    if (!signIn) {
      toast.error("Sign in unavailable. Please try again later.", {
        position: "top-center",
        theme: "dark",
      });
      return;
    }

    setLoading(true);

    try {
      if (!awaitingCode) {
        const attempt = await signIn.create({ identifier: email, strategy: "email_code" });
        setSignInAttempt(attempt);
        setAwaitingCode(true);
        toast.info("Verification code sent to your email.", { position: "top-center", theme: "dark" });
      } else {
        if (!signInAttempt) return;

        const verified = await signInAttempt.attemptFirstFactor({
          strategy: "email_code",
          code: code.trim(),
        });

        if (verified.status === "complete") {
          await setActive({ session: verified.createdSessionId });

          localStorage.setItem("trustedDevice", email);
          localStorage.setItem(LOGIN_TIMESTAMP_KEY, Date.now().toString());
          localStorage.removeItem(LOGOUT_TYPE_KEY);

          toast.success("Login successful! Redirecting to Dashboard...", {
            position: "top-center",
            theme: "dark",
          });
          setTimeout(() => navigate("/dashboard"), 2000);
        } else {
          toast.error("Verification failed. Check your code and try again.", {
            position: "top-center",
            theme: "dark",
          });
        }
      }
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message || err.message || "Unexpected error occurred", {
        position: "top-center",
        theme: "dark",
      });
    } finally {
      setLoading(false);
    }
  };

  const emailInvalid = submitted && !validateEmail(email);
  const codeInvalid = submitted && awaitingCode && !code.trim();

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
              <h1 className="text-3xl font-bold text-center mb-4">Welcome Back!</h1>
              <p className="text-subtle text-center mb-6 text-sm sm:text-base">
                Login to continue exploring tattoo artists, styles, and your personalized tattoo journey.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <FormInput
                    type="email"
                    name="email"
                    value={email}
                    placeholder="Email"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    isValid={!emailInvalid}
                    message={
                      !email
                        ? "Enter your email"
                        : validateEmail(email)
                          ? "Valid email address"
                          : "Enter a valid email address"
                    }
                  />
                  {emailInvalid && <p className="mt-1 text-red-400 text-sm">Please enter a valid email.</p>}
                </div>

                {awaitingCode && (
                  <div>
                    <FormInput
                      type="text"
                      name="code"
                      value={code}
                      placeholder="Enter verification code"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
                      isValid={!codeInvalid}
                      message={code ? "Code entered" : "Check your email for the code"}
                    />
                    {codeInvalid && <p className="mt-1 text-red-400 text-sm">Enter the verification code.</p>}
                  </div>
                )}

                <Button
                  type="submit"
                  className="bg-white/20 hover:bg-white/30 text-white font-semibold py-3 rounded-lg transition-colors"
                  disabled={loading}
                >
                  {loading ? (awaitingCode ? "Verifying..." : "Sending Code...") : awaitingCode ? "Verify Code" : "Send Code"}
                </Button>
              </form>

              <p className="text-subtle text-center text-sm mt-4">
                Don't have an account?{" "}
                <Link to="/signup" className="underline hover:opacity-80">
                  Sign Up
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

export default Login;