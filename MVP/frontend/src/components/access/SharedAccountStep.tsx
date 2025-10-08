import React from "react";

type Role = "client" | "artist";

type SharedAccount = {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
};

type Props = {
    role: Role;
    setRole: (r: Role) => void;
    shared: SharedAccount;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    onPasswordVisibilityChange?: (hidden: boolean) => void;
};

export default function SharedAccountStep({
    role,
    setRole,
    shared,
    onChange,
    onPasswordVisibilityChange,
}: Props) {
    return (
        <div className="grid gap-5 w-full max-w-md mx-auto">
            <div className="grid grid-cols-2 gap-4">
                <div className="text-left">
                    <label className="block text-sm text-white/70 mb-1" htmlFor="firstName">
                        First name
                    </label>
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
                    <label className="block text-sm text-white/70 mb-1" htmlFor="lastName">
                        Last name
                    </label>
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
                <label className="block text-sm text-white/70 mb-1" htmlFor="email">
                    Email
                </label>
                <input
                    id="email"
                    type="email"
                    name="email"
                    value={shared.email}
                    placeholder="Email"
                    onChange={onChange}
                    className="w-full h-11 rounded-xl bg-white/10 text-white placeholder:text-white/40 px-4 outline-none focus:ring-2 focus:ring-white/30"
                />
            </div>

            <div className="text-left">
                <label className="block text-sm text-white/70 mb-1" htmlFor="password">
                    Password
                </label>
                <input
                    id="password"
                    type="password"
                    name="password"
                    value={shared.password}
                    placeholder="Password"
                    onChange={onChange}
                    className="w-full h-11 rounded-xl bg-white/10 text-white placeholder:text-white/40 px-4 outline-none focus:ring-2 focus:ring-white/30"
                    onFocus={() => onPasswordVisibilityChange?.(true)}
                    onBlur={() => onPasswordVisibilityChange?.(false)}
                />
            </div>

            <div className="flex gap-2 items-center justify-center">
                <button
                    type="button"
                    onClick={() => setRole("client")}
                    className={`px-4 py-2 rounded-xl text-sm ${role === "client" ? "bg-white/20 text-white" : "bg-white/10 text-white/80"
                        }`}
                >
                    I’m a client
                </button>
                <button
                    type="button"
                    onClick={() => setRole("artist")}
                    className={`px-4 py-2 rounded-xl text-sm ${role === "artist" ? "bg-white/20 text-white" : "bg-white/10 text-white/80"
                        }`}
                >
                    I’m an artist
                </button>
            </div>
        </div>
    );
}