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
    accept = "image

















































































































































































