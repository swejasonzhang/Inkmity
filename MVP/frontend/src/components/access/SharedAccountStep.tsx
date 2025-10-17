import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Role = "client" | "artist";
type SharedAccount = { firstName: string; lastName: string; email: string; password: string };

type Props = {
    role: Role;
    setRole: (r: Role) => void;
    shared: SharedAccount;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    onPasswordVisibilityChange?: (hidden: boolean) => void;
    onEmailBlur?: () => void;
};

export default function SharedAccountStep({ role, setRole, shared, onChange, onPasswordVisibilityChange, onEmailBlur }: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const togglePassword = () => {
        const next = !showPassword;
        setShowPassword(next);
        onPasswordVisibilityChange?.(!next);
    };

    return (
        <div className="grid gap-5 w-full max-w-full md:max-w-md mx-auto p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="text-left">
                    <label className="block text-sm text-white/70 mb-1" htmlFor="firstName">First name</label>
                    <input
                        id="firstName"
                        type="text"
                        name="firstName"
                        value={shared.firstName}
                        placeholder="First name"
                        onChange={onChange}
                        className="w-full h-11 rounded-xl bg-white/10 text-white placeholder:text-white/40 px-4 outline-none focus:ring-2 focus:ring-white/30"
                    />
                </div>
                <div className="text-left">
                    <label className="block text-sm text-white/70 mb-1" htmlFor="lastName">Last name</label>
                    <input
                        id="lastName"
                        type="text"
                        name="lastName"
                        value={shared.lastName}
                        placeholder="Last name"
                        onChange={onChange}
                        className="w-full h-11 rounded-xl bg-white/10 text-white placeholder:text-white/40 px-4 outline-none focus:ring-2 focus:ring-white/30"
                    />
                </div>
            </div>

            <div className="text-left">
                <label className="block text-sm text-white/70 mb-1" htmlFor="email">Email</label>
                <input
                    id="email"
                    type="email"
                    name="email"
                    value={shared.email}
                    placeholder="Email"
                    onChange={onChange}
                    onBlur={onEmailBlur}
                    className="w-full h-11 rounded-xl bg-white/10 text-white placeholder:text-white/40 px-4 outline-none focus:ring-2 focus:ring-white/30"
                />
            </div>

            <div className="text-left">
                <label className="block text-sm text-white/70 mb-1" htmlFor="password">Password</label>
                <div className="relative">
                    <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={shared.password}
                        placeholder="Password"
                        onChange={onChange}
                        className="w-full h-11 rounded-xl bg-white/10 text-white placeholder:text-white/40 px-4 pr-12 outline-none focus:ring-2 focus:ring-white/30"
                        onFocus={() => onPasswordVisibilityChange?.(!showPassword ? true : false)}
                        onBlur={() => onPasswordVisibilityChange?.(false)}
                    />
                    <button
                        type="button"
                        onClick={togglePassword}
                        className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 md:h-8 md:w-8 items-center justify-center rounded-lg text-white/80 hover:text-white bg-white/10 hover:bg-white/20 transition"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? <EyeOff className="h-5 w-5 md:h-4 md:w-4" /> : <Eye className="h-5 w-5 md:h-4 md:w-4" />}
                        <span className="sr-only">{showPassword ? "Hide" : "Show"}</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center md:justify-center">
                <button
                    type="button"
                    onClick={() => setRole("client")}
                    className={`px-4 py-3 md:py-2 rounded-xl text-sm w-full md:w-auto ${role === "client" ? "bg-white/20 text-white" : "bg-white/10 text-white/80"}`}
                >
                    I’m a client
                </button>
                <button
                    type="button"
                    onClick={() => setRole("artist")}
                    className={`px-4 py-3 md:py-2 rounded-xl text-sm w-full md:w-auto ${role === "artist" ? "bg-white/20 text-white" : "bg-white/10 text-white/80"}`}
                >
                    I’m an artist
                </button>
            </div>
        </div>
    );
}