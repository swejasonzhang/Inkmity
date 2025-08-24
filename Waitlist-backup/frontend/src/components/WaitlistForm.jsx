"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PenTool, Mail, Info } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.3 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } },
};

const API_URL = import.meta.env.VITE_API_URL;

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [totalSignups, setTotalSignups] = useState(0);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    const fetchSignups = async () => {
      try {
        const res = await fetch(`${API_URL}/api/waitlist`);
        const data = await res.json();
        if (res.ok) setTotalSignups(data.totalSignups);
      } catch (err) {
        console.error("Failed to fetch total signups:", err);
      }
    };
    fetchSignups();
  }, []);

  const notifyError = (msg) =>
    toast(msg, {
      position: "top-center",
      autoClose: 3000,
      hideProgressBar: true,
      style: {
        background: "linear-gradient(to right, #dc2626, #b91c1c)", // matches submit button red
        color: "#ffffff",
        fontWeight: "bold",
        border: "1px solid #7f1d1d",
        textAlign: "center",
        borderRadius: "12px",
      },
    });

  const notifySuccess = (msg) =>
    toast(msg, {
      position: "top-center",
      autoClose: 3000,
      hideProgressBar: true,
      style: {
        background: "transparent",
        color: "#ffffff",
        fontWeight: "bold",
        border: "1px solid #333",
        textAlign: "center",
        borderRadius: "12px",
      },
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return notifyError("Please enter your name.");
    if (!email.trim()) return notifyError("Please enter your email.");

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) notifyError(data.error || "Something went wrong.");
      else {
        notifySuccess("You’re officially inked into the waitlist!");
        setName("");
        setEmail("");
        setTotalSignups((prev) => prev + 1);
      }
    } catch (err) {
      console.error(err);
      notifyError("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-screen flex items-center justify-center p-4 bg-gradient-to-tr from-gray-950 via-gray-900 to-black overflow-hidden">
      <ToastContainer />
      <div className="absolute inset-0 bg-gradient-to-tr from-black via-gray-950 to-black animate-pulse opacity-20"></div>

      {/* About Me button */}
      <button
        onClick={() => setShowAbout(true)}
        className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900/80 border border-gray-700 text-white font-bold shadow-md hover:bg-gray-800 transition"
      >
        <Info className="w-5 h-5" /> About Me
      </button>

      <motion.div
        className="relative z-10 container mx-auto text-center max-w-6xl px-4 w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h2
          className="font-extrabold tracking-tight text-gray-100 drop-shadow-2xl uppercase text-center leading-tight"
          style={{ fontSize: "clamp(1.5rem, 6vw, 3.5rem)" }}
          variants={itemVariants}
        >
          This Isn’t Just a Waitlist. <br /> It’s a Movement.
        </motion.h2>

        <motion.p
          className="mt-4 text-gray-300 max-w-3xl mx-auto italic"
          style={{ fontSize: "clamp(1rem, 2.5vw, 1.5rem)" }}
          variants={itemVariants}
        >
          Getting a tattoo shouldn’t be complicated. Our all-in-one platform
          makes it easy — chat in real time, discover artists by style and
          location, preview tattoos with AR, and explore AI-driven inspiration.
          Transparent pricing, smoother communication, better tattoos.
        </motion.p>

        {/* FORM */}
        <motion.form
          onSubmit={handleSubmit}
          className="mt-6 max-w-4xl mx-auto w-full"
          variants={itemVariants}
          noValidate
        >
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch bg-black/80 backdrop-blur-md border border-gray-700 p-4 sm:p-6 rounded-2xl shadow-2xl gap-3 sm:gap-4 w-full">
            <div className="relative w-full sm:flex-1">
              <PenTool className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-5 sm:h-6 w-5 sm:w-6 text-gray-500" />
              <input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 bg-gray-900/90 text-gray-100 placeholder-gray-500 rounded-lg border border-gray-700 focus:ring-2 focus:ring-red-500 outline-none transition"
                style={{
                  fontSize: "clamp(0.875rem, 2vw, 1rem)",
                  WebkitTextSizeAdjust: "100%", // prevent mobile zoom
                }}
              />
            </div>

            <div className="relative w-full sm:flex-1">
              <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-5 sm:h-6 w-5 sm:w-6 text-gray-500" />
              <input
                type="email"
                placeholder="Your Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 bg-gray-900/90 text-gray-100 placeholder-gray-500 rounded-lg border border-gray-700 focus:ring-2 focus:ring-red-500 outline-none transition"
                style={{
                  fontSize: "clamp(0.875rem, 2vw, 1rem)",
                  WebkitTextSizeAdjust: "100%", // prevent mobile zoom
                }}
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={loading}
              className="w-full sm:flex-1 px-6 py-3 
             bg-gradient-to-r from-red-600 via-red-700 to-red-800
             hover:from-red-700 hover:to-red-900
             text-white font-bold rounded-lg shadow-lg
             transition disabled:opacity-50 flex-shrink-0"
              style={{ fontSize: "1rem" }}
            >
              {loading ? "Inking You In..." : "Claim Your Spot"}
            </motion.button>
          </div>
        </motion.form>

        {/* CONDITIONAL SIGNUPS */}
        {totalSignups > 100 ? (
          <motion.p
            className="mt-6 text-white font-extrabold tracking-wide text-lg sm:text-xl drop-shadow-lg flex items-center justify-center gap-2"
            variants={itemVariants}
          >
            <PenTool className="w-6 h-6" />
            {totalSignups.toLocaleString()}+ already inked in. Don’t wait.
          </motion.p>
        ) : (
          <motion.p
            className="mt-6 text-white font-extrabold tracking-wide text-lg sm:text-xl drop-shadow-lg"
            variants={itemVariants}
          >
            Don’t wait—be part of the first wave.
          </motion.p>
        )}
      </motion.div>

      {/* ABOUT ME MODAL */}
      {showAbout && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 text-white p-6 rounded-2xl max-w-lg shadow-2xl relative animate-fadeIn">
            <button
              onClick={() => setShowAbout(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
            >
              ✕
            </button>
            <h3 className="text-2xl font-bold mb-4 text-center">About Me</h3>
            <p className="text-gray-300 leading-relaxed text-center">
              Hey, I’m Jason. Tattoos aren’t just ink to me—they’re stories and
              reminders of who we are. I built this platform to make the tattoo
              experience simpler and more meaningful, while celebrating both the
              art and the people behind it.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
