import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getSignedUpload, uploadToCloudinary } from "@/lib/cloudinary";
import { Image as ImageIcon, Trash2, UploadCloud } from "lucide-react";
import clsx from "clsx";

type Slot = { file?: File; url?: string; uploading?: boolean; error?: string; publicId?: string };

type Props = {
    label: string;
    kind: "client_ref" | "artist_portfolio";
    value: string[];
    onChange: (urls: string[]) => void;
    className?: string;
    accept?: string;
    maxSizeMB?: number;
};

const RAW_API_BASE =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) ||
    "http://localhost:5005/api";
const API_BASE = RAW_API_BASE.replace(/\/+$/, "");
const apiUrl = (p: string) => `${API_BASE}${p.startsWith("/") ? "" : "/"}${p}`;

export default function SignupUpload({
    label,
    kind,
    value,
    onChange,
    className,
    accept = "image/*",
    maxSizeMB = 10,
}: Props) {
    const [slots, setSlots] = useState<Slot[]>(() => Array.from({ length: 3 }, (_, i) => ({ url: value[i] || "" })));
    const inputRef = useRef<HTMLInputElement | null>(null);
    const id = useId();
    const { getToken } = useAuth();

    useEffect(() => {
        if (value.length > 3) console.warn(`[SignupUpload] Truncating value to 3 entries for kind=${kind}`);
        setSlots(Array.from({ length: 3 }, (_, i) => ({ url: value[i] || "" })));
    }, [value, kind]);

    const anyUploading = slots.some((s) => s.uploading);

    const pick = () => inputRef.current?.click();

    const setAt = (i: number, next: Partial<Slot>) =>
        setSlots((prev) => {
            const s = [...prev];
            s[i] = { ...s[i], ...next };
            return s;
        });

    const persist = async (urls: string[]) => {
        try {
            const token = await getToken();
            if (!token) return;
            const path = kind === "client_ref" ? "/users/me/references" : "/users/me/portfolio";
            await fetch(apiUrl(path), {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ urls: urls.filter(Boolean).slice(0, 3) }),
            });
        } catch (e) {
            console.error("[SignupUpload] Persist failed:", e);
        }
    };

    const applyAndPersist = (next: string[]) => {
        const trimmed = next.slice(0, 3);
        onChange(trimmed);
        void persist(trimmed);
    };

    const pushValue = (i: number, url: string) => {
        const next = [...value];
        next[i] = url;
        applyAndPersist(next);
    };

    const removeAt = (i: number) => {
        setAt(i, { file: undefined, url: "", error: "", uploading: false, publicId: undefined });
        const next = [...value];
        next[i] = "";
        applyAndPersist(next);
    };

    const handleFiles = useCallback(
        async (files: FileList | null) => {
            if (!files || !files.length) {
                console.warn("[SignupUpload] No files provided");
                return;
            }
            const arr = Array.from(files).slice(0, 3);
            for (let idx = 0; idx < Math.min(3, arr.length); idx++) {
                const targetIndex = slots.findIndex((s) => !s.url);
                if (targetIndex === -1) {
                    console.warn("[SignupUpload] All 3 slots are already filled");
                    break;
                }
                const f = arr[idx];
                if (!f.type.startsWith("image/")) {
                    setAt(targetIndex, { error: "Only images" });
                    console.error(`[SignupUpload] Rejected non-image file: ${f.name}`);
                    continue;
                }
                if (f.size > maxSizeMB * 1024 * 1024) {
                    setAt(targetIndex, { error: `Max ${maxSizeMB}MB` });
                    console.error(`[SignupUpload] File too large (${(f.size / 1_048_576).toFixed(2)}MB): ${f.name}`);
                    continue;
                }
                setAt(targetIndex, { uploading: true, error: "" });
                try {
                    const sig = await getSignedUpload(kind);
                    const { secure_url, public_id } = await uploadToCloudinary(f, sig);
                    setAt(targetIndex, { url: secure_url, uploading: false, publicId: public_id });
                    pushValue(targetIndex, secure_url);
                } catch (e: any) {
                    console.error("[SignupUpload] Upload failed:", e);
                    setAt(targetIndex, { error: e?.message || "Upload failed", uploading: false });
                }
            }
        },
        [kind, maxSizeMB, slots, value]
    );

    const onDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        await handleFiles(e.dataTransfer.files);
    };

    return (
        <div className={clsx("mx-auto max-w-xl w-full", className)}>
            <div className="rounded-xl border border-app bg-card p-4 sm:p-5 space-y-3 text-center">
                <div className="flex flex-col items-center gap-1">
                    <div className="inline-flex items-center gap-2">
                        <ImageIcon className="size-4" />
                        <span className="text-sm font-medium">{label}</span>
                    </div>
                    <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">
                        {`${value.filter(Boolean).length}/3`}
                    </Badge>
                </div>

                <Separator className="bg-elevated" />

                <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDrop}
                    className="grid grid-cols-3 gap-2 justify-items-center"
                    aria-label="Upload up to 3 images"
                >
                    {slots.map((s, i) => (
                        <div
                            key={i}
                            className="relative aspect-square w-full rounded-lg border border-app bg-elevated overflow-hidden grid place-items-center"
                        >
                            {s.url ? (
                                <>
                                    <img src={s.url} alt="" className="h-full w-full object-cover" />
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="absolute top-1 right-1 h-7 w-7"
                                        onClick={() => removeAt(i)}
                                        aria-label={`Remove image ${i + 1}`}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </>
                            ) : s.uploading ? (
                                <div className="text-[11px] text-subtle">Uploading…</div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={pick}
                                    className="flex flex-col items-center justify-center text-[11px] text-subtle"
                                    aria-label={`Add image ${i + 1}`}
                                >
                                    <UploadCloud className="size-5 mb-1" />
                                    Add
                                </button>
                            )}
                            {s.error ? (
                                <div className="absolute bottom-1 left-1 right-1 text-[10px] text-red-400 text-center">{s.error}</div>
                            ) : null}
                        </div>
                    ))}
                </div>

                <input id={id} ref={inputRef} type="file" accept={accept} multiple className="hidden" onChange={(e) => handleFiles(e.currentTarget.files)} />

                <div className="flex justify-center">
                    <Button type="button" variant="outline" onClick={pick} className="h-8 px-3" disabled={anyUploading}>
                        {anyUploading ? "Uploading…" : "Select images"}
                    </Button>
                </div>

                <p className="text-[11px] text-subtle mt-1 text-center">Previews are small here. Images will appear larger on your dashboard.</p>
            </div>
        </div>
    );
}