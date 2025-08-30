import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import api from "@/utils/api";
import { isAxiosError } from "axios";
import { SignUp as ClerkSignUp } from "@clerk/clerk-react";

interface SignUpForm {
  email: string;
  password: string;
}

const SignUp: React.FC = () => {
  const [form, setForm] = useState<SignUpForm>({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post("/signup", form);
      console.log("Signup success:", res.data);
      navigate("/login");
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
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

      {/* Overlay */}
      <div className="absolute top-0 left-0 w-full h-full bg-black/40 z-10" />

      {/* Content */}
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center z-20 px-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden w-full max-w-5xl flex flex-col md:flex-row">
          {/* Left side text */}
          <div className="w-full md:w-1/2 p-8 flex flex-col justify-center text-center md:text-left">
            <h1 className="text-3xl font-bold mb-4 text-white">Welcome!</h1>
            <p className="text-gray-200 text-lg">
              Sign up to discover tattoo artists, explore styles, preview
              tattoos with AR, and start your personalized tattoo journey today.
            </p>
          </div>

          {/* Right side form */}
          <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-6 w-full"
            >
              <h1 className="text-2xl font-bold text-white uppercase text-center">
                Sign Up
              </h1>

              <input
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                className="p-3 rounded-md bg-black/40 border border-gray-500 focus:border-white focus:ring-1 focus:ring-white outline-none placeholder-gray-300 text-white"
                required
              />

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

              {error && <p className="text-red-500 text-center">{error}</p>}

              <Button
                type="submit"
                className="bg-white/20 hover:bg-white/30 transition text-white font-semibold tracking-wide py-3 rounded-md backdrop-blur-sm"
                disabled={loading}
              >
                {loading ? "Signing Up..." : "Sign Up"}
              </Button>

              <div className="flex flex-col gap-2 mt-2">
                <ClerkSignUp path="/signup" routing="path" />
              </div>

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
        </div>
      </div>
    </div>
  );
};

export default SignUp;