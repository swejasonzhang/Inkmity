export const isFreeMode = () =>
  process.env.FREE_MODE === "1" || process.env.NODE_ENV === "development";