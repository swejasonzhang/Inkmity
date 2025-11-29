export const requestTimeout = (ms) => {
  return (req, res, next) => {
    let timeoutId;

    const clearRequestTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        clearRequestTimeout();
        res.status(408).json({
          error: "Request timeout",
          message: `Request exceeded ${ms}ms timeout`,
        });
      }
    }, ms);

    res.once("finish", clearRequestTimeout);
    res.once("close", clearRequestTimeout);
    res.once("error", clearRequestTimeout);

    next();
  };
};
