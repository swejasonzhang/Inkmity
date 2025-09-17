import React from "react";

interface Artist {
  _id: string;
  name: string;
  bio?: string;
  location?: string;
  style?: string[];
  priceRange?: { min: number; max: number };
  rating?: number;
  images?: string[];
  socialLinks?: { platform: string; url: string }[];
}

interface Props {
  artist: Artist;
  onClose: () => void;
  onMessage: (artist: Artist) => void;
}

const ArtistModal: React.FC<Props> = ({ artist, onClose, onMessage }) => {
  // const [reviewRating, setReviewRating] = useState<number>(5);
  // const [reviewComment, setReviewComment] = useState<string>("");

  // const handleSubmitReview = async () => {
  //   console.log({
  //     artistId: artist._id,
  //     rating: reviewRating,
  //     comment: reviewComment,
  //   });
  //   setReviewRating(5);
  //   setReviewComment("");
  //   alert("Review submitted!");
  // };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold text-white mb-4">{artist.name}</h2>
        <p className="text-gray-300 mb-2">{artist.bio}</p>
        <p className="text-gray-400 text-sm mb-2">
          Location: {artist.location}
        </p>
        <p className="text-gray-400 text-sm mb-2">
          Price Range:{" "}
          {artist.priceRange
            ? `$${artist.priceRange.min} - $${artist.priceRange.max}`
            : "N/A"}
        </p>
        <p className="text-gray-400 text-sm mb-2">
          Style: {artist.style?.join(", ")}
        </p>
        <p className="text-gray-400 text-sm mb-4">
          Rating: {artist.rating?.toFixed(1) || "0"}
        </p>

        {artist.images && artist.images.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {artist.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`${artist.name} work ${i + 1}`}
                className="rounded-lg object-cover w-full h-40"
              />
            ))}
          </div>
        )}

        {artist.socialLinks && (
          <div className="flex gap-4 mb-4">
            {artist.socialLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:underline"
              >
                {link.platform}
              </a>
            ))}
          </div>
        )}

        <button
          onClick={() => onMessage(artist)}
          className="bg-indigo-700 text-white px-4 py-2 rounded hover:bg-indigo-600 mb-4"
        >
          Message {artist.name}
        </button>

        {/* <div className="flex flex-col gap-2">
          <label className="text-gray-300">Rating (1-5)</label>
          <input
            type="number"
            min={1}
            max={5}
            value={reviewRating}
            onChange={(e) => setReviewRating(Number(e.target.value))}
            className="px-2 py-1 rounded bg-gray-700 text-white"
          />
          <label className="text-gray-300">Comment</label>
          <textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            className="px-2 py-1 rounded bg-gray-700 text-white"
          />
          <button
            onClick={handleSubmitReview}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500"
          >
            Submit Review
          </button>
        </div> */}
      </div>
    </div>
  );
};

export default ArtistModal;
