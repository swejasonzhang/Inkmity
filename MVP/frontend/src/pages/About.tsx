import React from "react";
import { motion } from "framer-motion";
import Header from "@/components/header/Header";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import VideoBackground from "@/components/VideoBackground";

const About: React.FC = () => {
  return (
    <div className="h-svh overflow-hidden flex flex-col text-app">
      <VideoBackground />

      <Header />

      <main className="flex-1 min-h-0 flex items-center justify-center px-4 sm:px-6 py-4">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
          className="w-full max-w-sm sm:max-w-md"
        >
          <Card className="overflow-hidden border border-app bg-card text-app">
            <CardHeader className="px-4 pt-4 pb-1">
              <div className="flex items-center justify-center gap-2">
                <span className="inline-grid place-items-center rounded-xl border border-app/40 bg-elevated p-1.5">
                  <Sparkles className="h-4 w-4" />
                </span>
                <CardTitle className="text-lg font-extrabold tracking-tight leading-none">
                  Inkmity's Story
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="px-4 pb-4">
              <div className="text-center text-subtle text-xs leading-relaxed space-y-2">
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  We're obsessed with{" "}
                  <span className="font-extrabold text-app underline decoration-[color:var(--border)]/50 underline-offset-4">
                    tattoos
                  </span>
                  —how a single line becomes a{" "}
                  <span className="font-bold text-app">story</span> you carry.
                  Inkmity exists to make that journey clear, respectful, and intentional.
                </motion.p>

                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  Artists juggle DMs and scattered briefs. Clients hesitate, unsure what to send.
                  Inkmity reduces friction so both sides focus on the{" "}
                  <span className="font-bold text-app">art</span>, not the admin.
                  Communication gets context. Expectations get aligned. Booking feels{" "}
                  <span className="font-bold text-app">calm</span>.
                </motion.p>

                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  We ship small improvements weekly. We remove distractions. We listen.
                  Your feedback drives our roadmap. The bar:{" "}
                  <span className="font-black text-app">less noise, more flow</span>.
                </motion.p>

                <motion.div
                  className="rounded-xl bg-elevated/70 border border-app p-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <h2 className="font-bold text-app text-xs mb-1.5">Principles</h2>
                  <ul className="space-y-0.5 text-xs font-semibold">
                    <li className="text-subtle">• <span className="text-app font-bold">Clarity</span> over noise.</li>
                    <li className="text-subtle">• <span className="text-app font-bold">Respect</span> for artists' time.</li>
                    <li className="text-subtle">• <span className="text-app font-bold">Feedback loops</span> over guesswork.</li>
                    <li className="text-subtle">• <span className="text-app font-bold">Trust</span> through transparency.</li>
                  </ul>
                </motion.div>

                <motion.div
                  className="rounded-xl bg-elevated/70 border border-app p-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  <h2 className="font-bold text-app text-xs mb-1.5">Where we're going</h2>
                  <p className="text-xs leading-relaxed">
                    A platform that helps you{" "}
                    <span className="font-bold text-app">find the right artist</span>, share{" "}
                    <span className="font-bold text-app">clean briefs</span>, and book with{" "}
                    <span className="font-bold text-app">confidence</span>. If an idea would
                    help the community, tell us—we'll{" "}
                    <span className="font-bold text-app">build</span> it.
                  </p>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default About;
