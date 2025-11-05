import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./global.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key! Did you forget to add it in .env?");
}

function ClerkWithRouter({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      signInUrl="/login"
      signUpUrl="/signup"
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      appearance={{ elements: { rootBox: "hidden" } }}
    >
      {children}
    </ClerkProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider attribute="data-ink-app" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <BrowserRouter>
        <ClerkWithRouter>
          <App />
        </ClerkWithRouter>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);