import { Search, Brush, Building2, ArrowRight, type LucideIcon } from "lucide-react";

export type RoleChoice = "client" | "artist" | "studio";

const OPTIONS: { key: RoleChoice; title: string; subtitle: string; Icon: LucideIcon }[] = [
    { key: "client", title: "I want a tattoo", subtitle: "Discover artists by style and book your session.", Icon: Search },
    { key: "artist", title: "I'm a tattoo artist", subtitle: "Take bookings and grow your client base.", Icon: Brush },
    { key: "studio", title: "I run a studio", subtitle: "Manage your artists and studio bookings.", Icon: Building2 },
];

export default function RoleChooser({ onSelect }: { onSelect: (choice: RoleChoice) => void }) {
    return (
        <div className="w-full max-w-md mx-auto rounded-3xl bg-card border border-app p-5 sm:p-6">
            <div className="text-center mb-5">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-app">How do you want to use Inkmity?</h1>
                <p className="text-subtle text-xs sm:text-sm mt-1">Pick your path — each one has its own quick setup.</p>
            </div>

            <div className="flex flex-col gap-3">
                {OPTIONS.map(({ key, title, subtitle, Icon }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onSelect(key)}
                        className="group flex items-center gap-3 w-full text-left rounded-2xl border border-app bg-elevated hover:bg-card hover:border-[color:var(--fg)] px-4 py-3.5 transition-colors focus:outline-none focus-visible:border-[color:var(--fg)]"
                    >
                        <span className="inline-grid place-items-center h-10 w-10 rounded-xl border border-app bg-card text-app shrink-0">
                            <Icon className="h-5 w-5" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block font-bold text-app text-sm sm:text-base leading-tight">{title}</span>
                            <span className="block text-subtle text-xs leading-snug mt-0.5">{subtitle}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 text-subtle group-hover:text-app group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                ))}
            </div>

            <p className="text-center text-subtle text-xs mt-5">
                Already have an account? <a href="/login" className="underline text-app hover:opacity-80">Log in</a>
            </p>
        </div>
    );
}
