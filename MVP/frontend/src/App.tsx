import { Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { useSyncOnAuth } from "@/hooks/useSyncOnAuth";

import SignUp from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Contact from "./pages/Contact";
import About from "./pages/About";
import Landing from "./pages/Landing";

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

function OnlyWhenSignedOut({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedOut>{children}</SignedOut>
      <SignedIn>
        <Navigate to="/dashboard" replace />
      </SignedIn>
    </>
  );
}

const App: React.FC = () => {
  useSyncOnAuth();

  return (
    <Routes>
      <Route
        path="/signup"
        element={
          <OnlyWhenSignedOut>
            <SignUp />
          </OnlyWhenSignedOut>
        }
      />
      <Route
        path="/login"
        element={
          <OnlyWhenSignedOut>
            <Login />
          </OnlyWhenSignedOut>
        }
      />
      <Route path="/sign-in/*" element={<Navigate to="/login" replace />} />
      <Route path="/sign-up/*" element={<Navigate to="/signup" replace />} />

      <Route
        path="/dashboard"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />

      <Route path="/contact" element={<Contact />} />
      <Route path="/about" element={<About />} />
      <Route path="/landing" element={<Landing />} />

      <Route
        path="/"
        element={
          <>
            <SignedIn>
              <Navigate to="/dashboard" replace />
            </SignedIn>
            <SignedOut>
              <Navigate to="/landing" replace />
            </SignedOut>
          </>
        }
      />

      <Route
        path="*"
        element={
          <>
            <SignedIn>
              <Navigate to="/dashboard" replace />
            </SignedIn>
            <SignedOut>
              <Navigate to="/landing" replace />
            </SignedOut>
          </>
        }
      />
    </Routes>
  );
};

export default App;