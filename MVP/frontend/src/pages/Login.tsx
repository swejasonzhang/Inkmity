import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useSignIn } from "@clerk/clerk-react";
import FormInput from "@/components/FormInput";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { validateEmail } from "@/utils/validation";
import CircularProgress from "@mui/material/CircularProgress";
import { motion, AnimatePresence } from "framer-motion";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [signInAttempt, setSignInAttempt] = useState<any>(null);
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const navigate = useNavigate();
  const { signIn, setActive } = useSignIn();

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      toast.error("Please enter a valid email address", {
        position: "top-center",
        theme: "dark",
      });
      return;
    }

    setLoading(true);
    try {
      if (!signIn) return;

      if (!awaitingCode) {
        const attempt = await signIn.create({
          identifier: email,
          strategy: "email_code",
        });
        setSignInAttempt(attempt);
        setAwaitingCode(true);

        toast.info("We’ve sent you a login code. Check your email.", {
          position: "top-center",
          theme: "dark",
        });
      } else {
        if (!signInAttempt) return;

        const verified = await signInAttempt.attemptFirstFactor({
          strategy: "email_code",
          code,
        });

        if (verified.status === "complete") {
          await setActive({ session: verified.createdSessionId });
          toast.success("Login successful! Redirecting...", {
            position: "top-center",
            theme: "dark",
          });
          navigate("/dashboard");
        } else {
          toast.error("Invalid or expired code. Please try again.", {
            position: "top-center",
            theme: "dark",
          });
        }
      }
    } catch (err: any) {
      toast.error(
        err.errors?.[0]?.message ||
          err.message ||
          "An unexpected error occurred",
        { position: "top-center", theme: "dark" }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      >
        <source src="public/Background.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/50 z-10" />

      <motion.div
        className="relative z-20 w-full max-w-md p-8 mx-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl flex flex-col items-center justify-center min-h-[500px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <AnimatePresence>
          {pageLoading && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-xl"
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
            <h1 className="text-3xl font-bold text-white text-center mb-4">
              Welcome Back!
            </h1>
            <p className="text-gray-200 text-center mb-6 text-sm sm:text-base">
              Login to continue exploring tattoo artists, styles, and your
              personalized tattoo journey.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <FormInput
                type="email"
                name="email"
                value={email}
                placeholder="Email"
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
                isValid={validateEmail(email)}
                message={
                  !email
                    ? "Enter your email"
                    : validateEmail(email)
                    ? "Valid email address"
                    : "Enter a valid email address"
                }
              />

              {awaitingCode && (
                <FormInput
                  type="text"
                  name="code"
                  value={code}
                  placeholder="Enter verification code"
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCode(e.target.value)
                  }
                  isValid={!!code}
                  message={
                    code ? "Code entered" : "Check your email for the code"
                  }
                />
              )}

              <Button
                type="submit"
                className="bg-white/20 hover:bg-white/30 text-white font-semibold py-3 rounded-md transition-colors"
                disabled={loading}
              >
                {loading
                  ? awaitingCode
                    ? "Verifying..."
                    : "Sending Code..."
                  : awaitingCode
                  ? "Verify Code"
                  : "Send Code"}
              </Button>
            </form>

            <p className="text-gray-200 text-center text-sm mt-4">
              Don't have an account?{" "}
              <Link to="/signup" className="underline hover:text-gray-300">
                Sign Up
              </Link>
            </p>
          </motion.div>
        )}
      </motion.div>

      <ToastContainer
        position="top-center"
        autoClose={2000}
        hideProgressBar
        closeOnClick
        pauseOnHover={false}
        draggable={false}
        toastClassName="bg-black/80 text-white text-lg font-rockSalt rounded-lg shadow-lg text-center px-6 py-4 min-w-[300px] flex items-center justify-center"
      />
    </div>
  );
};

export default Login;
