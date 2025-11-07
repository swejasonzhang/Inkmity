import React, { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
    invalidFields = [],
    flashToken = 0
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
        const timers: number[] = [];
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
        return () => timers.forEach((t) => clearTimeout(t));
    }, [flashToken, invalidFields]);

    const usernameOk = shared.username.trim().length > 0;
    const emailOk = shared.email.trim().length > 0 && validateEmail(shared.email);
    const pwdOk = shared.password.trim().length > 0 && validatePassword(shared.password);

    const usernameHelp = usernameOk ? "You can change your username later. Your handle, created from this, cannot be changed." : "Required. Enter a display name.";
    const emailHelp = shared.email.trim().length === 0 ? "Required. Enter your email." : emailOk ? "We’ll send confirmations here." : "Invalid email. Use a format like name@example.com.";
    const pwdHelp = shared.password.trim().length === 0 ? "Required. Use at least 8 characters with letters and numbers." : pwdOk ? "Keep this private." : "Password must be at least 8 characters and include letters and numbers.";

    return (
        <div className="grid w-full mx-0 p-0 place-items-stretch text-center">
            <div className="w-full">
                <Label className="block text-sm text-white/80 mb-1" htmlFor="username">Username</Label>
                <Input
                    id="username"
                    type="text"
                    name="username"
                    value={shared.username}
                    placeholder="Enter a display name"
                    onChange={onChange}
                    className={`h-11 w-full rounded-xl bg-white/10 border-0 text-white text-center placeholder:text-white/40 placeholder:text-xs sm:placeholder:text-sm px-4 focus-visible:ring-white/30 transition-shadow will-change-[box-shadow] ${flashUser ? "ink-flash" : ""}`}
                    aria-describedby="username-help"
                    aria-invalid={!usernameOk}
                />
                <p id="username-help" className={`mt-1 text-xs ${usernameOk ? "text-white/60" : "text-red-400"}`}>{usernameHelp}</p>
            </div>

            <div className="w-full mt-3">
                <Label className="block text-sm text-white/80 mb-1" htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    name="email"
                    value={shared.email}
                    placeholder="name@example.com"
                    onChange={onChange}
                    onBlur={onEmailBlur}
                    className={`h-11 w-full rounded-xl bg-white/10 border-0 text-white text-center placeholder:text-white/40 placeholder:text-xs sm:placeholder:text-sm px-4 focus-visible:ring-white/30 transition-shadow will-change-[box-shadow] ${flashEmail ? "ink-flash" : ""}`}
                    aria-describedby="email-help"
                    aria-invalid={!emailOk}
                />
                <p id="email-help" className={`mt-1 text-xs ${emailOk ? "text-white/60" : "text-red-400"}`}>{emailHelp}</p>
            </div>

            <div className="w-full mt-3">
                <Label className="block text-sm text-white/80 mb-1" htmlFor="password">Password</Label>
                <div className="relative">
                    <Input
                        id="password"
                        ref={pwdRef}
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={shared.password}
                        placeholder="At least 8 characters with letters and numbers"
                        onChange={onChange}
                        className={`h-11 w-full rounded-xl bg-white/10 border-0 text-white text-center placeholder:text-white/40 placeholder:text-xs sm:placeholder:text-sm pl-4 pr-12 focus-visible:ring-white/30 transition-shadow will-change-[box-shadow] ${flashPwd ? "ink-flash" : ""}`}
                        aria-describedby="password-help"
                        aria-invalid={!pwdOk}
                    />
                    <Button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); }}
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
                <p id="password-help" className={`mt-1 text-xs ${pwdOk ? "text-white/60" : "text-red-400"}`}>{pwdHelp}</p>
            </div>

            <div className="w-full mt-4 flex flex-col md:flex-row gap-2 items-stretch">
                <Button
                    type="button"
                    onClick={() => setRole("client")}
                    className={`w-full flex-1 px-4 py-3 md:py-2 rounded-xl text-sm ${role === "client" ? "bg-white/20 text-white" : "bg-white/10 text-white/80"}`}
                    variant="secondary"
                >
                    I’m a client
                </Button>
                <Button
                    type="button"
                    onClick={() => setRole("artist")}
                    className={`w-full flex-1 px-4 py-3 md:py-2 rounded-xl text-sm ${role === "artist" ? "bg-white/20 text-white" : "bg-white/10 text-white/80"}`}
                    variant="secondary"
                >
                    I’m an artist
                </Button>
            </div>
        </div>
    );
}