import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useSignUp, useUser, useAuth } from "@clerk/clerk-react";
import FormInput from "@/components/FormInput";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { validateEmail, validatePassword } from "@/utils/validation";
import CircularProgress from "@mui/material/CircularProgress";
import { motion, AnimatePresence } from "framer-motion";

interface SignUpForm {
  email: string;
  password: string;
}

const SignUp: React.FC = () => {
  const [form, setForm] = useState<SignUpForm>({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const navigate = useNavigate();
  const { signUp } = useSignUp();
  const { isSignedIn } = useUser();
  const { signOut } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      signOut().then(() => {
        toast.info("Previous session cleared. You can sign up now.", {
          position: "top-center",
          theme: "dark",
        });
      });
    }
  }, [isSignedIn, signOut]);

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateEmail(form.email)) {
      toast.error("Please enter a valid email address", {
        position: "top-center",
        theme: "dark",
      });
      return;
    }
    if (!validatePassword(form.password)) {
      toast.error(
        "Password must be at least 6 characters, include an uppercase letter and a number",
        { position: "top-center", theme: "dark" }
      );
      return;
    }
    setLoading(true);
    try {
      if (!signUp) {
        toast.error("Signup is not available. Please try again.", {
          position: "top-center",
          theme: "dark",
        });
        setLoading(false);
        return;
      }
      const { status } = await signUp.create({
        emailAddress: form.email,
        password: form.password,
      });
      if (status === "complete") {
        toast.success("Signup successful! Redirecting to login...", {
          position: "top-center",
          theme: "dark",
        });
        navigate("/login");
      } else {
        toast.info("Please verify your email to complete signup", {
          position: "top-center",
          theme: "dark",
        });
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
              Welcome!
            </h1>
            <p className="text-gray-200 text-center mb-6 text-sm sm:text-base">
              Sign up to discover tattoo artists, explore styles, preview
              tattoos with AR, and start your personalized tattoo journey.
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

              <Button
                type="submit"
                className="bg-white/20 hover:bg-white/30 text-white font-semibold py-3 rounded-md transition-colors"
                disabled={loading}
              >
                {loading ? "Signing Up..." : "Sign Up"}
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