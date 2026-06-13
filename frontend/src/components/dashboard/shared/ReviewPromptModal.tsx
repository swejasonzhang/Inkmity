import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, ThumbsUp, Share2, Calendar, Layers, Sparkles, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { addReview, type ReviewInput } from "@/api";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";

export type ReviewDetails = {
  dateLabel?: string;
  appointmentType?: string;
  sessions?: number;
  projectName?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
  artistId: string;
  artistName: string;
  artistHandle?: string;
  bookingId?: string;
  details?: ReviewDetails;
};

const RATING_LABELS: Record<number, string> = {
  1: "Not great",
  2: "Could be better",
  3: "Solid",
  4: "Really good",
  5: "Absolutely loved it",
};

export default function ReviewPromptModal({ open, onClose, onSubmitted, artistId, artistName, artistHandle, bookingId, details }: Props) {
  const { getToken } = useAuth();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [recommend, setRecommend] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const shown = hover || rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error("Add a few words so others know what to expect");
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      const reviewData: ReviewInput = {
        artistClerkId: artistId,
        rating,
        text: comment.trim(),
        bookingId: bookingId || undefined,
        recommend,
      };
      await addReview(token, reviewData);
      toast.success("Thanks for sharing — your review helps the whole community.");
      setComment("");
      setRating(5);
      setRecommend(true);
      onSubmitted?.();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    const handle = artistHandle || artistId;
    const url = `${window.location.origin}/artist/${encodeURIComponent(handle)}`;
    const shareData = {
      title: `${artistName} on Inkmity`,
      text: `I got tattooed by ${artistName} on Inkmity — check out their work.`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied — share it with a friend!");
      }
    } catch {
    }
  };

  const chips = [
    details?.dateLabel && { icon: Calendar, label: details.dateLabel },
    details?.appointmentType && {
      icon: Sparkles,
      label: details.appointmentType === "consultation" ? "Consultation" : "Tattoo session",
    },
    details?.sessions && details.sessions > 1 && { icon: Layers, label: `${details.sessions} sessions` },
  ].filter(Boolean) as { icon: any; label: string }[];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-md overflow-hidden p-0"
        showCloseButton={true}
        style={{ background: "var(--card)", color: "var(--fg)", borderColor: "var(--border)" }}
      >
        <div className="px-6 pt-6 pb-5 border-b" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--elevated) 60%, transparent)" }}>
          <DialogHeader className="space-y-1.5">
            <div className="mx-auto mb-1 grid h-12 w-12 place-items-center rounded-2xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
              <Star className="h-6 w-6 fill-app text-app" />
            </div>
            <DialogTitle className="text-center text-xl font-extrabold tracking-tight">
              How was {artistName}?
            </DialogTitle>
            <DialogDescription className="text-center text-sm" style={{ color: "color-mix(in srgb, var(--fg) 65%, transparent)" }}>
              Your piece is done. Take 30 seconds — honest reviews help other clients book with confidence.
            </DialogDescription>
          </DialogHeader>

          {chips.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
              {chips.map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                  style={{ borderColor: "var(--border)", background: "var(--card)", color: "color-mix(in srgb, var(--fg) 80%, transparent)" }}
                >
                  <c.icon className="h-3 w-3 opacity-70" />
                  {c.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHover(value)}
                  className="rounded-md p-0.5 transition-transform hover:scale-110 focus:outline-none"
                  aria-label={`Rate ${value} stars`}
                >
                  <Star
                    className={`h-9 w-9 transition-colors ${value <= shown ? "fill-app text-app" : "fill-transparent"}`}
                    style={value <= shown ? undefined : { color: "color-mix(in srgb, var(--fg) 30%, transparent)" }}
                  />
                </button>
              ))}
            </div>
            <p className="mt-2 h-4 text-xs font-semibold tracking-wide" style={{ color: "color-mix(in srgb, var(--fg) 70%, transparent)" }}>
              {RATING_LABELS[shown] || ""}
            </p>
          </div>

          <div>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={`What stood out about working with ${artistName}? Cleanliness, the result, the vibe…`}
              rows={4}
              className="w-full resize-none"
              style={{ background: "var(--elevated)", color: "var(--fg)", borderColor: "var(--border)" }}
            />
            <p className="mt-1 text-[11px]" style={{ color: "color-mix(in srgb, var(--fg) 55%, transparent)" }}>
              Your words help others choose with confidence.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setRecommend((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors"
            style={{
              borderColor: recommend ? "var(--fg)" : "var(--border)",
              background: recommend ? "color-mix(in srgb, var(--fg) 8%, transparent)" : "var(--elevated)",
            }}
          >
            <span className="flex items-center gap-2.5">
              <ThumbsUp className="h-4 w-4" style={{ color: recommend ? "var(--fg)" : "color-mix(in srgb, var(--fg) 55%, transparent)" }} />
              <span className="text-sm font-medium">I'd recommend {artistName} to others</span>
            </span>
            <span
              className="grid h-5 w-5 place-items-center rounded-full border"
              style={{ borderColor: recommend ? "var(--fg)" : "var(--border)", background: recommend ? "var(--fg)" : "transparent" }}
            >
              {recommend && <Check className="h-3 w-3" style={{ color: "var(--bg)" }} />}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleShare}
              className="gap-1.5"
              style={{ borderColor: "var(--border)" }}
            >
              <Share2 className="h-4 w-4" />
              Recommend to a friend
            </Button>
            <div className="flex-1" />
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Skip
            </Button>
            <Button type="submit" disabled={submitting || !comment.trim()}>
              {submitting ? "Posting…" : "Post review"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
