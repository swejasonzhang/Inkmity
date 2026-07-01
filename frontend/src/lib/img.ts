const UPLOAD_MARK = "/image/upload/";
const TRANSFORM_HEAD = /(^|,)(c|w|h|q|f|e|g|ar|dpr|b|o|r|fl)_/;

type ImgOpts = {
  width?: number;
  height?: number;
  crop?: "fill" | "fit" | "limit" | "thumb";
  quality?: number | "auto";
  format?: "auto" | string;
  dpr?: number | "auto";
};

// Rewrites a Cloudinary delivery URL to serve a right-sized, auto-format
// (WebP/AVIF), auto-quality image. Non-Cloudinary URLs and already-transformed
// URLs pass through unchanged, so it's safe to wrap any src.
export function cldUrl(url: string | null | undefined, opts: ImgOpts = {}): string {
  if (!url) return "";
  const at = url.indexOf(UPLOAD_MARK);
  if (at === -1) return url;

  const head = url.slice(0, at + UPLOAD_MARK.length);
  const tail = url.slice(at + UPLOAD_MARK.length);
  if (TRANSFORM_HEAD.test(tail.split("/")[0])) return url;

  const { width, height, quality = "auto", format = "auto", dpr = "auto" } = opts;
  const crop = opts.crop ?? (width && height ? "fill" : "limit");

  const t = [`f_${format}`, `q_${quality}`, `dpr_${dpr}`];
  if (width) t.push(`w_${width}`);
  if (height) t.push(`h_${height}`);
  if (width || height) t.push(`c_${crop}`);

  return `${head}${t.join(",")}/${tail}`;
}

// Square, cropped — avatars and grid thumbnails.
export const cldThumb = (url?: string | null, size = 400) =>
  cldUrl(url, { width: size, height: size, crop: "fill" });

// Width-bounded, aspect kept — card and cover images.
export const cldCard = (url?: string | null, width = 640) =>
  cldUrl(url, { width, crop: "limit" });

// Large but bounded — fullscreen / detail views.
export const cldFull = (url?: string | null, width = 1400) =>
  cldUrl(url, { width, crop: "limit" });
