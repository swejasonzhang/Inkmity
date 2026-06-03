import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ImageIcon, Bot, ShieldCheck } from "lucide-react";
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

  const tabs: { key: TabKey; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "real", label: "Real Work", Icon: ImageIcon },
    { key: "ai", label: "AI Inspiration", Icon: Bot },
  ];

  return (
    <div className="h-svh overflow-y-auto overflow-x-hidden text-app">
      <VideoBackground />
      <Header />

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-16">
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
            <RealWork items={items} loading={loading} />
          ) : (
            <AiInspiration />
          )}
        </div>
      </main>
    </div>
  );
};

const RealWork: React.FC<{ items: GalleryItem[]; loading: boolean }> = ({ items, loading }) => {
  const shuffled = useMemo(() => items, [items]);

  if (loading) {
    return (
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 sm:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="mb-3 sm:mb-4 w-full rounded-xl bg-elevated border border-app animate-pulse"
            style={{ height: `${160 + (i % 4) * 40}px` }}
          />
        ))}
      </div>
    );
  }

  if (shuffled.length === 0) {
    return (
      <EmptyState
        Icon={ImageIcon}
        title="No artwork yet"
        body="As artists publish their portfolios, their stencils and finished tattoos will show up here."
      />
    );
  }

  return (
    <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 sm:gap-4">
      {shuffled.map((item, i) => (
        <motion.figure
          key={`${item.url}-${i}`}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -10% 0px" }}
          transition={{ duration: 0.4, delay: Math.min(i * 0.02, 0.3) }}
          className="mb-3 sm:mb-4 break-inside-avoid relative overflow-hidden rounded-xl border border-app bg-card group"
        >
          <img
            src={item.url}
            alt={`Tattoo work by ${item.artist}`}
            loading="lazy"
            className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <figcaption className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 text-xs font-medium text-white">
            @{item.artist}
          </figcaption>
        </motion.figure>
      ))}
    </div>
  );
};

const AiInspiration: React.FC = () => (
  <div className="max-w-xl mx-auto">
    <EmptyState
      Icon={Bot}
      title="AI inspiration is coming soon"
      body="We're building a space for AI-generated tattoo concepts — clearly labeled and kept separate from real artist work, so you always know what's a reference and what's the real thing."
    />
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
  <div className="flex flex-col items-center justify-center text-center gap-3 rounded-2xl border border-app bg-card px-6 py-14">
    <span className="grid place-items-center h-12 w-12 rounded-2xl border border-app/40 bg-elevated">
      <Icon className="h-5 w-5 text-subtle" />
    </span>
    <h2 className="text-base font-bold text-app">{title}</h2>
    <p className="text-sm text-subtle max-w-sm leading-relaxed">{body}</p>
  </div>
);

export default Gallery;
