import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;
export const validateEmail = (email: string) => emailRegex.test(email);
export const validatePassword = (password: string) =>
  passwordRegex.test(password);
