import { useState, type ReactNode } from "react";
import { useSignIn, useSignUp, useClerk } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import type { OAuthStrategy } from "@clerk/types";

type Props = {
    mode: "login" | "signup";
};

const GoogleIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
        <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09A12 12 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.27a12 12 0 0 0 0 10.76l4-3.09z" />
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.27 6.62l4 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
);

const PROVIDERS: { strategy: OAuthStrategy; label: string; Icon: () => ReactNode }[] = [
    { strategy: "oauth_google", label: "Google", Icon: GoogleIcon },
];

export default function OAuthButtons({ mode }: Props) {
    const { signIn, isLoaded: signInLoaded } = useSignIn();
    const { signUp, isLoaded: signUpLoaded } = useSignUp();
    const clerk = useClerk();
    const [pending, setPending] = useState<OAuthStrategy | null>(null);

    const ready = mode === "login" ? signInLoaded : signUpLoaded;

    const enabled = (() => {
        try {
            const social = (clerk as any)?.__unstable__environment?.userSettings?.social;
            if (social && typeof social === "object") {
                const set = new Set<string>(
                    Object.values(social)
                        .filter((s: any) => s?.enabled)
                        .map((s: any) => s.strategy as string)
                );
                if (set.size > 0) return set;
            }
        } catch {
            
        }
        return null;
    })();

    const providers = enabled ? PROVIDERS.filter((p) => enabled.has(p.strategy)) : PROVIDERS;
    const list = providers.length ? providers : PROVIDERS;

    const start = async (strategy: OAuthStrategy, label: string) => {
        if (!ready || pending) return;
        setPending(strategy);
        try {
            const authenticator = mode === "login" ? signIn : signUp;
            await authenticator?.authenticateWithRedirect({
                strategy,
                redirectUrl: "/sso-callback",
                redirectUrlComplete: "/onboarding",
            });
        } catch (err: any) {
            setPending(null);
            const msg = err?.errors?.[0]?.message || `${label} sign-in isn't available right now.`;
            toast.error(msg, { position: "top-center", theme: "dark" });
        }
    };

    return (
        <div className="flex items-center justify-center gap-2 w-full">
            {list.map(({ strategy, label, Icon }) => (
                <button
                    key={strategy}
                    type="button"
                    onClick={() => start(strategy, label)}
                    disabled={!ready || !!pending}
                    className="inline-grid place-items-center h-11 flex-1 rounded-xl bg-white border border-black/10 hover:bg-white/90 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
                    aria-label={`Continue with ${label}`}
                    title={`Continue with ${label}`}
                >
                    {pending === strategy ? (
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-transparent" />
                    ) : (
                        <Icon />
                    )}
                </button>
            ))}
        </div>
    );
}
