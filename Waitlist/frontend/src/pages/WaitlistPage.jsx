import { motion } from "framer-motion";
import FeatureShowcase from "../components/FeatureShowcase";
import WaitlistForm from "../components/WaitlistForm";
import BackgroundVideo from "../components/BackgroundVideo";
import LaunchHero from "../components/LaunchHero";

const fade = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6 + i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function WaitlistPage() {
  const vp = { once: true, amount: 0.12, margin: "200px 0px" };

  return (
    <div className="relative min-h-screen flex flex-col items-center">
      <BackgroundVideo />
      <div className="relative z-10 w-full">
        <main className="w-full flex flex-col items-center pt-4 pb-20">
          <motion.section
            variants={fade}
            initial="hidden"
            whileInView="show"
            viewport={vp}
            className="w-full"
          >
            <LaunchHero />
          </motion.section>

          <motion.section
            custom={1}
            variants={fade}
            initial="hidden"
            whileInView="show"
            viewport={vp}
            className="container mx-auto w-full max-w-4xl px-4"
          >
            <FeatureShowcase />
          </motion.section>

          <motion.section
            custom={2}
            variants={fade}
            initial="hidden"
            whileInView="show"
            viewport={vp}
            className="container mx-auto w-full max-w-4xl px-4"
          >
            <WaitlistForm />
          </motion.section>
        </main>
      </div>
    </div>
  );
}