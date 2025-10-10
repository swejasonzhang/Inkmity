module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
    borderColor: ({ theme }) => ({
      ...theme("colors"),
      DEFAULT: "var(--border)",
    }),
  },
  plugins: [],
};
