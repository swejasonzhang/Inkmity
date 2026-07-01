import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Sparkles, ImageIcon, Bot, ShieldCheck, ThumbsUp, Flame, Search, TrendingUp, Flag } from "lucide-react";
import { toast } from "react-toastify";
import Header from "@/components/header/Header";
import LazyReveal from "@/components/ui/LazyReveal";
import VerifiedBadge from "@/components/dashboard/shared/VerifiedBadge";
import ReportModal from "@/components/dashboard/shared/ReportModal";
import { fetchPopularArtworks, getTrendingIdeas, toggleArtworkLike, type PopularArtwork, type TrendingIdea } from "@/api";
import { cldCard, cldThumb } from "@/lib/img";

type TabKey = "real" | "ai";

const Gallery: React.FC = () => {
  const [tab, setTab] = useState<TabKey>("real");
  const [items, setItems] = useState<PopularArtwork[]>([]);
  const [trending, setTrending] = useState<TrendingIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [reportTarget, setReportTarget] = useState<PopularArtwork | null>(null);
  const { getToken } = useAuth();
  const { isSignedIn } = useUser();

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const token = isSignedIn ? await getToken() : null;
        const res = await fetchPopularArtworks(token, controller.signal, 80);
        setItems(res?.items ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [isSignedIn, getToken]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await getTrendingIdeas(controller.signal);
        setTrending(res?.items ?? []);
      } catch {
        setTrending([]);
      }
    })();
    return () => controller.abort();
  }, []);

  const onToggleLike = async (it: PopularArtwork) => {
    if (!isSignedIn) {
      toast.info("Sign in to save favorites.", { position: "top-center", hideProgressBar: true });
      return;
    }
    if (!it) return;
    const isSame = (w: PopularArtwork) => w.artistClerkId === it.artistClerkId && w.url === it.url;
    const nextLiked = !it.likedByMe;
    setItems((prev) =>
      prev.map((w) => (isSame(w) ? { ...w, likedByMe: nextLiked, likes: Math.max(0, w.likes + (nextLiked ? 1 : -1)) } : w))
    );
    try {
      const token = await getToken();
      const res = await toggleArtworkLike({ artistClerkId: it.artistClerkId, imageUrl: it.url }, token);
      setItems((prev) => prev.map((w) => (isSame(w) ? { ...w, likedByMe: res.liked, likes: res.likes } : w)));
    } catch {
      setItems((prev) =>
        prev.map((w) => (isSame(w) ? { ...w, likedByMe: it.likedByMe, likes: it.likes } : w))
      );
      toast.error("Couldn't update — try again.", { position: "top-center", hideProgressBar: true });
    }
  };

  const tabs: { key: TabKey; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "real", label: "Real Work", Icon: ImageIcon },
    { key: "ai", label: "AI Inspiration", Icon: Bot },
  ];

  const q = query.trim().toLowerCase();
  const shownItems = q
    ? items.filter((it) =>
        `${it.idea ?? ""} ${it.username ?? ""} ${it.handle ?? ""} ${(it.styles ?? []).join(" ")}`
          .toLowerCase()
          .includes(q)
      )
    : items;

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
            The most-loved pieces and fresh ideas across Inkmity. Tap a thumbs-up on what speaks to you, or open the artist to book.
          </p>
        </motion.div>

        <div className="mt-6 max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ideas…"
              className="w-full h-11 pl-10 pr-9 rounded-full border border-app bg-elevated text-app placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-[color:var(--fg)]/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-app text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>

          {trending.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs">
              <span className="inline-flex items-center gap-1 text-subtle font-medium">
                <TrendingUp className="h-3.5 w-3.5" /> Trending ideas:
              </span>
              {trending.map((idea) => (
                <button
                  key={idea.label}
                  type="button"
                  onClick={() => setQuery(idea.query)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-app/50 bg-elevated pl-1 pr-2.5 py-1 text-subtle hover:text-app hover:border-app transition"
                >
                  <img src={cldThumb(idea.image, 40)} alt="" width={20} height={20} decoding="async" className="h-5 w-5 rounded-full object-cover" />
                  {idea.label}
                </button>
              ))}
            </div>
          )}
        </div>

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

        <div className="mt-8">
          {tab === "real" ? (
            <PopularGrid
              items={shownItems}
              loading={loading}
              onToggleLike={onToggleLike}
              onReport={(it) => {
                if (!isSignedIn) {
                  toast.info("Sign in to report.", { position: "top-center", hideProgressBar: true });
                  return;
                }
                setReportTarget(it);
              }}
            />
          ) : (
            <AiInspiration />
          )}
        </div>
      </main>

      <ReportModal
        open={reportTarget !== null}
        targetType="artwork"
        targetRef={reportTarget?.url || ""}
        targetOwnerClerkId={reportTarget?.artistClerkId}
        onClose={() => setReportTarget(null)}
      />
    </div>
  );
};

