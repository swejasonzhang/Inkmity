import { Link } from "react-router-dom";
import Header from "@/components/header/Header";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function NotFound() {
  usePageMeta({ title: "Page not found", description: "We couldn't find that page." });
  return (
    <div className="min-h-screen flex flex-col bg-app text-app">
      <Header />
      <main className="flex-1 grid place-items-center px-4 text-center">
        <div>
          <p className="text-6xl font-extrabold tracking-tight">404</p>
          <p className="mt-3 text-app/70">
            We couldn't find that page.
          </p>
          <Link
            to="/"
            className="mt-5 inline-block rounded-xl bg-[color:var(--fg)] text-[color:var(--bg)] px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
