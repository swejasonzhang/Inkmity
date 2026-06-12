import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import SignUp from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Appointments from "./pages/Appointments";
import Contact from "./pages/Contact";
import About from "./pages/About";
import Gallery from "./pages/Gallery";
import Portfolio from "./pages/Portfolio";
import Tiers from "./pages/Tiers";
import ArtistWorks from "./pages/ArtistWorks";
import Studios from "./pages/Studios";
import Landing from "./pages/Landing";
import SSOCallback from "./pages/SSOCallback";
import Onboarding from "./pages/Onboarding";
import StudioSignup from "./pages/StudioSignup";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import { useTheme } from "@/hooks/useTheme";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { useOnboarded } from "@/hooks/useOnboarded";

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
  const { onboarded } = useOnboarded();
  return (
    <div id="dashboard-scope" className={`${themeClass} theme-smooth`}>
      <SignedIn>
        {onboarded === false ? (
          <Navigate to="/onboarding" replace />
        ) : onboarded === null ? null : (
          <Outlet />
        )}
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </div>
  );
};

const App: React.FC = () => {
  useInactivityLogout();

  return (
    <Routes>
      <Route path="/dashboard" element={<DashboardScope />}>
        <Route index element={<Dashboard />} />
      </Route>
      <Route path="/profile" element={<DashboardScope />}>
        <Route index element={<Profile />} />
      </Route>
      <Route path="/appointments" element={<DashboardScope />}>
        <Route index element={<Appointments />} />
      </Route>
      <Route path="/portfolio" element={<DashboardScope />}>
        <Route index element={<Portfolio />} />
      </Route>
      <Route path="/studios" element={<DashboardScope />}>
        <Route index element={<Studios />} />
      </Route>
      <Route path="/artist/:handle" element={<DashboardScope />}>
        <Route index element={<ArtistWorks />} />
      </Route>
      <Route path="/explore" element={<Gallery />} />
      <Route element={<PublicScope />}>
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signup/studio" element={<StudioSignup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />
        <Route path="/tiers" element={<Tiers />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/sso-callback" element={<SSOCallback />} />
        <Route path="/onboarding" element={<Onboarding />} />
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
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default App;