import React, { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Role = "client" | "artist";
type SharedAccount = { firstName: string; lastName: string; email: string; confirmEmail: string; password: string };

type Props = {
    role: Role;
    setRole: (r: Role) => void;
    shared: SharedAccount;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    onPasswordVisibilityChange?: (hidden: boolean) => void;
    onEmailBlur?: () => void;
    onConfirmEmailBlur?: () => void;
};

export default function SharedAccountStep({
    role,
    setRole,
    shared,
    onChange,
    onPasswordVisibilityChange,
    onEmailBlur,
    onConfirmEmailBlur,
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

    const emailMismatch = shared.confirmEmail.length > 0 && shared.confirmEmail !== shared.email;

    return (
        <div className="grid gap-5 w-full max-w-full md:max-w-md mx-auto p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="text-left">
                    <Label className="block text-sm text-white/70 mb-1" htmlFor="firstName">First name</Label>
                    <Input
                        id="firstName"
                        type="text"
                        name="firstName"
                        value={shared.firstName}
                        placeholder="First name"
                        onChange={onChange}
                        className="h-11 rounded-xl bg-white/10 border-0 text-white placeholder:text-white/40 px-4 focus-visible:ring-white/30"
                    />
                </div>
                <div className="text-left">
                    <Label className="block text-sm text-white/70 mb-1" htmlFor="lastName">Last name</Label>
                    <Input
                        id="lastName"
                        type="text"
                        name="lastName"
                        value={shared.lastName}
                        placeholder="Last name"
                        onChange={onChange}
                        className="h-11 rounded-xl bg-white/10 border-0 text-white placeholder:text-white/40 px-4 focus-visible:ring-white/30"
                    />
                </div>
            </div>

            <div className="text-left">
                <Label className="block text-sm text-white/70 mb-1" htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    name="email"
                    value={shared.email}
                    placeholder="Email"
                    onChange={onChange}
                    onBlur={onEmailBlur}
                    className="h-11 rounded-xl bg-white/10 border-0 text-white placeholder:text-white/40 px-4 focus-visible:ring-white/30"
                    aria-describedby="email-help"
                />
                <p id="email-help" className="mt-1 text-xs text-white/50">We’ll send confirmations here.</p>
            </div>

            <div className="text-left">
                <Label className="block text-sm text-white/70 mb-1" htmlFor="confirmEmail">Confirm email</Label>
                <Input
                    id="confirmEmail"
                    type="email"
                    name="confirmEmail"
                    value={shared.confirmEmail}
                    placeholder="Re-enter email"
                    onChange={onChange}
                    onBlur={onConfirmEmailBlur}
                    className={`h-11 rounded-xl bg-white/10 border-0 text-white placeholder:text-white/40 px-4 focus-visible:ring-2 ${emailMismatch ? "focus-visible:ring-red-400/50" : "focus-visible:ring-white/30"}`}
                    aria-invalid={emailMismatch || undefined}
                    aria-describedby={emailMismatch ? "confirm-email-error" : undefined}
                />
                {emailMismatch ? <p id="confirm-email-error" className="mt-1 text-xs text-red-300">Emails do not match.</p> : null}
            </div>

            <div className="text-left">
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
                        className="h-11 rounded-xl bg-white/10 border-0 text-white placeholder:text-white/40 pl-4 pr-12 focus-visible:ring-white/30"
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

            <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center md:justify-center">
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