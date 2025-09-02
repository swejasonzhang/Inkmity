import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useSignIn, useUser } from "@clerk/clerk-react";
import FormInput from "@/components/FormInput";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { validateEmail, validatePassword } from "@/utils/validation";

interface LoginForm {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useSignIn();
  const { isSignedIn } = useUser();

  useEffect(() => {
    if (isSignedIn) {
      toast.info("Session detected, redirecting to homepage...", {
        position: "top-center",
        theme: "dark",
      });
      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
    }
  }, [isSignedIn, navigate]);

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
      if (!signIn) {
        toast.error("Login is not available. Please try again.", {
          position: "top-center",
          theme: "dark",
        });
        setLoading(false);
        return;
      }

      const { status } = await signIn.create({
        identifier: form.email,
        password: form.password,
      });

      if (status === "complete") {
        toast.success("🎉 Login successful! Redirecting...", {
          position: "top-center",
          theme: "dark",
        });
        navigate("/dashboard");
      } else {
        toast.info("Please complete any additional verification to login", {
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
    <div className="relative w-full h-screen">
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

      <div className="absolute inset-0 flex items-center justify-center z-20 px-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold mb-4 text-white text-center">
            Welcome Back!
          </h1>
          <p className="text-gray-200 text-lg mb-6 text-center">
            Login to continue exploring tattoo artists, styles, and your
            personalized tattoo journey.
          </p>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-6"
          >
            <h2 className="text-2xl font-bold text-white uppercase text-center">
              Login
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
              {loading ? "Logging In..." : "Login"}
            </Button>

            <p className="text-sm mt-4 text-gray-200 text-center">
              Don't have an account?{" "}
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

export default Login;