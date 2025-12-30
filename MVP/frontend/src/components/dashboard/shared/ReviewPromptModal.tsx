import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { addReview, type ReviewInput } from "@/api";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";

type Props = {
  open: boolean;
  onClose: () => void;
  artistId: string;
  artistName: string;
  bookingId?: string;
};

export default function ReviewPromptModal({ open, onClose, artistId, artistName, bookingId }: Props) {
  const { getToken } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error("Please write a review comment");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      const reviewData: ReviewInput = {
        artistClerkId: artistId,
        rating,
        text: comment.trim(),
      };
      await addReview(token, reviewData);

      toast.success("Thank you for your review!");
      setComment("");
      setRating(5);
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" style={{ background: "var(--card)", color: "var(--fg)", borderColor: "var(--border)" }}>
        <DialogHeader>
          <DialogTitle>Write a Review</DialogTitle>
          <DialogDescription>
            How was your experience with {artistName}?
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Rating</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className="focus:outline-none"
                  aria-label={`Rate ${value} stars`}
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      value <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "fill-transparent text-gray-400"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="review-comment" className="text-sm font-medium mb-2 block">
              Your Review
            </label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              rows={5}
              className="w-full"
              style={{ background: "var(--elevated)", color: "var(--fg)", borderColor: "var(--border)" }}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Skip
            </Button>
            <Button type="submit" disabled={submitting || !comment.trim()}>
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

