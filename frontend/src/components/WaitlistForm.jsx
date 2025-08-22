"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, PenTool } from "lucide-react";
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
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100 },
  },
};

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const notifyError = (msg) => {
    toast.error(msg, {
      position: "top-center",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      style: {
        background: "#111",
        color: "#f87171",
        fontWeight: "bold",
        border: "1px solid #f87171",
      },
    });
  };

  const notifySuccess = (msg) => {
    toast.success(msg, {
      position: "top-center",
      autoClose: 3000,
      hideProgressBar: false,
      style: {
        background: "#111",
        color: "#f87171",
        fontWeight: "bold",
        border: "1px solid #f87171",
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      notifyError("Please enter your email.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json();
      if (!res.ok) {
        notifyError(data.error || "Something went wrong.");
      } else {
        notifySuccess("🖤 You’re officially inked into the waitlist!");
        setEmail("");
        setName("");
      }
    } catch (err) {
      console.error(err);
      notifyError("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen w-screen flex items-center justify-center p-4
      bg-gradient-to-tr from-gray-950 via-gray-900 to-black overflow-hidden"
    >
      {/* Toast Container */}
      <ToastContainer />

      {/* Tattoo-style grunge background */}
      <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')] bg-repeat"></div>

      <motion.div
        className="relative z-10 container mx-auto text-center max-w-6xl px-4 w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h2
          className="font-extrabold leading-snug sm:leading-tight tracking-tight text-gray-100 drop-shadow-2xl uppercase text-center"
          style={{
            fontSize: "clamp(1.5rem, 6vw, 3.5rem)",
          }}
          variants={itemVariants}
        >
          Ink Your Vision <br className="sm:hidden" /> Into the World
        </motion.h2>

        <motion.p
          className="mt-4 text-gray-300 max-w-3xl mx-auto italic"
          style={{ fontSize: "clamp(1rem, 2.5vw, 1.5rem)" }}
          variants={itemVariants}
        >
          Tattoos aren’t just art—they’re statements. This platform is where
          artists, collectors, and dreamers unite to leave a mark that lasts
          forever. Commitment, creativity, and courage live here.
        </motion.p>

        <motion.form
          onSubmit={handleSubmit}
          className="mt-6 max-w-4xl mx-auto w-full"
          variants={itemVariants}
        >
          <div
            className="flex flex-col sm:flex-row flex-wrap items-center 
            bg-black/80 backdrop-blur-md border border-gray-700 p-4 sm:p-6 rounded-2xl 
            shadow-2xl gap-3 sm:gap-4 w-full"
          >
            {/* Name input */}
            <div className="relative w-full sm:flex-1">
              <PenTool className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-5 sm:h-6 w-5 sm:w-6 text-gray-500" />
              <input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 bg-gray-900/90 text-gray-100 
                placeholder-gray-500 rounded-lg border border-gray-700 focus:ring-2 
                focus:ring-red-500 outline-none transition"
                style={{ fontSize: "clamp(0.875rem, 2vw, 1rem)" }}
              />
            </div>

            {/* Email input */}
            <div className="relative w-full sm:flex-1">
              <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-5 sm:h-6 w-5 sm:w-6 text-gray-500" />
              <input
                type="email"
                placeholder="Your Email (Stay Connected)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                required
                className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 bg-gray-900/90 text-gray-100 
                placeholder-gray-500 rounded-lg border border-gray-700 focus:ring-2 
                focus:ring-red-500 outline-none transition"
                style={{ fontSize: "clamp(0.875rem, 2vw, 1rem)" }}
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              autoComplete="off"
              spellCheck={false}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-red-600 hover:bg-red-700 
              text-white font-semibold rounded-lg shadow-md transition transform hover:scale-105 
              disabled:opacity-50 flex-shrink-0"
              style={{ fontSize: "clamp(0.875rem, 2vw, 1rem)" }}
            >
              {loading ? "Inking..." : "Join the Movement"}
            </button>
          </div>
        </motion.form>
      </motion.div>
    </div>
  );
}
