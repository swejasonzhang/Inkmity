import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";

interface Artist {
  _id: string;
  name: string;
  bio?: string;
  location?: string;
  style?: string[];
  priceRange?: { min: number; max: number };
  rating?: number;
  images?: string[];
  socials?: { instagram?: string; website?: string };
}

interface ArtistModalProps {
  isOpen: boolean;
  onClose: () => void;
  artist: Artist;
  onMessage: (artist: Artist) => void;
}

function ArtistModal({ isOpen, onClose, artist, onMessage }: ArtistModalProps) {
  if (!artist) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        {/* Modal Panel */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-6 text-gray-900">
              <Dialog.Title className="text-xl font-bold mb-2">
                {artist.name}
              </Dialog.Title>
              {artist.bio && <p className="text-gray-700 mb-4">{artist.bio}</p>}
              <p className="text-sm text-gray-600">
                Location: {artist.location || "N/A"}
              </p>
              <p className="text-sm text-gray-600">
                Style: {artist.style?.join(", ") || "N/A"}
              </p>
              <p className="text-sm text-gray-600">
                Price Range:{" "}
                {artist.priceRange
                  ? `$${artist.priceRange.min} - $${artist.priceRange.max}`
                  : "N/A"}
              </p>
              <p className="text-sm text-gray-600">
                Rating: {artist.rating?.toFixed(1) || "0"}
              </p>

              {/* Images */}
              {artist.images && artist.images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {artist.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`${artist.name}-${idx}`}
                      className="w-full h-40 object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}

              {/* Socials */}
              <div className="mt-4 flex gap-3">
                {artist.socials?.instagram && (
                  <a
                    href={artist.socials.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
                  >
                    Instagram
                  </a>
                )}
                {artist.socials?.website && (
                  <a
                    href={artist.socials.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Website
                  </a>
                )}
              </div>

              {/* Buttons */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => onMessage(artist)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Message
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

export default ArtistModal;