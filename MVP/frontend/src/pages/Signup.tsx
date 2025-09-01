import { useState, ChangeEvent, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import api from "@/utils/api";
import { isAxiosError } from "axios";
import { SignUp as ClerkSignUp } from "@clerk/clerk-react";
import FormInput from "@/components/FormInput";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { validateEmail, validatePassword } from "@/utils/validation";

interface SignUpForm {
  email: string;
  password: string;
}

const SignUp: React.FC = () => {
  const [form, setForm] = useState<SignUpForm>({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

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
      // Check if email is already registered
      const { data: emailCheck } = await api.post("/check-email", {
        email: form.email,
      });
      if (emailCheck.exists) {
        toast.error("Email is already registered", {
          position: "top-center",
          theme: "dark",
        });
        setLoading(false);
        return;
      }

      // Proceed with signup
      const { data: signupResponse } = await api.post("/signup", form);
      console.log("Signup success:", signupResponse);
      toast.success("🎉 Signup successful! Redirecting to login...", {
        position: "top-center",
        theme: "dark",
      });
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: unknown) {
      if (isAxiosError(err))
        toast.error(err.response?.data?.message || err.message, {
          position: "top-center",
          theme: "dark",
        });
      else if (err instanceof Error)
        toast.error(err.message, { position: "top-center", theme: "dark" });
      else
        toast.error("An unexpected error occurred", {
          position: "top-center",
          theme: "dark",
        });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full h-screen">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      >
        <source src="src/Public/Background.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay */}
      <div className="absolute top-0 left-0 w-full h-full bg-black/40 z-10" />

      {/* Main content */}
      <div className="absolute top-0 left-0 w-full h-full overflow-y-auto sm:overflow-hidden px-4 pt-[50px] sm:pt-0 flex items-start sm:items-center justify-center z-20">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden w-full max-w-7xl flex flex-col md:flex-row">
          {/* Left side: form */}
          <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col items-center justify-center text-center">
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
              <h2 className="text-2xl font-bold text-white uppercase text-center">
                Sign Up
              </h2>

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
                    ? "Valid Password"
                    : "Password must be at least 6 characters, include an uppercase letter and a number"
                }
              />

              <Button
                type="submit"
                className="bg-white/20 hover:bg-white/30 transition text-white font-semibold tracking-wide py-3 rounded-md backdrop-blur-sm"
                disabled={loading}
              >
                {loading ? "Signing Up..." : "Sign Up"}
              </Button>

              <p className="text-sm mt-4 text-gray-200 text-center">
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

          {/* Right side: Clerk */}
          <div className="w-full md:w-1/2 flex items-center justify-center bg-black/30 md:mt-0 md:pt-0">
            <div className="w-[400px] h-[600px] flex items-center justify-center">
              <ClerkSignUp path="/signup" routing="path" />
            </div>
          </div>
        </div>
      </div>

      {/* Toast Container */}
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