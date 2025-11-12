export async function fireSideCannons(durationMs = 3000): Promise<void> {
  try {
    const { default: confetti } = await import("canvas-confetti");
    const end = Date.now() + durationMs;
    const colors = ["#000000", "#FFFFFF"];

    const frame = (): void => {
      if (Date.now() > end) return;

      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors,
      });

      requestAnimationFrame(frame);
    };

    frame();
  } catch (err) {
    console.error("[confetti] failed to load:", err);
  }
}