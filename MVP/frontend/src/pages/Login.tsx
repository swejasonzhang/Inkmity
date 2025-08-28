import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import api from "@/utils/api";
import { isAxiosError } from "axios";
import { SignIn } from "@clerk/clerk-react";

interface LoginForm {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
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
      const res = await api.post("/login", form);
      console.log("Login success:", res.data);
      navigate("/dashboard");
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
    <div className="relative flex min-h-screen items-center justify-center text-white">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="src/Public/Background.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 flex w-1/2 h-3/4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden">
        <div className="w-1/2 p-8 flex flex-col justify-center text-center">
          <h1 className="text-3xl font-bold mb-4 text-white">Welcome Back!</h1>
          <p className="text-gray-200 text-lg">
            Log in to explore tattoo artists, browse designs, preview tattoos with AR,
            manage your bookings, and track your tattoo journey all in one place.
          </p>
        </div>

        <div className="w-1/2 flex flex-col justify-center items-center p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
            <h1 className="text-2xl font-bold text-white uppercase text-center">Login</h1>

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
              {loading ? "Logging In..." : "Login"}
            </Button>

            <div className="flex flex-col gap-2 mt-2">
              <SignIn path="/login" routing="path" />
            </div>

            <p className="text-sm mt-4 text-gray-200 text-center">
              Don&apos;t have an account?{" "}
              <Link
                to="/signup"
                className="text-white underline hover:text-gray-300"
              >
                Sign Up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;