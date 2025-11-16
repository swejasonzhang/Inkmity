import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import SignUp from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Contact from "./pages/Contact";
import About from "./pages/About";
import Landing from "./pages/Landing";
import { useTheme } from "@/hooks/useTheme";

const PublicScope: React.FC = () => {
  const { themeClass } = useTheme();
  return (
    <div id="public-scope" className={themeClass} data-ink="dark" data-ink-no-theme="true">
      <Outlet />
    </div>
  );
};

const DashboardScope: React.FC = () => {
  const { themeClass } = useTheme();
  return (
    <div id="dashboard-scope" className={`${themeClass} theme-smooth`}>
      <SignedIn>
        <Outlet />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/dashboard" element={<DashboardScope />}>
        <Route index element={<Dashboard />} />
      </Route>
      <Route element={<PublicScope />}>
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
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
      </Route>
    </Routes>
  );
};

export default App;