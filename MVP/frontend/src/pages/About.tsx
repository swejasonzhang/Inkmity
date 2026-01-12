import React from "react";
import { motion } from "framer-motion";
import Header from "@/components/header/Header";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const About: React.FC = () => {
  return (
    <div className="fixed inset-0 overflow-hidden sm:relative sm:h-dvh sm:flex sm:flex-col sm:overflow-hidden">
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

      <div className="relative h-dvh w-full overflow-y-auto overflow-x-hidden sm:h-dvh sm:overflow-hidden sm:flex sm:flex-col">
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

        <main className="relative z-10 flex items-center justify-center sm:min-h-0 sm:h-full sm:flex-1" style={{ padding: 'clamp(0.75rem, 1.2vmin + 0.6vw, 1.5rem) clamp(1rem, 2vmin + 1vw, 3rem)', maxHeight: '100%', overflow: 'auto' }}>
          <motion.section
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            className="w-full"
            style={{ maxWidth: 'clamp(18rem, 45vw, 38rem)', padding: '0 clamp(0.75rem, 1.2vmin + 0.6vw, 1.5rem)' }}
          >
            <Card className="mx-auto ink-card overflow-hidden border border-app bg-card text-app">
              <div className="ink-gloss" />
              <CardHeader style={{ padding: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem) clamp(0.75rem, 1.2vmin + 0.6vw, 1.5rem) clamp(0.25rem, 0.4vmin + 0.2vw, 0.5rem) clamp(0.25rem, 0.4vmin + 0.2vw, 0.5rem)' }}>
                <div className="flex items-center justify-center" style={{ gap: 'clamp(0.375rem, 0.6vmin + 0.3vw, 0.75rem)' }}>
                  <span className="inline-grid place-items-center rounded-xl border border-app/40 bg-elevated" style={{ padding: 'clamp(0.25rem, 0.4vmin + 0.2vw, 0.5rem)' }}>
                    <Sparkles style={{ width: 'clamp(0.875rem, 1.1vmin + 0.5vw, 1.25rem)', height: 'clamp(0.875rem, 1.1vmin + 0.5vw, 1.25rem)' }} />
                  </span>
                  <CardTitle className="leading-none font-extrabold tracking-tight" style={{ fontSize: 'clamp(1.125rem, 1.6vmin + 0.8vw, 1.5rem)' }}>
                    Inkmity's Story
                  </CardTitle>
                </div>
                <div className="mx-auto rounded-full bg-elevated" style={{ marginTop: 'clamp(0.375rem, 0.6vmin + 0.3vw, 0.75rem)', height: '2px', width: 'clamp(5rem, 7vmin + 3.5vw, 7rem)' }} />
              </CardHeader>

              <CardContent className="text-center text-subtle" style={{ padding: '0 clamp(0.75rem, 1.2vmin + 0.6vw, 1.5rem) clamp(0.5rem, 0.8vmin + 0.4vw, 1rem)' }}>
                <motion.p
                  className="leading-relaxed font-medium"
                  style={{ marginTop: 'clamp(0.25rem, 0.4vmin + 0.2vw, 0.5rem)', fontSize: 'clamp(0.75rem, 0.9vmin + 0.4vw, 0.875rem)' }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  We're obsessed with{" "}
                  <span className="font-extrabold text-app underline decoration-[color:var(--border)]/50 underline-offset-4">
                    tattoos
                  </span>
                  —how a single line becomes a <span className="font-bold text-app">story</span> you carry. Inkmity exists to make that journey
                  clear, respectful, and intentional.
                </motion.p>

                <motion.p
                  className="leading-relaxed font-medium"
                  style={{ marginTop: 'clamp(0.375rem, 0.6vmin + 0.3vw, 0.75rem)', fontSize: 'clamp(0.75rem, 0.9vmin + 0.4vw, 0.875rem)' }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  Artists juggle DMs and scattered briefs. Clients hesitate, unsure what to send. Inkmity reduces friction so both sides
                  focus on the <span className="font-bold text-app">art</span>, not the admin. Communication gets context. Expectations get aligned.
                  Booking feels <span className="font-bold text-app">calm</span>.
                </motion.p>

                <motion.p
                  className="leading-relaxed font-medium"
                  style={{ marginTop: 'clamp(0.375rem, 0.6vmin + 0.3vw, 0.75rem)', fontSize: 'clamp(0.75rem, 0.9vmin + 0.4vw, 0.875rem)' }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  We ship small improvements weekly. We remove distractions. We listen. Your feedback drives our roadmap. The bar:{" "}
                  <span className="font-black text-app">less noise, more flow</span>.
                </motion.p>

                <motion.div
                  className="rounded-2xl bg-elevated/70 border border-app"
                  style={{ 
                    marginTop: 'clamp(0.75rem, 1.2vmin + 0.6vw, 1.5rem)',
                    padding: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem) clamp(0.75rem, 1.2vmin + 0.6vw, 1.5rem)'
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <h2 className="font-bold text-app text-center" style={{ fontSize: 'clamp(1rem, 1.3vmin + 0.7vw, 1.25rem)' }}>Principles</h2>
                  <ul className="text-center font-semibold space-y-1.5 sm:space-y-2" style={{ marginTop: 'clamp(0.25rem, 0.4vmin + 0.2vw, 0.5rem)' }}>
                    <li className="text-subtle" style={{ fontSize: 'clamp(0.75rem, 0.9vmin + 0.4vw, 0.875rem)' }}>• <span className="text-app font-bold">Clarity</span> over noise.</li>
                    <li className="text-subtle" style={{ fontSize: 'clamp(0.75rem, 0.9vmin + 0.4vw, 0.875rem)' }}>• <span className="text-app font-bold">Respect</span> for artists' time.</li>
                    <li className="text-subtle" style={{ fontSize: 'clamp(0.75rem, 0.9vmin + 0.4vw, 0.875rem)' }}>• <span className="text-app font-bold">Feedback loops</span> over guesswork.</li>
                    <li className="text-subtle" style={{ fontSize: 'clamp(0.75rem, 0.9vmin + 0.4vw, 0.875rem)' }}>• <span className="text-app font-bold">Trust</span> through transparency.</li>
                  </ul>
                </motion.div>

                <motion.div
                  className="rounded-2xl bg-elevated/70 border border-app"
                  style={{ 
                    marginTop: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem)',
                    padding: 'clamp(0.5rem, 0.8vmin + 0.4vw, 1rem) clamp(0.75rem, 1.2vmin + 0.6vw, 1.5rem)'
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  <h2 className="font-bold text-app text-center" style={{ fontSize: 'clamp(1rem, 1.3vmin + 0.7vw, 1.25rem)' }}>Where we're going</h2>
                  <p className="leading-relaxed font-medium text-center text-subtle" style={{ marginTop: 'clamp(0.25rem, 0.4vmin + 0.2vw, 0.5rem)', fontSize: 'clamp(0.75rem, 0.9vmin + 0.4vw, 0.875rem)' }}>
                    A platform that helps you <span className="font-bold text-app">find the right artist</span>, share{" "}
                    <span className="font-bold text-app">clean briefs</span>, and book with{" "}
                    <span className="font-bold text-app">confidence</span>. If an idea would help the community, tell us—we'll{" "}
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