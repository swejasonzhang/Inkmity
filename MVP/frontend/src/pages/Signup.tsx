import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import api from "@/utils/api";
import { isAxiosError } from "axios";
import { SignUp as ClerkSignUp } from "@clerk/clerk-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface SignUpForm {
  email: string;
  password: string;
}

const SignUp: React.FC = () => {
  const [form, setForm] = useState<SignUpForm>({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const navigate = useNavigate();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });

    if (e.target.name === "email") {
      setEmailValid(emailRegex.test(e.target.value));
      checkEmailExists(e.target.value);
    }

    if (e.target.name === "password") {
      setPasswordValid(passwordRegex.test(e.target.value));
    }
  };

  const checkEmailExists = async (email: string) => {
    if (!emailRegex.test(email)) {
      setEmailExists(false);
      return;
    }
    try {
      const res = await api.post("/check-email", { email });
      setEmailExists(res.data.exists);
    } catch {
      setEmailExists(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      toast.error("Please fill in both email and password", {
        position: "top-center",
        theme: "dark",
      });
      return;
    }

    if (!emailValid) {
      toast.error("Please enter a valid email address", {
        position: "top-center",
        theme: "dark",
      });
      return;
    }

    if (emailExists) {
      toast.error("Email is already registered", {
        position: "top-center",
        theme: "dark",
      });
      return;
    }

    if (!passwordValid) {
      toast.error(
        "Password must be at least 6 characters, include an uppercase letter and a number",
        {
          position: "top-center",
          theme: "dark",
        }
      );
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post("/signup", form);
      console.log("Signup success:", data);
      toast.success("🎉 Signup successful! Redirecting to login...", {
        position: "top-center",
        theme: "dark",
      });
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        toast.error(err.response?.data?.message || err.message, {
          position: "top-center",
          theme: "dark",
        });
      } else if (err instanceof Error) {
        toast.error(err.message, { position: "top-center", theme: "dark" });
      } else {
        toast.error("An unexpected error occurred", {
          position: "top-center",
          theme: "dark",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      >
        <source src="src/Public/Background.mp4" type="video/mp4" />
      </video>

      <div className="absolute top-0 left-0 w-full h-full bg-black/40 z-10" />

      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center z-20 px-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden w-full max-w-7xl max-h-[1000px] flex flex-col md:flex-row">
          {/* Left side text + form */}
          <div className="w-full md:w-1/2 p-8 flex flex-col items-center justify-center text-center">
            <h1 className="text-3xl font-bold mb-4 text-white">Welcome!</h1>
            <p className="text-gray-200 text-lg mb-6">
              Sign up to discover tattoo artists, explore styles, preview
              tattoos with AR, and start your personalized tattoo journey today.
            </p>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="flex flex-col gap-6 w-full max-w-sm"
            >
              <h2 className="text-2xl font-bold text-white uppercase">
                Sign Up
              </h2>

              <input
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                className="p-3 rounded-md bg-black/40 border border-gray-500 focus:border-white focus:ring-1 focus:ring-white outline-none placeholder-gray-300 text-white"
                required
              />
              <p
                className={`text-sm mt-1 ${
                  emailValid ? "text-white" : "text-gray-400"
                }`}
              >
                Enter a valid email address
              </p>
              {emailExists && (
                <p className="text-red-400 text-sm mt-1">
                  Email is already registered
                </p>
              )}

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  className="p-3 rounded-md bg-black/40 border border-gray-500 focus:border-white focus:ring-1 focus:ring-white outline-none placeholder-gray-300 text-white w-full"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <p
                className={`text-sm mt-1 ${
                  passwordValid ? "text-white" : "text-gray-400"
                }`}
              >
                Password must be at least 6 characters, include an uppercase
                letter and a number
              </p>

              <Button
                type="submit"
                className="bg-white/20 hover:bg-white/30 transition text-white font-semibold tracking-wide py-3 rounded-md backdrop-blur-sm"
                disabled={loading}
              >
                {loading ? "Signing Up..." : "Sign Up"}
              </Button>

              <p className="text-sm mt-4 text-gray-200">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-white underline hover:text-gray-300"
                >
                  Login
                </Link>
              </p>
            </form>
          </div>

          {/* Right side Clerk */}
          <div className="w-full md:w-1/2 flex items-center justify-center bg-black/30 p-6">
            <div className="w-[400px] h-[600px] flex items-center justify-center">
              <ClerkSignUp path="/signup" routing="path" />
            </div>
          </div>
        </div>
      </div>

      <ToastContainer
        position="top-center"
        autoClose={2000}
        hideProgressBar
        closeOnClick
        pauseOnHover={false}
        draggable={false}
        toastClassName="bg-black/80 text-white text-lg font-rockSalt rounded-lg shadow-lg text-center px-6 py-4 min-w-[450px] min-h-[60px] flex items-center justify-center"
      />
    </div>
  );
};

export default SignUp;
