import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useSignUp, useUser, useClerk } from "@clerk/clerk-react";
import FormInput from "@/components/FormInput";
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
  const [form, setForm] = useState({
    email: "",
    password: "",
    code: "",
    role: "client",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [signUpAttempt, setSignUpAttempt] = useState<any>(null);

  const navigate = useNavigate();
  const { signUp, setActive } = useSignUp();
  const { signOut } = useClerk();
  const { isSignedIn } = useUser();

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const logoutType = localStorage.getItem(LOGOUT_TYPE_KEY);
    const lastLogin = localStorage.getItem(LOGIN_TIMESTAMP_KEY);

    if (isSignedIn && !awaitingCode) {
      const within3Days =
        lastLogin &&
        Date.now() - parseInt(lastLogin, 10) <= 3 * 24 * 60 * 60 * 1000;

      if (within3Days && logoutType !== "manual") {
        toast.info("You are already signed in! Redirecting to dashboard...", {
          position: "top-center",
          theme: "dark",
        });
        const timer = setTimeout(() => navigate("/dashboard"), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [isSignedIn, navigate, awaitingCode]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateEmail(form.email)) {
      toast.error("Please enter a valid email", {
        position: "top-center",
        theme: "dark",
      });
      return;
    }

    if (!validatePassword(form.password)) {
      toast.error("Password must be 6+ chars, uppercase & number", {
        position: "top-center",
        theme: "dark",
      });
      return;
    }

    setLoading(true);

    try {
      await signOut();

      if (!signUp) {
        toast.error("Signup unavailable", {
          position: "top-center",
          theme: "dark",
        });
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
        toast.info("Verification code sent to your email!", {
          position: "top-center",
          theme: "dark",
        });
      } else {
        if (!form.code) {
          toast.error("Enter the verification code", {
            position: "top-center",
            theme: "dark",
          });
          setLoading(false);
          return;
        }

        const result = await signUpAttempt.attemptEmailAddressVerification({
          code: form.code,
        });

        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId });
          localStorage.setItem("trustedDevice", form.email);
          localStorage.setItem(LOGIN_TIMESTAMP_KEY, Date.now().toString());
          localStorage.removeItem(LOGOUT_TYPE_KEY);
          toast.success("Signup successful! Redirecting...", {
            position: "top-center",
            theme: "dark",
          });
          navigate("/dashboard");
        } else {
          toast.error("Verification failed. Check your code and try again.", {
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
        {
          position: "top-center",
          theme: "dark",
        }
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
              Welcome!
            </h1>
            <p className="text-gray-200 text-center mb-6 text-sm sm:text-base">
              Sign up to discover tattoo artists, explore styles, and start your
              personalized tattoo journey.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <FormInput
                type="email"
                name="email"
                value={form.email}
                placeholder="Email"
                onChange={handleChange}
                isValid={validateEmail(form.email)}
                message={
                  !form.email
                    ? "Enter your email"
                    : validateEmail(form.email)
                    ? "Valid email address"
                    : "Enter a valid email address"
                }
              />

              <FormInput
                type="password"
                name="password"
                value={form.password}
                placeholder="Password"
                onChange={handleChange}
                showPasswordToggle
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
                isValid={validatePassword(form.password)}
                message={
                  validatePassword(form.password)
                    ? "Valid password"
                    : "Must be 6+ chars, uppercase & number"
                }
              />

              {awaitingCode && (
                <FormInput
                  type="text"
                  name="code"
                  value={form.code}
                  placeholder="Enter verification code"
                  onChange={handleChange}
                  isValid={!!form.code}
                  message="Check your email for the code"
                />
              )}

              <div className="flex justify-center w-full mt-2">
                <div className="flex items-center gap-3">
                  <label className="text-gray-200 whitespace-nowrap">
                    I am a:
                  </label>
                  <Select
                    value={form.role}
                    onValueChange={(value) => setForm({ ...form, role: value })}
                  >
                    <SelectTrigger className="bg-white/20 text-white rounded-md px-3 py-2 text-sm w-40">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="bg-black text-white">
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="artist">Artist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                className="bg-white/20 hover:bg-white/30 text-white font-semibold py-3 rounded-md transition-colors"
                disabled={loading}
              >
                {loading
                  ? awaitingCode
                    ? "Verifying..."
                    : "Signing Up..."
                  : awaitingCode
                  ? "Verify Code"
                  : "Sign Up"}
              </Button>
            </form>

            <p className="text-gray-200 text-center text-sm mt-4">
              Already have an account?{" "}
              <Link to="/login" className="underline hover:text-gray-300">
                Login
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

export default SignUp;