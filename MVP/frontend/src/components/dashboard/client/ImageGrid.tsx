import React from "react";
import { Maximize2 } from "lucide-react";

type Props = {
    images: string[];
    imgAltPrefix: string;
    startOffset?: number;
    onOpenZoom: (index: number) => void;
};

const ImageGrid: React.FC<Props> = ({ images, imgAltPrefix, startOffset = 0, onOpenZoom }) => (
    <div className="w-full flex justify-center">
        <div
            className="mx-auto grid justify-items-center gap-5
      max-w-[calc(4*22rem+3*1.25rem)]
      grid-cols-[repeat(auto-fit,minmax(22rem,1fr))]"
        >
            {images.map((src, i) => (
                <button
                    key={`${src}-${i}`}
                    onClick={() => onOpenZoom(startOffset + i)}
                    className="group relative w-full max-w-[360px] aspect-[4/3] rounded-3xl border shadow-sm overflow-hidden flex items-center justify-center ring-offset-background transition-all hover:shadow-xl hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                    aria-label={`Open ${imgAltPrefix} ${i + 1}`}
                >
                    <img
                        src={src}
                        alt={`${imgAltPrefix} ${i + 1}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                        loading={i < 4 ? "eager" : "lazy"}
                        fetchPriority={i < 4 ? "high" : undefined}
                        decoding="async"
                        referrerPolicy="no-referrer"
                    />
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                        <div
                            className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm border"
                            style={{
                                background: "color-mix(in oklab, var(--elevated) 80%, transparent)",
                                borderColor: "var(--border)",
                                color: "var(--fg)",
                            }}
                        >
                            <Maximize2 className="h-3.5 w-3.5" /> View
                        </div>
                    </div>
                </button>
            ))}
        </div>
    </div>
);

export default ImageGrid;