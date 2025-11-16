import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isRefundEligible(
  startAtISO: string,
  now = new Date()
): boolean {
  const start = new Date(startAtISO).getTime();
  const diffMs = start - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours >= 0 && diffHours < 72;
}

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;
export const validateEmail = (email: string) => emailRegex.test(email);
export const validatePassword = (password: string) =>
  passwordRegex.test(password);

type Role = "client" | "artist";

type ClientProfile = {
  budgetMin: string;
  budgetMax: string;
  location: string;
  placement: string;
  size: string;
};

type ArtistProfile = {
  location: string;
  years: string;
  baseRate: string;
  bookingPreference?: "open" | "waitlist" | "closed" | "referral" | "guest";
  travelFrequency?: "rare" | "sometimes" | "often" | "touring" | "guest_only";
  styles?: string[];
  bio?: string;
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 24);

export function buildSyncPayload(args: {
  clerkId: string;
  email: string;
  role: Role;
  username?: string;
  firstName?: string;
  lastName?: string;
  profile: ClientProfile | ArtistProfile;
}) {
  const full = `${args.firstName ?? ""} ${args.lastName ?? ""}`.trim();
  const fromEmail = args.email.split("@")[0] || "user";
  const best = full || args.username || fromEmail;
  const username = best.length ? best : "user";
  return {
    clerkId: args.clerkId,
    email: args.email,
    role: args.role,
    username,
    firstName: args.firstName,
    lastName: args.lastName,
    profile: args.profile,
    usernameSlug: slug(username),
  };
}