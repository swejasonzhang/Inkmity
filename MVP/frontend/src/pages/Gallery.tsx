import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ImageIcon, Bot, ShieldCheck, X } from "lucide-react";
import Header from "@/components/header/Header";
import VideoBackground from "@/components/VideoBackground";
import { fetchArtists, type Artist } from "@/api";

type GalleryItem = {
  url: string;
  artist: string;
};

type TabKey = "real" | "ai";

const Gallery: React.FC = () => {
  const [tab, setTab] = useState<TabKey>("real");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState<GalleryItem | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetchArtists({ pageSize: 60 }, controller.signal);
        const artists = (res?.items ?? []) as (Artist & {
          portfolioImages?: string[];
          pastWorks?: string[];
          healedWorks?: string[];
        })[];
        const collected: GalleryItem[] = [];
        for (const a of artists) {
          const imgs = [
            ...(a.portfolioImages ?? []),
            ...(a.pastWorks ?? []),
            ...(a.healedWorks ?? []),
          ].filter(Boolean);
          for (const url of imgs) collected.push({ url, artist: a.username });
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

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [zoom]);

  const tabs: { key: TabKey; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "real", label: "Real Work", Icon: ImageIcon },
    { key: "ai", label: "AI Inspiration", Icon: Bot },
  ];

  return (
    <div className="h-svh overflow-y-auto overflow-x-hidden text-app">
      <VideoBackground />
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
          <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight">Gallery</h1>
          <p className="mt-2 text-sm text-subtle leading-relaxed">
            Browse real tattoo artistry from the Inkmity community and explore AI-generated
            concepts for inspiration. Everything here is strictly tattoo-related — stencils,
            sketches, and finished work.
          </p>
        </motion.div>

        <div className="mt-6 flex items-center justify-center gap-2">
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

        <div className="mt-8">
          {tab === "real" ? (
            <RealWork items={items} loading={loading} onOpen={setZoom} />
          ) : (
            <AiInspiration />
          )}
        </div>
      </main>

      <AnimatePresence>
        {zoom && (
          <motion.div
            className="fixed inset-0 z-[2147483646] grid place-items-center bg-black/90 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoom(null)}
          >
            <button
              type="button"
              onClick={() => setZoom(null)}
              aria-label="Close"
              className="absolute top-4 right-4 grid place-items-center h-11 w-11 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
            >
              <X className="h-5 w-5" />
            </button>
            <motion.figure
              className="relative max-w-[92vw] max-h-[88vh] flex flex-col items-center"
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={zoom.url}
                alt={`Tattoo work by ${zoom.artist}`}
                className="max-w-[92vw] max-h-[80vh] w-auto h-auto object-contain rounded-xl"
                referrerPolicy="no-referrer"
              />
              <figcaption className="mt-3 text-sm font-medium text-white/90">@{zoom.artist}</figcaption>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const RealWork: React.FC<{
  items: GalleryItem[];
  loading: boolean;
  onOpen: (item: GalleryItem) => void;
}> = ({ items, loading, onOpen }) => {
  if (loading) {
    return (
      <div className="columns-2 xs:columns-3 sm:columns-4 lg:columns-5 xl:columns-6 gap-2 sm:gap-3">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="mb-2 sm:mb-3 w-full rounded-xl bg-elevated border border-app animate-pulse"
            style={{ height: `${140 + (i % 4) * 40}px` }}
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        Icon={ImageIcon}
        title="No artwork yet"
        body="As artists publish their portfolios, their stencils and finished tattoos will show up here."
      />
    );
  }

  return (
    <div className="columns-2 xs:columns-3 sm:columns-4 lg:columns-5 xl:columns-6 gap-2 sm:gap-3">
      {items.map((item, i) => (
        <motion.button
          type="button"
          key={`${item.url}-${i}`}
          onClick={() => onOpen(item)}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -8% 0px" }}
          transition={{ duration: 0.35, delay: Math.min(i * 0.015, 0.25) }}
          className="mb-2 sm:mb-3 block w-full break-inside-avoid relative overflow-hidden rounded-xl border border-app bg-card group cursor-zoom-in"
        >
          <img
            src={item.url}
            alt={`Tattoo work by ${item.artist}`}
            loading="lazy"
            className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <figcaption className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 text-xs font-medium text-white text-left">
            @{item.artist}
          </figcaption>
        </motion.button>
      ))}
    </div>
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
