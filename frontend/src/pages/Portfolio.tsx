import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useRole } from "@/hooks/useRole";
import { useTheme } from "@/hooks/useTheme";
import Header from "@/components/header/Header";
import { getMe, updateMyPortfolio } from "@/api";
import { getSignedUpload, uploadToCloudinary } from "@/lib/cloudinary";
import { Spinner } from "@/components/ui/spinner";
import LazyReveal from "@/components/ui/LazyReveal";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Plus, X, ImageIcon, Save, Star } from "lucide-react";

const MAX_IMAGES = 30;

export default function Portfolio() {
  const { getToken } = useAuth();
  const { role, isLoaded } = useRole();
  const { theme } = useTheme();
  const isArtist = role === "artist";

  const [images, setImages] = useState<string[]>([]);
  const [ideas, setIdeas] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useLayoutEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "transparent";
    return () => {
      document.body.style.backgroundColor = prev;
    };
  }, [theme]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isArtist) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const me = await getMe({ token: token ?? undefined });
        if (!cancelled) {
          setImages((me?.portfolioImages ?? []).filter(Boolean));
          const ideaMap: Record<string, string> = {};
          for (const m of me?.portfolioMeta ?? []) {
            if (m?.url && m?.idea) ideaMap[m.url] = m.idea;
          }
          setIdeas(ideaMap);
        }
      } catch {
        if (!cancelled) setImages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isArtist]);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const token = await getToken();
      const sig = await getSignedUpload("artist_portfolio", token ?? undefined);
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        if (images.length + uploaded.length >= MAX_IMAGES) {
          toast.info(`You can upload up to ${MAX_IMAGES} images.`);
          break;
        }
        if (file.size > 12 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 12MB).`);
          continue;
        }
        try {
          const res = await uploadToCloudinary(file, sig);
          const url = res.secure_url || res.url;
          if (url) uploaded.push(url);
        } catch {
          toast.error(`Failed to upload ${file.name}.`);
        }
      }
      if (uploaded.length) {
        setImages((prev) => [...prev, ...uploaded].slice(0, MAX_IMAGES));
        setDirty(true);
      }
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeAt = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const makeCover = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const next = [...prev];
      const [picked] = next.splice(index, 1);
      next.unshift(picked);
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      const meta = images
        .filter((url) => (ideas[url] ?? "").trim())
        .map((url) => ({ url, idea: ideas[url].trim() }));
      await updateMyPortfolio(images, meta, token ?? undefined);
      setDirty(false);
      toast.success("Portfolio saved.");
    } catch {
      toast.error("Failed to save portfolio.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-dvh bg-app text-app flex flex-col">
      <Header />
      <ToastContainer position="top-center" theme={theme === "light" ? "light" : "dark"} autoClose={2500} />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Your Portfolio</h1>
            <p className="mt-1 text-sm text-subtle">
              Showcase your best tattoo work. Add or remove pieces anytime — your first three are featured, and the very first is your cover.
            </p>
          </div>
          {isArtist && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-muted">{images.length}/{MAX_IMAGES}</span>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || images.length >= MAX_IMAGES}
                className="inline-flex items-center gap-2 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 text-sm font-semibold transition disabled:opacity-50"
              >
                {uploading ? <Spinner size={16} className="text-white" /> : <Plus className="h-4 w-4" />}
                Add images
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || !dirty}
                className="inline-flex items-center gap-2 rounded-xl border border-app bg-elevated hover:bg-elevated/70 text-app px-4 py-2 text-sm font-semibold transition disabled:opacity-50"
              >
                {saving ? <Spinner size={16} className="text-[color:var(--fg)]" /> : <Save className="h-4 w-4" />}
                {dirty ? "Save changes" : "Saved"}
              </button>
            </div>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />

        {!isArtist && isLoaded ? (
          <EmptyState
            title="Portfolios are for artist accounts"
            body="Switch to or create an artist account to build and manage your tattoo portfolio."
          />
        ) : (
          <LazyReveal
            loading={loading}
            skeleton={
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-xl ink-shimmer" />
                ))}
              </div>
            }
          >
          {images.length === 0 ? (
          <EmptyState
            title="No work yet"
            body="Upload your first tattoo photos or stencils to start your portfolio."
            action={
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 text-sm font-semibold transition"
              >
                <Plus className="h-4 w-4" /> Add images
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {images.map((url, i) => (
              <div key={`${url}-${i}`} className="group flex flex-col gap-1.5">
                <figure
                  className={`relative aspect-square overflow-hidden rounded-xl bg-card transition ${
                    i < 3
                      ? "ring-2 ring-[var(--fg)] ring-offset-2 ring-offset-[var(--bg)] shadow-[0_10px_30px_-8px_rgba(0,0,0,0.55)]"
                      : "border border-app"
                  }`}
                >
                  <img src={url} alt={`Portfolio piece ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
                  {i < 3 && (
                    <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded-full bg-[var(--fg)] text-[var(--bg)] text-[10px] font-bold px-2 py-0.5 shadow">
                      <Star className="h-3 w-3" /> {i === 0 ? "Cover" : "Featured"}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {i !== 0 && (
                      <button
                        type="button"
                        onClick={() => makeCover(i)}
                        title="Make cover"
                        className="grid place-items-center h-7 w-7 rounded-full bg-white/90 text-black hover:bg-white transition"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAt(i)}
                      title="Remove"
                      className="grid place-items-center h-7 w-7 rounded-full bg-black text-white hover:bg-neutral-800 transition"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </figure>
                <input
                  value={ideas[url] ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setIdeas((prev) => ({ ...prev, [url]: v }));
                    setDirty(true);
                  }}
                  maxLength={80}
                  placeholder="Describe the idea — e.g. dragon origami back tattoo"
                  className="w-full rounded-lg border border-app bg-elevated px-2.5 py-1.5 text-xs text-app placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-[color:var(--fg)]/20"
                />
              </div>
            ))}
          </div>
        )}
          </LazyReveal>
        )}
      </main>
    </div>
  );
}

const EmptyState: React.FC<{ title: string; body: string; action?: React.ReactNode }> = ({ title, body, action }) => (
  <div className="flex flex-col items-center justify-center text-center gap-3 rounded-2xl border border-app bg-card px-6 py-16">
    <span className="grid place-items-center h-12 w-12 rounded-2xl border border-white/40 bg-elevated">
      <ImageIcon className="h-5 w-5 text-subtle" />
    </span>
    <h2 className="text-base font-bold text-app">{title}</h2>
    <p className="text-sm text-subtle max-w-sm leading-relaxed">{body}</p>
    {action}
  </div>
);