const SPANS = [22, 28, 24, 32, 26, 20];

const PopularGrid: React.FC<{
  items: PopularArtwork[];
  loading: boolean;
  onToggleLike: (item: PopularArtwork) => void;
  onReport: (item: PopularArtwork) => void;
}> = ({ items, loading, onToggleLike, onReport }) => {
  const skeleton = (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-[10px] gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="rounded-2xl ink-shimmer" style={{ gridRow: `span ${SPANS[i % SPANS.length]}` }} />
      ))}
    </div>
  );

  return (
    <LazyReveal loading={loading} skeleton={skeleton}>
      {items.length === 0 ? (
        <EmptyState
          Icon={ImageIcon}
          title="No artwork yet"
          body="As artists publish their portfolios, their best pieces will rise to the top here."
        />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2 text-sm font-bold">
            <Flame className="h-4 w-4" /> Most loved right now
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-[10px] gap-3">
            {items.map((item, i) => (
              <ArtworkTile key={`${item.artistClerkId}-${item.url}`} item={item} span={SPANS[i % SPANS.length]} onLike={() => onToggleLike(item)} onReport={() => onReport(item)} />
            ))}
          </div>
        </>
      )}
    </LazyReveal>
  );
};

const ArtworkTile: React.FC<{ item: PopularArtwork; span: number; onLike: () => void; onReport: () => void }> = ({ item, span, onLike, onReport }) => {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/artist/${encodeURIComponent(item.handle)}`)}
      onKeyDown={(e) => { if (e.key === "Enter") navigate(`/artist/${encodeURIComponent(item.handle)}`); }}
      aria-label={`View ${item.username}'s portfolio`}
      style={{ gridRow: `span ${span}` }}
      className="relative overflow-hidden rounded-2xl border border-app bg-card group cursor-pointer"
    >
      {!loaded && <span className="ink-shimmer absolute inset-0" aria-hidden />}
      <img
        src={cldCard(item.url, 600)}
        alt={`Tattoo work by ${item.username}`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06] ${loaded ? "ink-fade-in" : "opacity-0"}`}
      />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onReport(); }}
        aria-label="Report this piece"
        title="Report"
        className="absolute top-2 left-2 grid place-items-center h-8 w-8 rounded-full border bg-black/40 text-white border-white/30 hover:bg-black/60 backdrop-blur-md transition opacity-0 group-hover:opacity-100"
      >
        <Flag className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onLike(); }}
        aria-pressed={item.likedByMe}
        aria-label={item.likedByMe ? "Remove like" : "Like this piece"}
        className={`absolute top-2 right-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold border backdrop-blur-md transition ${
          item.likedByMe
            ? "bg-[color:var(--fg)] text-[color:var(--bg)] border-transparent"
            : "bg-black/40 text-white border-white/30 hover:bg-black/60"
        }`}
      >
        <ThumbsUp className={`h-3.5 w-3.5 ${item.likedByMe ? "fill-current" : ""}`} />
        {item.likes}
      </button>

      <div className="absolute inset-x-0 bottom-0 px-3 py-2.5 flex items-center gap-1.5 text-white">
        <span className="text-xs font-semibold truncate">@{item.username}</span>
        {item.verified && <VerifiedBadge size={13} className="!text-white shrink-0" />}
      </div>
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
