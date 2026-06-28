import { describe, test, expect } from "@jest/globals";
import { container, slide, shake } from "@/lib/animations";

describe("animation variants", () => {
  test("container hides then shows with staggered children", () => {
    expect(container.hidden).toEqual({ opacity: 0 });
    const show = container.show as { opacity: number; transition: Record<string, number> };
    expect(show.opacity).toBe(1);
    expect(show.transition.staggerChildren).toBeGreaterThan(0);
    expect(show.transition.delayChildren).toBeGreaterThan(0);
  });

  test("slide is a finite tween", () => {
    expect(slide.type).toBe("tween");
    expect(slide.duration).toBeGreaterThan(0);
    expect(Array.isArray(slide.ease)).toBe(true);
  });

  test("shake nudges back to rest", () => {
    expect(shake.idle).toEqual({ x: 0 });
    const nudge = shake.nudge as { x: number[]; transition: { duration: number } };
    expect(Array.isArray(nudge.x)).toBe(true);
    expect(nudge.x[nudge.x.length - 1]).toBe(0);
    expect(nudge.transition.duration).toBeGreaterThan(0);
  });
});
