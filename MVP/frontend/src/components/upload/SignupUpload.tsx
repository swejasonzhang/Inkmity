import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSignedUpload, uploadToCloudinary } from "@/lib/cloudinary";
import { Image as ImageIcon, Trash2, Info, UploadCloud } from "lucide-react";
import clsx from "clsx";

type Slot = {
    id: string;
    file?: File;
    url?: string;
    preview?: string;
    uploading?: boolean;
    error?: string;
    publicId?: string;
};

type Props = {
    label: string;
    kind: "client_ref" | "artist_portfolio";
    value: string[];
    onChange: (urls: string[]) => void;
    className?: string;
    accept?: string;
    maxSizeMB?: number;
};

const MAX_PARALLEL_UPLOADS = 3;
const MAX_ITEMS = 3;

export default function SignupUpload({
    label,
    kind,
    value,
    onChange,
    className,
    accept = "image/*",
    maxSizeMB = 12,
}: Props): React.ReactElement {
    const { getToken } = useAuth();
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const dropRef = useRef<HTMLDivElement | null>(null);

    const [slots, setSlots] = useState<Slot[]>(() => value.slice(0, MAX_ITEMS).map((url) => ({ id: `init-${url}`, url })));
    const [isDragging, setIsDragging] = useState(false);
    const [queue, setQueue] = useState<string[]>([]);
    const [activeUploads, setActiveUploads] = useState(0);

    const idSeq = useRef(0);
    const slotsRef = useRef<Slot[]>(slots);
    const queueRef = useRef<string[]>(queue);

    useEffect(() => {
        slotsRef.current = slots;
    }, [slots]);

    useEffect(() => {
        queueRef.current = queue;
    }, [queue]);

    useEffect(() => {
        setSlots((prev) => {
            const cap = MAX_ITEMS;
            const fromProps = value.slice(0, cap).map<Slot>((u) => ({ id: `prop-${u}`, url: u }));
            const nonRemote = prev.filter((s) => s.file && !s.url);
            const remain = Math.max(0, cap - fromProps.length);
            return [...fromProps, ...nonRemote.slice(0, remain)];
        });
    }, [value]);

    useEffect(() => {
        const urls = slots.map((s) => s.url).filter(Boolean) as string[];
        if (JSON.stringify(urls) !== JSON.stringify(value)) onChange(urls);
    }, [slots, onChange, value]);

    useEffect(() => {
        return () => {
            slotsRef.current.forEach((s) => {
                if (s.preview) URL.revokeObjectURL(s.preview);
            });
        };
    }, []);

    const validateFile = useCallback(
        (file: File): string | null => {
            const mb = file.size / (1024 * 1024);
            if (mb > maxSizeMB) return `File too large (>${maxSizeMB}MB)`;
            if (accept && accept !== "*") {
                const accepts = accept.split(",").map((s) => s.trim().toLowerCase());
                const ok = accepts.some((a) => {
                    if (a.endsWith("/*")) {
                        const prefix = a.slice(0, -2);
                        return file.type.toLowerCase().startsWith(prefix);
                    }
                    return file.type.toLowerCase() === a || file.name.toLowerCase().endsWith(a);
                });
                if (!ok) return "Unsupported file type";
            }
            return null;
        },
        [accept, maxSizeMB]
    );

    const addFiles = useCallback(
        (files: FileList | File[]) => {
            const current = slotsRef.current.length;
            const capacity = Math.max(0, MAX_ITEMS - current);
            if (capacity === 0) return;

            const nextSlots: Slot[] = [];
            const nextIds: string[] = [];
            let added = 0;

            for (const f of Array.from(files)) {
                if (added >= capacity) break;
                const err = validateFile(f);
                const id = `new-${Date.now()}-${idSeq.current++}`;
                if (err) {
                    nextSlots.push({ id, file: f, error: err, preview: URL.createObjectURL(f) });
                } else {
                    nextSlots.push({ id, file: f, preview: URL.createObjectURL(f) });
                    nextIds.push(id);
                }
                added++;
            }

            if (nextSlots.length) setSlots((prev) => [...prev, ...nextSlots]);
            if (nextIds.length) setQueue((prev) => [...prev, ...nextIds]);
        },
        [validateFile]
    );

    useEffect(() => {
        if (activeUploads >= MAX_PARALLEL_UPLOADS) return;
        if (queue.length === 0) return;

        let cancelled = false;

        const run = async () => {
            while (!cancelled && activeUploads < MAX_PARALLEL_UPLOADS && queueRef.current.length > 0) {
                const id = queueRef.current[0];
                setQueue((q) => q.slice(1));
                setActiveUploads((n) => n + 1);

                setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, uploading: true, error: undefined } : s)));

                try {
                    await getToken().catch(() => undefined);
                    const sig = await getSignedUpload(kind);

                    const current = slotsRef.current.find((s) => s.id === id);
                    const file = current?.file;
                    if (!file) throw new Error("Missing file");

                    const { url, publicId } = await uploadToCloudinary(file, sig);
                    if (!url) throw new Error("No URL returned");

                    setSlots((prev) =>
                        prev.map((s) => (s.id === id ? { ...s, url, publicId, uploading: false } : s))
                    );
                } catch (e: any) {
                    setSlots((prev) =>
                        prev.map((s) => (s.id === id ? { ...s, uploading: false, error: e?.message || "Upload failed" } : s))
                    );
                } finally {
                    setActiveUploads((n) => n - 1);
                }
            }
        };

        run();

        return () => {
            cancelled = true;
        };
    }, [queue, activeUploads, getToken, kind]);

    useEffect(() => {
        const el = dropRef.current;
        if (!el) return;

        const onDragOver = (e: DragEvent) => {
            e.preventDefault();
            setIsDragging(true);
        };
        const onDragLeave = (e: DragEvent) => {
            if (!el.contains(e.relatedTarget as Node)) setIsDragging(false);
        };
        const onDrop = (e: DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
        };

        el.addEventListener("dragover", onDragOver);
        el.addEventListener("dragleave", onDragLeave as any);
        el.addEventListener("drop", onDrop);

        return () => {
            el.removeEventListener("dragover", onDragOver);
            el.removeEventListener("dragleave", onDragLeave as any);
            el.removeEventListener("drop", onDrop);
        };
    }, [addFiles]);

    useEffect(() => {
        const onPaste = (e: ClipboardEvent) => {
            if (!document.activeElement || !(document.activeElement as HTMLElement).isContentEditable) {
                const files = e.clipboardData?.files;
                if (files && files.length) addFiles(files);
            }
        };
        window.addEventListener("paste", onPaste);
        return () => window.removeEventListener("paste", onPaste);
    }, [addFiles]);

    const openPicker = () => inputRef.current?.click();

    const removeAt = (idx: number) => {
        const s = slotsRef.current[idx];
        if (!s) return;
        if (s.preview) URL.revokeObjectURL(s.preview);
        setSlots((prev) => prev.filter((_, i) => i !== idx));
        setQueue((prev) => prev.filter((qid) => qid !== s.id));
    };

    const uploadedCount = slots.filter((s) => !!s.url).length;
    const uploadingCount = slots.filter((s) => !!s.uploading).length;
    const queuedCount = slots.filter((s) => s.file && !s.url && !s.uploading && !s.error).length;
    const failedCount = slots.filter((s) => !!s.error).length;

    const acceptLabel =
        accept === "image/*"
            ? "Images (JPG, PNG, WEBP, HEIC)"
            : accept
                .split(",")
                .map((s) => s.trim().toUpperCase())
                .join(", ");

    return (
        <div className={clsx("w-full grid place-items-center", className)}>
            <div className="w-full max-w-4xl">
                <div className="flex flex-col items-center gap-3 text-center">
                    <label htmlFor={inputId} className="text-sm md:text-base font-semibold text-app">
                        {label}
                    </label>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <Badge variant="outline" className="text-xs">Uploaded {uploadedCount}</Badge>
                        <Badge variant="outline" className="text-xs">Uploading {uploadingCount}</Badge>
                        <Badge variant="outline" className="text-xs">Queued {queuedCount}</Badge>
                        {failedCount > 0 && <Badge variant="outline" className="text-xs">Failed {failedCount}</Badge>}
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={openPicker} aria-label="Add images">
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Add
                    </Button>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-white/60">
                        <Info className="h-3.5 w-3.5" />
                        <span>{acceptLabel}. Up to {maxSizeMB}MB each. Drag, drop, or paste to upload.</span>
                    </div>
                </div>

                <input
                    id={inputId}
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    className="hidden"
                    multiple
                    onChange={(e) => {
                        if (e.target.files?.length) addFiles(e.target.files);
                        e.currentTarget.value = "";
                    }}
                />

                <div
                    ref={dropRef}
                    className={clsx(
                        "mt-3 rounded-xl border border-app bg-card/70 backdrop-blur p-5 transition grid place-items-center",
                        isDragging ? "ring-2 ring-[color:var(--border)]/60" : null
                    )}
                >
                    {slots.length === 0 && (
                        <div className="col-span-full w-full grid place-items-center">
                            <div className="aspect-square rounded-lg border border-app grid place-items-center text-subtle w-36 sm:w-40" aria-hidden="true">
                                <div className="flex flex-col items-center">
                                    <ImageIcon className="h-8 w-8" />
                                    <span className="mt-1 text-xs">Drop, paste, or use Add</span>
                                </div>
                            </div>
                            <p className="mt-2 text-xs text-white/60 text-center">Tip: You can paste images from your clipboard.</p>
                        </div>
                    )}

                    {slots.length > 0 && (
                        <div className="w-full">
                            <div className="mb-3 text-xs text-white/60 text-center">Drop more images here or use Add</div>

                            <div className="w-full max-w-3xl mx-auto grid grid-cols-3 gap-4 sm:gap-5 md:gap-6 justify-items-stretch content-start px-2">
                                {slots.map((s, i) => {
                                    const src = s.url || s.preview || "";
                                    const isQueued = !!s.file && !s.url && !s.uploading && !s.error;
                                    return (
                                        <div
                                            key={s.id}
                                            className="relative w-full rounded-lg overflow-hidden border border-app bg-elevated"
                                        >
                                            <div className="aspect-square p-2 sm:p-3">
                                                {src ? (
                                                    <img
                                                        src={src}
                                                        alt={`Upload ${i + 1}`}
                                                        className={clsx("block h-full w-full rounded-md object-cover object-center", s.uploading ? "opacity-70" : "")}
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="h-full w-full grid place-items-center text-muted text-sm rounded-md">Pending</div>
                                                )}
                                            </div>

                                            <div className="absolute top-2 right-2 flex items-center gap-1">
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="outline"
                                                    className="h-8 w-8 rounded-full"
                                                    onClick={() => removeAt(i)}
                                                    disabled={s.uploading}
                                                    aria-label="Remove"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            {s.uploading && <div className="absolute inset-0 grid place-items-center bg-black/35 text-xs">Uploading…</div>}
                                            {isQueued && <div className="absolute inset-x-0 bottom-0 px-2 py-1 text-[11px] text-white/90 bg-black/45 text-center">Queued</div>}
                                            {s.error && <div className="absolute inset-x-0 bottom-0 p-2 text-[11px] text-red-300 bg-black/60">{s.error}</div>}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-3 text-xs text-white/60 text-center">Uploads run in the background. You can continue filling the form.</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}