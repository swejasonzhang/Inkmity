import React from "react";
import { motion } from "framer-motion";
import Header from "@/components/header/Header";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const About: React.FC = () => {
  return (
    <div className="fixed inset-0 overflow-hidden md:relative md:h-dvh md:flex md:flex-col md:overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none md:fixed">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className={[
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "min-w-full w-auto",
            "h-[140dvh] md:h-dvh",
            "object-cover",
            "video-bg",
          ].join(" ")}
          aria-hidden
        >
          <source src="/Landing.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="relative h-dvh w-full overflow-y-auto overflow-x-hidden md:h-dvh md:overflow-hidden md:flex md:flex-col">
        <Header />

        <div className="pointer-events-none absolute inset-0">
          <div className="ambient-ball ambient-1" />
          <div className="ambient-ball ambient-2" />
        </div>

        <svg
          className="pointer-events-none absolute inset-0 opacity-30"
          viewBox="0 0 1200 800"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="inkStrokeAbout" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.08" />
              <stop offset="50%" stopColor="currentColor" stopOpacity="0.4" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.08" />
            </linearGradient>
          </defs>
        </svg>

        <main className="relative z-10 min-h-dvh grid place-items-center px-4 py-8 md:min-h-0 md:h-full md:p-0 md:flex-1">
          <motion.section
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            className="w-full max-w-3xl"
          >
            <Card className="mx-auto ink-card overflow-hidden border border-app bg-card text-app">
              <div className="ink-gloss" />
              <CardHeader className="px-6 sm:px-10 pt-8 pb-2">
                <div className="flex items-center justify-center gap-3">
                  <span className="inline-grid place-items-center rounded-xl border border-app/40 bg-elevated p-2">
                    <Sparkles size={18} />
                  </span>
                  <CardTitle className="text-[28px] sm:text-[32px] leading-none font-extrabold tracking-tight">
                    Inkmity’s Story
                  </CardTitle>
                </div>
                <div className="mx-auto mt-4 h-[2px] w-28 rounded-full bg-elevated" />
              </CardHeader>

              <CardContent className="px-6 sm:px-10 pb-8 text-center text-subtle">
                <motion.p
                  className="mt-2 leading-relaxed text-base sm:text-lg font-medium"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  We’re obsessed with{" "}
                  <span className="font-extrabold text-app underline decoration-[color:var(--border)]/50 underline-offset-4">
                    tattoos
                  </span>
                  —how a single line becomes a <span className="font-bold text-app">story</span> you carry. Inkmity exists to make that journey
                  clear, respectful, and intentional.
                </motion.p>

                <motion.p
                  className="mt-4 leading-relaxed text-base sm:text-lg font-medium"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  Artists juggle DMs and scattered briefs. Clients hesitate, unsure what to send. Inkmity reduces friction so both sides
                  focus on the <span className="font-bold text-app">art</span>, not the admin. Communication gets context. Expectations get aligned.
                  Booking feels <span className="font-bold text-app">calm</span>.
                </motion.p>

                <motion.p
                  className="mt-4 leading-relaxed text-base sm:text-lg font-medium"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  We ship small improvements weekly. We remove distractions. We listen. Your feedback drives our roadmap. The bar:{" "}
                  <span className="font-black text-app">less noise, more flow</span>.
                </motion.p>

                <motion.div
                  className="mt-8 rounded-2xl bg-elevated/70 border border-app px-5 sm:px-6 py-5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <h2 className="text-xl font-bold text-app text-center">Principles</h2>
                  <ul className="mt-3 space-y-2 text-center font-semibold">
                    <li className="text-subtle">• <span className="text-app font-bold">Clarity</span> over noise.</li>
                    <li className="text-subtle">• <span className="text-app font-bold">Respect</span> for artists’ time.</li>
                    <li className="text-subtle">• <span className="text-app font-bold">Feedback loops</span> over guesswork.</li>
                    <li className="text-subtle">• <span className="text-app font-bold">Trust</span> through transparency.</li>
                  </ul>
                </motion.div>

                <motion.div
                  className="mt-6 rounded-2xl bg-elevated/70 border border-app px-5 sm:px-6 py-5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  <h2 className="text-xl font-bold text-app text-center">Where we’re going</h2>
                  <p className="mt-3 leading-relaxed font-medium text-center text-subtle">
                    A platform that helps you <span className="font-bold text-app">find the right artist</span>, share{" "}
                    <span className="font-bold text-app">clean briefs</span>, and book with{" "}
                    <span className="font-bold text-app">confidence</span>. If an idea would help the community, tell us—we’ll{" "}
                    <span className="font-bold text-app">build</span> it.
                  </p>
                </motion.div>
              </CardContent>
            </Card>
          </motion.section>
        </main>
      </div>
    </div>
  );
};

export default About;
