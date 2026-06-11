import React, { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import OAuthButtons from "@/components/access/OAuthButtons";
import { validateEmail, validatePassword } from "@/lib/utils";

type Role = "client" | "artist";
type SharedAccount = { username: string; email: string; password: string };

type Props = {
    role: Role;
    setRole: (r: Role) => void;
    shared: SharedAccount;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    onPasswordVisibilityChange?: (hidden: boolean) => void;
    onEmailBlur?: () => void;
    emailTaken?: boolean;
    invalidFields?: string[];
    flashToken?: number;
};

export default function SharedAccountStep({
    role,
    setRole,
    shared,
    onChange,
    onPasswordVisibilityChange,
    onEmailBlur,
    emailTaken = false,
    invalidFields = [],
    flashToken = 0,
}: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const pwdRef = useRef<HTMLInputElement>(null);
    const [flashUser, setFlashUser] = useState(false);
    const [flashEmail, setFlashEmail] = useState(false);
    const [flashPwd, setFlashPwd] = useState(false);

    const togglePassword = () => {
        const next = !showPassword;
        setShowPassword(next);
        onPasswordVisibilityChange?.(!next);
    };

    useEffect(() => {
        if (!flashToken) return;
        setFlashUser(false);
        setFlashEmail(false);
        setFlashPwd(false);
        const timers: number[] = [];
        const raf = requestAnimationFrame(() => {
            if (invalidFields.includes("username")) {
                setFlashUser(true);
                timers.push(window.setTimeout(() => setFlashUser(false), 1400));
            }
            if (invalidFields.includes("email")) {
                setFlashEmail(true);
                timers.push(window.setTimeout(() => setFlashEmail(false), 1400));
            }
            if (invalidFields.includes("password")) {
                setFlashPwd(true);
                timers.push(window.setTimeout(() => setFlashPwd(false), 1400));
            }
        });
        return () => {
            cancelAnimationFrame(raf);
            timers.forEach((t) => clearTimeout(t));
        };
    }, [flashToken, invalidFields]);

    const usernameOk = shared.username.trim().length > 0;
    const emailFormatOk = shared.email.trim().length > 0 && validateEmail(shared.email);
    const emailOk = emailFormatOk && !emailTaken;
    const pwdOk = shared.password.trim().length > 0 && validatePassword(shared.password);

    // Email-already-registered is the one message worth surfacing inline; the rest is
    // conveyed by the placeholders per the placeholder-only form style.
    const emailTakenMsg = emailTaken ? "This email is already registered. Log in or use another." : "";

    return (
        <div className="grid w-full mx-0 p-0 place-items-stretch text-center">
            <OAuthButtons mode="signup" />
            <div className="flex items-center gap-2 w-full mt-1.5 mb-1.5" aria-hidden>
                <span className="h-px flex-1 bg-white/15" />
                <span className="text-xs text-white/60">or sign up with email</span>
                <span className="h-px flex-1 bg-white/15" />
            </div>
            <div className="w-full">
                <Label className="block text-xs text-white/80 mb-1">I want to join as</Label>
                <div className="flex flex-col md:flex-row gap-2 items-stretch">
                    <Button
                        type="button"
                        onClick={() => setRole("client")}
                        className={`w-full flex-1 px-3 py-1.5 rounded-lg text-xs ${role === "client" ? "bg-white/20 text-white" : "bg-white/10 text-white/80"}`}
                        variant="secondary"
                    >
                        Client
                    </Button>
                    <Button
                        type="button"
                        onClick={() => setRole("artist")}
                        className={`w-full flex-1 px-3 py-1.5 rounded-lg text-xs ${role === "artist" ? "bg-white/20 text-white" : "bg-white/10 text-white/80"}`}
                        variant="secondary"
                    >
                        Artist
                    </Button>
                </div>
            </div>

            <div className="w-full mt-3">
                <Input
                    id="username"
                    type="text"
                    name="username"
                    value={shared.username}
                    placeholder="Username"
                    aria-label="Username"
                    onChange={onChange}
                    className={`h-8 w-full rounded-xl bg-neutral-900/80 border border-white/40 text-white text-center placeholder:text-white/65 px-4 focus-visible:ring-white/20 transition-shadow will-change-[box-shadow] ${flashUser ? "ink-flash" : ""}`}
                    aria-invalid={!usernameOk}
                />
            </div>

            <div className="w-full mt-3">
                <Input
                    id="email"
                    type="email"
                    name="email"
                    value={shared.email}
                    placeholder="Email"
                    aria-label="Email"
                    onChange={onChange}
                    onBlur={onEmailBlur}
                    className={`h-8 w-full rounded-xl bg-neutral-900/80 border border-white/40 text-white text-center placeholder:text-white/65 px-4 focus-visible:ring-white/20 transition-shadow will-change-[box-shadow] ${emailTaken ? "!border-white" : ""} ${flashEmail ? "ink-flash" : ""}`}
                    aria-describedby={emailTakenMsg ? "email-help" : undefined}
                    aria-invalid={!emailOk}
                />
                {emailTakenMsg && <p id="email-help" className="mt-0 text-[10px] text-white">{emailTakenMsg}</p>}
            </div>

            <div className="w-full mt-3">
                <div className="relative">
                    <Input
                        id="password"
                        ref={pwdRef}
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={shared.password}
                        placeholder="Password (8+ chars, 1 number)"
                        aria-label="Password"
                        onChange={onChange}
                        className={`h-8 w-full rounded-xl bg-neutral-900/80 border border-white/40 text-white text-center placeholder:text-white/65 pl-9 pr-9 focus-visible:ring-white/20 transition-shadow will-change-[box-shadow] ${flashPwd ? "ink-flash" : ""}`}
                        aria-invalid={!pwdOk}
                    />
                    <Button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); }}
                        onClick={togglePassword}
                        className="absolute right-0 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 md:h-8 md:w-8 items-center justify-center rounded-lg text-white hover:text-white bg-transparent hover:bg-white/10"
                        size="icon"
                        variant="ghost"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                    >
                        {showPassword ? <EyeOff className="h-5 w-5 md:h-4 md:w-4" /> : <Eye className="h-5 w-5 md:h-4 md:w-4" />}
                        <span className="sr-only">{showPassword ? "Hide" : "Show"}</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}