"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PenTool, Mail, Info } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_URL = import.meta.env.VITE_API_URL;

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [totalSignups, setTotalSignups] = useState(0);
  const [showAbout, setShowAbout] = useState(false);

  const headingText = "This Isn’t Just a Waitlist.\nIt’s a Movement.";
  const paragraphText =
    "Getting a tattoo shouldn’t be complicated. Our all-in-one platform makes it easy — chat in real time, discover artists by style and location, preview tattoos with AR, and explore AI-driven inspiration. Transparent pricing, smoother communication, better tattoos.";

  useEffect(() => {
    const fetchSignups = async () => {
      try {
        const res = await fetch(`${API_URL}/api/waitlist`);
        const data = await res.json();
        if (res.ok && data.totalSignups !== undefined)
          setTotalSignups(data.totalSignups);
      } catch (err) {
        console.error("Failed to fetch total signups:", err);
      }
    };
    fetchSignups();
  }, []);

  const notify = (msg, error = false) =>
    toast(msg, {
      position: "top-center",
      autoClose: 2500,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: false,
      style: {
        background: error ? "#fff" : "transparent",
        color: "#000",
        fontWeight: "bold",
        border: "1px solid #fff",
        textAlign: "center",
        borderRadius: "12px",
        width: "fit-content",
        minWidth: "200px",
        margin: "0 auto",
      },
      className: "toast-center",
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return notify("Please enter your name.", true);
    if (!email.trim()) return notify("Please enter your email.", true);

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();

      if (!res.ok) notify(data.error || "Something went wrong.", true);
      else {
        notify("You’re officially inked into the waitlist!");
        setName("");
        setEmail("");
        setTotalSignups((prev) => prev + 1);
      }
    } catch {
      notify("Server error. Please try again later.", true);
    } finally {
      setLoading(false);
    }
  };

  // Dark mode classes
  const textColor = "text-white";
  const inputBg = "bg-black";
  const inputText = textColor;
  const buttonBg = "bg-white";
  const buttonText = "text-black";
  const borderColor = "border-gray-600";

  return (
    <div className="relative min-h-screen w-screen flex items-center justify-center p-4 overflow-hidden">
      <ToastContainer />

      {/* Top-right About Button */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => setShowAbout(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/80 border border-gray-600 text-white font-bold shadow-md hover:bg-gray-700 transition"
        >
          <Info className="w-5 h-5" /> About Me
        </button>
      </div>

      <motion.div className="relative z-10 container mx-auto text-center max-w-6xl px-4 w-full">
        {/* Heading */}
        <motion.h2
          className={`font-extrabold tracking-tight text-center leading-tight text-4xl sm:text-6xl md:text-7xl ${textColor}`}
        >
          {headingText.split("\n").map((line, idx) => (
            <span key={idx}>
              {line.split(" ").map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.2, ease: "easeOut" }}
                  style={{ display: "inline-block", marginRight: "0.25em" }}
                >
                  {word}
                </motion.span>
              ))}
              <br />
            </span>
          ))}
        </motion.h2>

        {/* Paragraph */}
        <motion.p
          className={`mt-4 max-w-3xl mx-auto italic ${textColor}`}
          style={{ fontSize: "clamp(1rem, 2.5vw, 1.5rem)" }}
        >
          {paragraphText.split(" ").map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.5 + i * 0.08,
                duration: 0.1,
                ease: "easeOut",
              }}
              style={{ display: "inline-block", marginRight: "0.25em" }}
            >
              {word}
            </motion.span>
          ))}
        </motion.p>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          className="mt-6 max-w-4xl mx-auto w-full"
          noValidate
        >
          <div
            className={`flex flex-col sm:flex-row flex-wrap items-stretch ${inputBg}/90 backdrop-blur-md border ${borderColor} p-4 sm:p-6 rounded-2xl shadow-2xl gap-3 sm:gap-4 w-full`}
          >
            {/* Name Input */}
            <div className="relative w-full sm:flex-1">
              <PenTool className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-5 sm:h-6 w-5 sm:w-6 text-gray-400" />
              <input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className={`w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 ${inputBg} ${inputText} placeholder-gray-400 rounded-lg border ${borderColor} focus:ring-2 focus:ring-gray-600 outline-none transition`}
              />
            </div>

            {/* Email Input */}
            <div className="relative w-full sm:flex-1">
              <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-5 sm:h-6 w-5 sm:w-6 text-gray-400" />
              <input
                type="email"
                placeholder="Your Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className={`w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 ${inputBg} ${inputText} placeholder-gray-400 rounded-lg border ${borderColor} focus:ring-2 focus:ring-gray-600 outline-none transition`}
              />
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={loading}
              className={`w-full sm:flex-1 px-6 py-3 ${buttonBg} ${buttonText} font-bold rounded-lg shadow-lg transition disabled:opacity-50 flex-shrink-0`}
            >
              {loading ? "Inking You In..." : "Claim Your Spot"}
            </motion.button>
          </div>
        </motion.form>

        {/* Animated Signups Message */}
        <motion.p
          className={`mt-6 font-extrabold tracking-wide text-lg sm:text-xl drop-shadow-lg flex flex-col items-center justify-center gap-2 ${textColor}`}
        >
          {totalSignups > 0 && (
            <span className="text-center text-base sm:text-lg">
              {totalSignups >= 100
                ? "100+ users signed up to get inked!"
                : `${totalSignups} ${
                    totalSignups === 1 ? "user has" : "users have"
                  } signed up to get inked!`}
            </span>
          )}
          <span className="flex flex-wrap justify-center gap-1 mt-1">
            <PenTool className="w-6 h-6" />{" "}
            {"Don’t wait—be part of the first wave."
              .split(" ")
              .map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 4.3 + i * 0.08,
                    duration: 0.4,
                    ease: "easeOut",
                  }}
                  style={{ display: "inline-block", marginRight: "0.25em" }}
                >
                  {word}
                </motion.span>
              ))}
          </span>
        </motion.p>

        {/* About Me Modal */}
        {showAbout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setShowAbout(false)}
            ></div>

            <div className="relative bg-white text-black p-6 rounded-2xl max-w-lg shadow-2xl animate-fadeIn z-10">
              <button
                onClick={() => setShowAbout(false)}
                className="absolute top-3 right-3 text-gray-600 hover:text-black"
              >
                ✕
              </button>
              <h3 className="text-2xl font-bold mb-4 text-center">About Me</h3>
              <p className="leading-relaxed text-center">
                Hey, I’m Jason. Tattoos aren’t just ink to me—they’re stories
                and reminders of who we are. I built this platform to make the
                tattoo experience simpler and more meaningful, while celebrating
                both the art and the people behind it.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
