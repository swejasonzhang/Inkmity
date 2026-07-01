import { describe, test, expect } from "@jest/globals";
import { cldUrl, cldThumb, cldCard, cldFull } from "@/lib/img";

const BASE = "https://res.cloudinary.com/inkmity/image/upload/v1699/portfolio/piece.jpg";

describe("cldUrl", () => {
  test("inserts auto format/quality/dpr and sizing after /upload/", () => {
    const out = cldUrl(BASE, { width: 400, height: 400 });
    expect(out).toBe(
      "https://res.cloudinary.com/inkmity/image/upload/f_auto,q_auto,dpr_auto,w_400,h_400,c_fill/v1699/portfolio/piece.jpg"
    );
  });

  test("width-only uses c_limit by default (keeps aspect ratio)", () => {
    expect(cldUrl(BASE, { width: 640 })).toContain("w_640,c_limit/");
  });

  test("passes through non-Cloudinary URLs untouched", () => {
    const ext = "https://example.com/img/photo.png";
    expect(cldUrl(ext, { width: 400 })).toBe(ext);
  });

  test("does not double-transform an already-transformed URL", () => {
    const already =
      "https://res.cloudinary.com/inkmity/image/upload/f_auto,q_auto,w_200/v1/piece.jpg";
    expect(cldUrl(already, { width: 800 })).toBe(already);
  });

  test("empty/nullish input yields empty string", () => {
    expect(cldUrl(undefined)).toBe("");
    expect(cldUrl(null)).toBe("");
    expect(cldUrl("")).toBe("");
  });

  test("preserves version and nested folder path", () => {
    const out = cldUrl(BASE, { width: 300, height: 300 });
    expect(out.endsWith("/v1699/portfolio/piece.jpg")).toBe(true);
  });
});

describe("presets", () => {
  test("cldThumb is a square fill crop", () => {
    expect(cldThumb(BASE, 96)).toContain("w_96,h_96,c_fill/");
  });
  test("cldCard is width-bounded", () => {
    expect(cldCard(BASE, 640)).toContain("w_640,c_limit/");
  });
  test("cldFull is a larger width bound", () => {
    expect(cldFull(BASE, 1400)).toContain("w_1400,c_limit/");
  });
});
