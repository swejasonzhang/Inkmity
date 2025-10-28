import React, { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Role = "client" | "artist";
type SharedAccount = { username: string; email: string; password: string };

type Props = {
    role: Role;
    setRole: (r: Role) => void;
    shared: SharedAccount;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    onPasswordVisibilityChange?: (hidden: boolean) => void;
    onEmailBlur?: () => void;
    bio: string;
    onBioChange: React.ChangeEventHandler<HTMLTextAreaElement>;
};

export default function SharedAccountStep({
    role,
    setRole,
    shared,
    onChange,
    onPasswordVisibilityChange,
    onEmailBlur,
    bio,
    onBioChange,
}: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const pwdRef = useRef<HTMLInputElement>(null);

    const togglePassword = () => {
        const next = !showPassword;
        setShowPassword(next);
        onPasswordVisibilityChange?.(!next);
        queueMicrotask(() => pwdRef.current?.focus({ preventScroll: true }));
    };

    const keepFocus = (e: React.MouseEvent | React.PointerEvent) => {
        e.preventDefault();
        pwdRef.current?.focus({ preventScroll: true });
    };

    return (
        <div className="grid gap-5 w-full max-w-full md:max-w-md mx-auto p-1 place-items-center text-center">
            <div className="w-full">
                <Label className="block text-sm text-white/70 mb-1" htmlFor="username">Username</Label>
                <Input
                    id="username"
                    type="text"
                    name="username"
                    value={shared.username}
                    placeholder="Username"
                    onChange={onChange}
                    className="h-11 w-full rounded-xl bg-white/10 border-0 text-white text-center placeholder:text-white/40 px-4 focus-visible:ring-white/30"
                    aria-describedby="username-help"
                />
                <p id="username-help" className="mt-1 text-xs text-white/50">
                    You can change your username later. Your handle, created from this, cannot be changed.
                </p>
            </div>

            <div className="w-full">
                <Label className="block text-sm text-white/70 mb-1" htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    name="email"
                    value={shared.email}
                    placeholder="Email"
                    onChange={onChange}
                    onBlur={onEmailBlur}
                    className="h-11 w-full rounded-xl bg-white/10 border-0 text-white text-center placeholder:text-white/40 px-4 focus-visible:ring-white/30"
                    aria-describedby="email-help"
                />
                <p id="email-help" className="mt-1 text-xs text-white/50">We’ll send confirmations here.</p>
            </div>

            <div className="w-full">
                <Label className="block text-sm text-white/70 mb-1" htmlFor="password">Password</Label>
                <div className="relative">
                    <Input
                        id="password"
                        ref={pwdRef}
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={shared.password}
                        placeholder="Password"
                        onChange={onChange}
                        className="h-11 w-full rounded-xl bg-white/10 border-0 text-white text-center placeholder:text-white/40 pl-4 pr-12 focus-visible:ring-white/30"
                        onFocus={() => onPasswordVisibilityChange?.(!showPassword ? true : false)}
                        onBlur={() => onPasswordVisibilityChange?.(false)}
                    />
                    <Button
                        type="button"
                        tabIndex={-1}
                        onMouseDown={keepFocus}
                        onPointerDown={keepFocus}
                        onClick={togglePassword}
                        className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 md:h-8 md:w-8 items-center justify-center rounded-lg text-white/80 hover:text-white bg-white/10 hover:bg-white/20"
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

            <div className="w-full">
                <Label className="block text-sm text-white/70 mb-1" htmlFor="bio">Bio (optional)</Label>
                <textarea
                    id="bio"
                    name="bio"
                    value={bio}
                    onChange={onBioChange}
                    rows={4}
                    placeholder={role === "client" ? "Tell artists what you’re looking for, interests, constraints." : "Describe your style, experience, and booking notes."}
                    className="w-full rounded-xl bg-white/10 border-0 text-white text-center placeholder:text-white/40 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                />
            </div>

            <div className="flex flex-col md:flex-row gap-2 items-center justify-center w-full">
                <Button
                    type="button"
                    onClick={() => setRole("client")}
                    className={`px-4 py-3 md:py-2 rounded-xl text-sm w-full md:w-auto ${role === "client" ? "bg-white/20 text-white" : "bg-white/10 text-white/80"}`}
                    variant="secondary"
                >
                    I’m a client
                </Button>
                <Button
                    type="button"
                    onClick={() => setRole("artist")}
                    className={`px-4 py-3 md:py-2 rounded-xl text-sm w-full md:w-auto ${role === "artist" ? "bg-white/20 text-white" : "bg-white/10 text-white/80"}`}
                    variant="secondary"
                >
                    I’m an artist
                </Button>
            </div>
        </div>
    );
}