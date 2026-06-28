import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { render } from "@/tests/setup/test-utils";

const { default: VideoBackground } = await import("@/components/VideoBackground");

describe("VideoBackground", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    (window as any).matchMedia = (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  });

  afterEach(() => {
    document.body.style.backgroundColor = "";
  });

  test("renders the video element into a portal on the body", () => {
    render(<VideoBackground />);
    const video = document.body.querySelector("video");
    expect(video).toBeInTheDocument();
    const source = document.body.querySelector("source");
    expect(source).toHaveAttribute("src", "/Landing.mp4");
  });

  test("does not render the video when video prop is false", () => {
    render(<VideoBackground video={false} />);
    expect(document.body.querySelector("video")).toBeNull();
  });

  test("does not render the video when reduced motion is preferred", () => {
    (window as any).matchMedia = (query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    render(<VideoBackground />);
    expect(document.body.querySelector("video")).toBeNull();
  });

  test("sets the body background to transparent while mounted", () => {
    render(<VideoBackground />);
    expect(document.body.style.backgroundColor).toBe("transparent");
  });

  test("renders the scrim overlay alongside the video", () => {
    document.body.innerHTML = "";
    render(<VideoBackground scrim={80} />);
    const root = document.body.querySelector('[aria-hidden="true"].fixed') as HTMLElement;
    expect(root).toBeInTheDocument();
    // root contains the video plus the scrim overlay div
    const overlayDivs = root.querySelectorAll(":scope > div");
    expect(overlayDivs.length).toBeGreaterThanOrEqual(1);
  });
});
