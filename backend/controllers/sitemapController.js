import mongoose from "mongoose";
import "../models/Artist.js";
import { hideTestAccountsFilter } from "../lib/testAccounts.js";

const SITE = "https://inkmity.com";

const STATIC_URLS = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/about", changefreq: "monthly", priority: "0.6" },
  { loc: "/faq", changefreq: "monthly", priority: "0.6" },
  { loc: "/contact", changefreq: "monthly", priority: "0.6" },
  { loc: "/tiers", changefreq: "monthly", priority: "0.7" },
  { loc: "/signup", changefreq: "monthly", priority: "0.8" },
  { loc: "/login", changefreq: "monthly", priority: "0.5" },
  { loc: "/privacy", changefreq: "yearly", priority: "0.3" },
  { loc: "/terms", changefreq: "yearly", priority: "0.3" },
];

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function getSitemap(req, res) {
  try {
    const Artist = mongoose.model("artist");
    const artists = await Artist.find({ visible: { $ne: false }, ...hideTestAccountsFilter(null) })
      .select("handle updatedAt")
      .limit(50000)
      .lean();

    const urls = STATIC_URLS.map(
      (u) => `<url><loc>${SITE}${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
    );

    for (const a of artists) {
      const handle = String(a.handle || "").replace(/^@/, "").trim();
      if (!handle) continue;
      const lastmod = a.updatedAt ? new Date(a.updatedAt).toISOString().slice(0, 10) : null;
      urls.push(
        `<url><loc>${SITE}/artist/${xmlEscape(handle)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<changefreq>weekly</changefreq><priority>0.7</priority></url>`
      );
    }

    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(body);
  } catch {
    res.status(500).send("sitemap_failed");
  }
}
