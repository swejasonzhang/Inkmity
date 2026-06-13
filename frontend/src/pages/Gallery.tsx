import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, ImageIcon, Bot, ShieldCheck, Search, X } from "lucide-react";
import Header from "@/components/header/Header";
import LazyReveal from "@/components/ui/LazyReveal";
import { titleCase } from "@/lib/format";
import { fetchArtists, type Artist } from "@/api";

type WorkCategory = "Portfolio" | "Past work" | "Healed";

type GalleryItem = {
  url: string;
  artist: string;
  handle: string;
  styles: string[];
  category: WorkCategory;
};

type TabKey = "real" | "ai";

const Gallery: React.FC = () => {
  const [tab, setTab] = useState<TabKey>("real");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [activeStyle, setActiveStyle] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<WorkCategory | "All">("All");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim().toLowerCase()), 180);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetchArtists({ pageSize: 60 }, controller.signal);
        const artists = (res?.items ?? []) as (Artist & {
          handle?: string;
          portfolioImages?: string[];
          pastWorks?: string[];
          healedWorks?: string[];
        })[];
        const collected: GalleryItem[] = [];
        for (const a of artists) {
          const styles = (a.styles ?? []).filter(Boolean);
          const handle = (a.handle || a.username || "").replace(/^@/, "");
          const add = (urls: string[] | undefined, category: WorkCategory) => {
            for (const url of (urls ?? []).filter(Boolean)) {
              collected.push({ url, artist: a.username, handle, styles, category });
            }
          };
          add(a.portfolioImages, "Portfolio");
          add(a.pastWorks, "Past work");
          add(a.healedWorks, "Healed");
        }
        setItems(collected);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const tabs: { key: TabKey; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "real", label: "Real Work", Icon: ImageIcon },
    { key: "ai", label: "AI Inspiration", Icon: Bot },
  ];

  const allStyles = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) for (const s of it.styles) set.add(titleCase(s));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const categories: (WorkCategory | "All")[] = ["All", "Portfolio", "Past work", "Healed"];

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (activeCategory !== "All" && it.category !== activeCategory) return false;
      if (activeStyle && !it.styles.some((s) => titleCase(s) === activeStyle)) return false;
      if (debounced) {
        const hay = [
          it.artist,
          it.handle,
          it.category,
          ...it.styles.map(titleCase),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(debounced)) return false;
      }
      return true;
    });
  }, [items, debounced, activeStyle, activeCategory]);

  return (
    <div id="dashboard-scope" className="ink-scope theme-smooth h-svh ink-page-scroll overflow-x-hidden bg-app text-app">
      <Header />

      <main className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 py-8 sm:py-10 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
          className="text-center max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-app/40 bg-elevated px-3 py-1 text-[11px] font-medium text-subtle">
            <Sparkles className="h-3.5 w-3.5" />
            Tattoo work only — stencils & finished pieces
          </div>
          <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight">Explore</h1>
          <p className="mt-2 text-sm text-subtle leading-relaxed">
            Search by style, artist, or vibe. Tap any piece to open the artist's portfolio and book them.
          </p>
        </motion.div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {tabs.map(({ key, label, Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border transition ${
                  active
                    ? "bg-neutral-700 text-white border-transparent"
                    : "border-app/40 bg-elevated text-subtle hover:text-app"
                }`}
                aria-pressed={active}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>

        {tab === "real" && (
          <div className="mt-7 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search styles, artists, or vibes…"
                className="w-full rounded-2xl border border-app/50 bg-card/70 backdrop-blur-md pl-11 pr-10 py-3 text-sm text-app placeholder:text-subtle outline-none focus:border-app focus:ring-2 focus:ring-white/10 transition"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center h-6 w-6 rounded-full text-subtle hover:text-app hover:bg-elevated transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.map((c) => {
                const active = activeCategory === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setActiveCategory(c)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
                      active
                        ? "bg-[color:var(--fg)] text-[color:var(--bg)] border-transparent"
                        : "border-app/40 bg-elevated text-subtle hover:text-app"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>

            {allStyles.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => setActiveStyle(null)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                    activeStyle === null
                      ? "bg-neutral-700 text-white border-transparent"
                      : "border-app/40 bg-elevated text-subtle hover:text-app"
                  }`}
                >
                  All styles
                </button>
                {allStyles.map((s) => {
                  const active = activeStyle === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setActiveStyle(active ? null : s)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                        active
                          ? "bg-neutral-700 text-white border-transparent"
                          : "border-app/40 bg-elevated text-subtle hover:text-app"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="mt-8">
          {tab === "real" ? (
            <RealWork items={filtered} loading={loading} hasItems={items.length > 0} />
          ) : (
            <AiInspiration />
          )}
        </div>
      </main>
    </div>
  );
};

const SPANS = [22, 28, 24, 32, 26, 20];

const RealWork: React.FC<{
  items: GalleryItem[];
  loading: boolean;
  hasItems: boolean;
}> = ({ items, loading, hasItems }) => {
  const skeleton = (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-[10px] gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl ink-shimmer"
          style={{ gridRow: `span ${SPANS[i % SPANS.length]}` }}
        />
      ))}
    </div>
  );

  return (
    <LazyReveal loading={loading} skeleton={skeleton}>
      {!hasItems ? (
        <EmptyState
          Icon={ImageIcon}
          title="No artwork yet"
          body="As artists publish their portfolios, their stencils and finished tattoos will show up here."
        />
      ) : items.length === 0 ? (
        <EmptyState
          Icon={Search}
          title="No matches"
          body="Nothing fits those filters yet. Try a different style, category, or search term."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-[10px] gap-3">
          {items.map((item, i) => (
            <GalleryTile key={`${item.url}-${i}`} item={item} span={SPANS[i % SPANS.length]} />
          ))}

        </div>
      )}
    </LazyReveal>
  );
};

const GalleryTile: React.FC<{ item: GalleryItem; span: number }> = ({ item, span }) => {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => navigate(`/artist/${encodeURIComponent(item.handle)}`)}
      aria-label={`View ${item.artist}'s portfolio`}
      style={{ gridRow: `span ${span}` }}
      className="relative overflow-hidden rounded-2xl border border-app bg-card group cursor-pointer"
    >
      {!loaded && <span className="ink-shimmer absolute inset-0" aria-hidden />}
      <img
        src={item.url}
        alt={`Tattoo work by ${item.artist}`}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06] ${
          loaded ? "ink-fade-in" : "opacity-0"
        }`}
      />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <figcaption className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 px-3 py-2 text-xs font-medium text-white text-left">
        @{item.artist}
        <span className="block text-[10px] text-white/70">{item.category} · View portfolio</span>
      </figcaption>
    </button>
  );
};

const AiInspiration: React.FC = () => (
  <div className="max-w-3xl mx-auto">
    <div className="rounded-2xl border border-dashed border-app/60 bg-card/70 px-6 py-10 sm:py-12 text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-app/40 bg-elevated px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-subtle">
        <Bot className="h-3.5 w-3.5" />
        AI · Experimental
      </span>
      <h2 className="mt-4 text-lg font-bold text-app">AI inspiration is coming soon</h2>
      <p className="mt-2 text-sm text-subtle max-w-md mx-auto leading-relaxed">
        A space for AI-generated tattoo concepts — clearly labeled and kept separate from real
        artist work, so you always know what's a reference and what's the real thing.
      </p>
      <div className="mt-7 grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg border border-dashed border-app/40 bg-elevated/40 grid place-items-center"
          >
            <Bot className="h-4 w-4 text-app/20" />
          </div>
        ))}
      </div>
    </div>
    <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-app bg-elevated/70 p-4 text-left">
      <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-subtle" />
      <p className="text-xs text-subtle leading-relaxed">
        AI concepts are for ideation only. Always book a real artist to design and apply your
        tattoo — they'll adapt any idea to your body, skin, and style.
      </p>
    </div>
  </div>
);

const EmptyState: React.FC<{
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}> = ({ Icon, title, body }) => (
  <div className="flex flex-col items-center justify-center text-center gap-3 rounded-2xl border border-app bg-card px-6 py-14 max-w-xl mx-auto">
    <span className="grid place-items-center h-12 w-12 rounded-2xl border border-app/40 bg-elevated">
      <Icon className="h-5 w-5 text-subtle" />
    </span>
    <h2 className="text-base font-bold text-app">{title}</h2>
    <p className="text-sm text-subtle max-w-sm leading-relaxed">{body}</p>
  </div>
);

export default Gallery;
