import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import Header from "@/components/header/Header";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, useReducedMotion } from "framer-motion";
import { useSignIn, useUser } from "@clerk/clerk-react";
import { validateEmail } from "@/utils/validation";
import InfoPanel from "@/components/access/InfoPanel";
import FormCard from "@/components/access/FormCard";
import { Button } from "@/components/ui/button";
import { container } from "@/components/access/animations";

export default function Login() {
  const prefersReduced = !!useReducedMotion();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showInfo, setShowInfo] = useState(false);
  const [mascotError, setMascotError] = useState(false);

  const { signIn, setActive } = useSignIn();
  const { isSignedIn } = useUser();

  useEffect(() => {
    if (isSignedIn) window.location.href = "/dashboard";
  }, [isSignedIn]);

  useEffect(() => {
    const t = setTimeout(() => setShowInfo(true), 2000);
    return () => clearTimeout(t);
  }, []);

  const triggerMascotError = () => {
    setMascotError(true);
    window.setTimeout(() => setMascotError(false), 900);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      toast.error("Please enter a valid email", { position: "top-center", theme: "dark" });
      triggerMascotError();
      return;
    }
    if (!password.trim()) {
      toast.error("Enter your password", { position: "top-center", theme: "dark" });
      triggerMascotError();
      return;
    }
    if (!signIn) {
      toast.error("Sign in unavailable. Please try again later.", { position: "top-center", theme: "dark" });
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        window.location.href = "/dashboard";
      } else {
        toast.error("Login failed. Check your credentials and try again.", { position: "top-center", theme: "dark" });
        triggerMascotError();
      }
    } catch (err: any) {
      toast.error(err?.errors?.[0]?.message || err?.message || "Unexpected error occurred", {
        position: "top-center",
        theme: "dark",
      });
      triggerMascotError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh text-app flex flex-col overflow-hidden">
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

      <Header disableDashboardLink />

      <main className="flex-1 grid place-items-center px-4 py-10">
        <motion.div
          variants={container}
          initial={prefersReduced ? false : "hidden"}
          animate={prefersReduced ? undefined : "show"}
          className="w-full max-w-5xl mx-auto"
        >
          <div className="relative flex items-stretch justify-center gap-0">
            <div className="w-[520px] shrink-0 relative self-stretch min-h-[610px]">
              <InfoPanel
                show={showInfo}
                prefersReduced={prefersReduced}
                hasError={mascotError}
                isPasswordHidden={false}
                className="absolute inset-0"
                mode="login"
              />
            </div>

            <FormCard
              mode="login"
              showInfo={showInfo}
              hasError={mascotError}
              titleOverride="Welcome Back!"
              subtitleOverride="Login to continue exploring artists, styles, and your tattoo journey."
              className="flex-1 self-stretch min-h-[610px]"
            >
              <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full max-w-sm mx-auto">
                <div className="text-left">
                  <label className="block text-sm text-white/70 mb-1" htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={email}
                    placeholder="Email"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    className="w-full h-11 rounded-xl bg-white/10 text-white placeholder:text-white/40 px-4 outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>

                <div className="text-left">
                  <label className="block text-sm text-white/70 mb-1" htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={password}
                    placeholder="Password"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    className="w-full h-11 rounded-xl bg-white/10 text-white placeholder:text-white/40 px-4 outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>

                <Button
                  type="submit"
                  className="bg-white/15 hover:bg-white/25 text-white flex-1 h-11 text-base rounded-xl w-full"
                  disabled={loading}
                >
                  {loading ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </FormCard>
          </div>
        </motion.div>
      </main>

      <ToastContainer
        position="top-center"
        autoClose={2000}
        hideProgressBar
        closeOnClick
        pauseOnHover={false}
        draggable={false}
        toastClassName="bg-black/80 text-white text-base rounded-xl shadow-lg text-center px-5 py-3 min-w-[280px] flex items-center justify-center border border-white/10"
      />
    </div>
  );
}
