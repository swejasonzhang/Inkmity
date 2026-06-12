import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, ImageIcon, Bot, ShieldCheck } from "lucide-react";
import Header from "@/components/header/Header";
import LazyReveal from "@/components/ui/LazyReveal";
import HScroll from "@/components/ui/HScroll";
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

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const OTHER = "Other styles";

const Gallery: React.FC = () => {
  const [tab, setTab] = useState<TabKey>("real");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [healedOnly, setHealedOnly] = useState(false);

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

  const filtered = useMemo(
    () => items.filter((i) => !healedOnly || i.category === "Healed"),
    [items, healedOnly]
  );

  // Group images into a section per style (an image can appear in several).
  const sections = useMemo(() => {
    const map = new Map<string, GalleryItem[]>();
    for (const it of filtered) {
      const keys = it.styles.length ? it.styles.map(cap) : [OTHER];
      for (const s of keys) {
        if (!map.has(s)) map.set(s, []);
        map.get(s)!.push(it);
      }
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] === OTHER ? 1 : b[0] === OTHER ? -1 : a[0].localeCompare(b[0])))
      .map(([style, list]) => ({ style, items: list }));
  }, [filtered]);

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
            Browse real tattoo artistry by style. Tap any piece to open the artist's portfolio and book them.
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
          {tab === "real" && !loading && items.length > 0 && (
            <button
              type="button"
              onClick={() => setHealedOnly((v) => !v)}
              aria-pressed={healedOnly}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border transition ${
                healedOnly
                  ? "bg-neutral-700 text-white border-transparent"
                  : "border-app/40 bg-elevated text-subtle hover:text-app"
              }`}
            >
              Healed only
            </button>
          )}
        </div>

        <div className="mt-8">
          {tab === "real" ? <RealWork sections={sections} loading={loading} hasItems={items.length > 0} /> : <AiInspiration />}
        </div>
      </main>
    </div>
  );
};

const RealWork: React.FC<{
  sections: { style: string; items: GalleryItem[] }[];
  loading: boolean;
  hasItems: boolean;
}> = ({ sections, loading, hasItems }) => {
  const skeleton = (
    <div className="space-y-8">
      {Array.from({ length: 3 }).map((_, s) => (
        <div key={s}>
          <div className="ink-shimmer h-5 w-40 rounded mb-3" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shrink-0 w-40 sm:w-48 aspect-square rounded-xl ink-shimmer" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <LazyReveal loading={loading} skeleton={skeleton}>
      {!hasItems || sections.length === 0 ? (
        <EmptyState
          Icon={ImageIcon}
          title={hasItems ? "No matches" : "No artwork yet"}
          body={
            hasItems
              ? "No healed pieces to show yet. Turn off the filter to see everything."
              : "As artists publish their portfolios, their stencils and finished tattoos will show up here, grouped by style."
          }
        />
      ) : (
        <div className="space-y-9">
          {sections.map(({ style, items }) => (
            <section key={style}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-bold tracking-tight">{style}</h2>
                <span className="text-xs text-subtle">
                  {items.length} {items.length === 1 ? "piece" : "pieces"}
                </span>
              </div>
              <HScroll>
                {items.map((item, i) => (
                  <GalleryTile key={`${style}-${item.url}-${i}`} item={item} />
                ))}
              </HScroll>
            </section>
          ))}
        </div>
      )}
    </LazyReveal>
  );
};

const GalleryTile: React.FC<{ item: GalleryItem }> = ({ item }) => {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => navigate(`/artist/${encodeURIComponent(item.handle)}`)}
      aria-label={`View ${item.artist}'s portfolio`}
      className="snap-start shrink-0 w-40 sm:w-48 aspect-square relative overflow-hidden rounded-xl border border-app bg-card group cursor-pointer"
    >
      {!loaded && <span className="ink-shimmer absolute inset-0" aria-hidden />}
      <img
        src={item.url}
        alt={`Tattoo work by ${item.artist}`}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05] ${loaded ? "ink-fade-in" : "opacity-0"}`}
      />
      <figcaption className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 text-xs font-medium text-white text-left">
        @{item.artist} · View portfolio
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
