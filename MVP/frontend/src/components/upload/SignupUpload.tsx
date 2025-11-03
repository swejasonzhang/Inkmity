import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getSignedUpload, uploadToCloudinary } from "@/lib/cloudinary";
import { Image as ImageIcon, Trash2, UploadCloud } from "lucide-react";
import clsx from "clsx";

type Slot = {
    file?: File;
    url?: string;
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

    const [slots, setSlots] = useState<Slot[]>(() => value.map((url) => ({ url })));
    const [isDragging, setIsDragging] = useState(false);
    const [queue, setQueue] = useState<number[]>([]);
    const [activeUploads, setActiveUploads] = useState(0);

    useEffect(() => {
        setSlots((prev) => {
            const fromProps = value.map<Slot>((u) => ({ url: u }));
            const nonRemote = prev.filter((s) => s.file && !s.url);
            return [...fromProps, ...nonRemote];
        });
    }, [value]);

    useEffect(() => {
        const urls = slots.map((s) => s.url).filter(Boolean) as string[];
        if (JSON.stringify(urls) !== JSON.stringify(value)) onChange(urls);
    }, [slots, onChange, value]);

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
            const next: Slot[] = [];
            Array.from(files).forEach((f) => {
                const err = validateFile(f);
                next.push(err ? { file: f, error: err } : { file: f });
            });
            setSlots((prev) => [...prev, ...next]);
            setQueue((prev) => [
                ...prev,
                ...next
                    .map((_, i) => prev.length + i)
                    .filter((idx) => !next[idx - prev.length]?.error),
            ]);
        },
        [validateFile]
    );

    useEffect(() => {
        if (activeUploads >= MAX_PARALLEL_UPLOADS) return;
        if (queue.length === 0) return;

        let cancelled = false;
        const run = async () => {
            while (!cancelled && activeUploads < MAX_PARALLEL_UPLOADS && queue.length > 0) {
                const idx = queue[0];
                setQueue((q) => q.slice(1));
                setActiveUploads((n) => n + 1);
                setSlots((prev) =>
                    prev.map((s, i) => (i === idx ? { ...s, uploading: true, error: undefined } : s))
                );

                try {
                    await getToken().catch(() => undefined);
                    const sig = await getSignedUpload(kind);
                    const file = slots[idx]?.file;
                    if (!file) throw new Error("Missing file");

                    const { url, publicId } = await uploadToCloudinary(file, sig);
                    if (!url) throw new Error("No URL returned");

                    setSlots((prev) =>
                        prev.map((s, i) =>
                            i === idx ? { ...s, url, publicId, uploading: false, file: undefined } : s
                        )
                    );
                } catch (e: any) {
                    setSlots((prev) =>
                        prev.map((s, i) =>
                            i === idx ? { ...s, uploading: false, error: e?.message || "Upload failed" } : s
                        )
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
    }, [queue, activeUploads, getToken, kind, slots]);

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
        setSlots((prev) => prev.filter((_, i) => i !== idx));
    };

    const hasLocal = slots.some((s) => s.file && !s.url);
    const uploadedCount = slots.filter((s) => !!s.url).length;

    return (
        <div className={clsx("w-full", className)}>
            <div className="flex items-center justify-between gap-3">
                <label htmlFor={inputId} className="text-sm md:text-base font-semibold text-app">
                    {label}
                </label>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                        {uploadedCount} uploaded
                    </Badge>
                    <Separator orientation="vertical" className="h-5" />
                    <Button type="button" variant="outline" size="sm" onClick={openPicker}>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Add
                    </Button>
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
                    "mt-3 rounded-xl border border-app bg-card/70 backdrop-blur p-4 transition",
                    isDragging ? "ring-2 ring-[color:var(--border)]/60" : null
                )}
            >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    <button
                        type="button"
                        onClick={openPicker}
                        className={clsx(
                            "aspect-square rounded-lg border border-app grid place-items-center text-subtle",
                            "hover:bg-elevated active:scale-[0.99] transition"
                        )}
                        aria-label="Add images"
                    >
                        <div className="flex flex-col items-center">
                            <ImageIcon className="h-8 w-8" />
                            <span className="mt-1 text-xs">Drop, paste, or click</span>
                        </div>
                    </button>

                    {slots.map((s, i) => {
                        const src = s.url || (s.file ? URL.createObjectURL(s.file) : "");
                        return (
                            <div
                                key={`${s.publicId ?? src ?? i}-${i}`}
                                className={clsx(
                                    "relative aspect-square rounded-lg overflow-hidden border border-app bg-elevated"
                                )}
                            >
                                {src ? (
                                    <img
                                        src={src}
                                        alt={`Upload ${i + 1}`}
                                        className={clsx("h-full w-full object-cover", s.uploading ? "opacity-70" : "")}
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="h-full w-full grid place-items-center text-muted text-sm">Pending</div>
                                )}

                                <div className="absolute top-1 right-1 flex items-center gap-1">
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

                                {s.uploading && (
                                    <div className="absolute inset-0 grid place-items-center bg-black/30 text-xs">
                                        Uploading…
                                    </div>
                                )}

                                {s.error && (
                                    <div className="absolute inset-x-0 bottom-0 p-2 text-[11px] text-red-300 bg-black/50">
                                        {s.error}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {hasLocal && (
                    <div className="mt-3 text-xs text-muted">
                        Uploads start automatically. You can continue filling the form.
                    </div>
                )}
            </div>
        </div>
    );
}