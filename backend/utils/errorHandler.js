export const errorHandler = (err, res) => {
  console.error("Server Error:", err);

  if (res && typeof res.status === "function") {
    return res.status(500).json({
      error: err.message || "Internal Server Error",
    });
  }

  return;
};
