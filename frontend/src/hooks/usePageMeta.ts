import { useEffect } from "react";

const BRAND = "Inkmity";
const SITE = "https://inkmity.com";
const DEFAULT_TITLE = "Inkmity — Book Tattoo Artists, Explore Styles, Chat & Schedule";

type PageMeta = {
  title: string;
  description?: string;
  path?: string;
};

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function usePageMeta({ title, description, path }: PageMeta) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${BRAND}` : DEFAULT_TITLE;
    document.title = fullTitle;
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("name", "twitter:title", fullTitle);

    if (description) {
      upsertMeta("name", "description", description);
      upsertMeta("property", "og:description", description);
      upsertMeta("name", "twitter:description", description);
    }

    const url = SITE + (path ?? window.location.pathname);
    upsertMeta("property", "og:url", url);
    upsertCanonical(url);
  }, [title, description, path]);
}
