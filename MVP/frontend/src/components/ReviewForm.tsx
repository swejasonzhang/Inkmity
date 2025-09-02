import React, { useState } from "react";

interface Props {
  onSubmit: (data: { rating: number; comment: string }) => void;
}

const ReviewForm: React.FC<Props> = ({ onSubmit }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ rating, comment });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="number"
        min={1}
        max={5}
        value={rating}
        onChange={(e) => setRating(Number(e.target.value))}
        className="p-2 rounded-md"
      />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="p-2 rounded-md"
        placeholder="Write a review"
      />
      <button
        type="submit"
        className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-md text-white"
      >
        Submit Review
      </button>
    </form>
  );
};

export default ReviewForm;
