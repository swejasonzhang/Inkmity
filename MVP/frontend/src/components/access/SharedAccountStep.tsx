import FormInput from "@/components/dashboard/FormInput";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { ShieldCheck, User, Paintbrush } from "lucide-react";
import { validateEmail, validatePassword } from "@/utils/validation";
import { useState } from "react";

type Role = "client" | "artist";
type SharedAccount = { username: string; email: string; password: string };

export default function SharedAccountStep({
    role, setRole, shared, onChange, onPasswordVisibilityChange,
}: {
    role: Role;
    setRole: (r: Role) => void;
    shared: SharedAccount;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    onPasswordVisibilityChange?: (hidden: boolean) => void;
}) {
    const [showPassword, setShowPassword] = useState(true);

    const togglePassword = () => {
        const next = !showPassword;
        setShowPassword(next);
        if (onPasswordVisibilityChange) onPasswordVisibilityChange(!next);
    };

    return (
        <div className="flex flex-col gap-5">
            <div className="text-center">
                <h1 className="text-3xl font-semibold text-white">Create your account</h1>
                <p className="text-white/60 mt-2">Tell us who you are to tailor the flow.</p>
            </div>

            <div className="w-full flex items-center gap-3">
                <label className="shrink-0 text-white/70 whitespace-nowrap flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" /> I am a:
                </label>
                <div className="flex-1">
                    <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                        <SelectTrigger className="w-full bg-black/70 text-white rounded-lg px-3 py-2 text-sm border border-white/20 focus:ring-2 focus:ring-white/30">
                            <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent className="w-[--radix-select-trigger-width] bg-[#0b0b0b] text-white border border-white/10 rounded-xl shadow-xl">
                            <SelectItem value="client" className="focus:bg-white/10">
                                <span className="inline-flex items-center gap-2"><User className="h-4 w-4" /> Client</span>
                            </SelectItem>
                            <SelectItem value="artist" className="focus:bg-white/10">
                                <span className="inline-flex items-center gap-2"><Paintbrush className="h-4 w-4" /> Artist</span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-4">
                <FormInput
                    type="text"
                    name="username"
                    value={shared.username}
                    placeholder="Username"
                    onChange={onChange}
                    isValid={!!shared.username.trim()}
                    message={shared.username ? "Looks good" : "Choose a username"}
                />
                <FormInput
                    type="email"
                    name="email"
                    value={shared.email}
                    placeholder="Email"
                    onChange={onChange}
                    isValid={validateEmail(shared.email)}
                    message={shared.email ? (validateEmail(shared.email) ? "Valid email" : "Enter a valid email") : "Enter your email"}
                />
                <FormInput
                    type="password"
                    name="password"
                    value={shared.password}
                    placeholder="Create password"
                    onChange={onChange}
                    isValid={validatePassword(shared.password)}
                    message={validatePassword(shared.password) ? "Strong password" : "Must be 6+ chars, uppercase & number"}
                    showPasswordToggle
                    showPassword={showPassword}
                    onTogglePassword={togglePassword}
                />
            </div>
        </div>
    );
}