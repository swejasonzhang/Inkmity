import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css"

const container = document.getElementById("root");

if (!container) {
  throw new Error(
    'Root container not found. Did you forget <div id="root"></div>?'
  );
}

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error(
    "Missing Clerk Publishable Key. Set VITE_CLERK_PUBLISHABLE_KEY in your .env file."
  );
}

const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </React.StrictMode>
);