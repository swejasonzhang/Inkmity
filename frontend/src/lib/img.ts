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

export const cldThumb = (url?: string | null, size = 400) =>
  cldUrl(url, { width: size, height: size, crop: "fill" });

export const cldCard = (url?: string | null, width = 640) =>
  cldUrl(url, { width, crop: "limit" });

export const cldFull = (url?: string | null, width = 1400) =>
  cldUrl(url, { width, crop: "limit" });
