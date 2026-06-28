import React, { useEffect, useMemo, lazy, Suspense } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/clerk-react";

// Pages are route-level and code-split so anonymous/landing visitors don't
// download the whole authenticated app up front.
const SignUp = lazy(() => import("./pages/Signup"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Appointments = lazy(() => import("./pages/Appointments"));
const Contact = lazy(() => import("./pages/Contact"));
const About = lazy(() => import("./pages/About"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Tiers = lazy(() => import("./pages/Tiers"));
const ArtistWorks = lazy(() => import("./pages/ArtistWorks"));
const Studios = lazy(() => import("./pages/Studios"));
const Admin = lazy(() => import("./pages/Admin"));
const Landing = lazy(() => import("./pages/Landing"));
const SSOCallback = lazy(() => import("./pages/SSOCallback"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const StudioSignup = lazy(() => import("./pages/StudioSignup"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const FAQ = lazy(() => import("./pages/FAQ"));
const NotFound = lazy(() => import("./pages/NotFound"));
import { useTheme, setThemeAccount } from "@/hooks/useTheme";
import { useRole } from "@/hooks/useRole";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { useOnboarded } from "@/hooks/useOnboarded";
import ComingSoon from "./components/access/ComingSoon";
import CookieConsent from "./components/access/CookieConsent";
import { isTestingMode, resolvePreviewAccess } from "@/lib/launch";
import { initAnalytics } from "@/lib/analytics";
import { STUDIOS_ENABLED } from "@/lib/features";

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
          <>
            <Outlet />
            <CookieConsent />
          </>
        )}
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </div>
  );
};

const HomeRedirect: React.FC = () => {
  const { role, isLoaded } = useRole();
  if (!isLoaded) return null;
  const isProvider = role === "artist" || role === "studio";
  return <Navigate to={isProvider ? "/dashboard" : "/artists"} replace />;
};

const ProviderDashboard: React.FC = () => {
  const { role, isLoaded } = useRole();
  if (!isLoaded) return null;
  if (role === "client") return <Navigate to="/artists" replace />;
  return <Dashboard />;
};

const ThemeAccountSync: React.FC = () => {
  const { user } = useUser();
  useEffect(() => {
    setThemeAccount(user?.id ?? null);
  }, [user?.id]);
  return null;
};

const App: React.FC = () => {
  useInactivityLogout();
  useEffect(() => {
    initAnalytics();
  }, []);

  const previewAllowed = useMemo(() => resolvePreviewAccess(), []);
  if (isTestingMode && !previewAllowed) return <ComingSoon />;

  return (
    <>
      <a
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          const main = document.querySelector("main");
          if (main) {
            main.setAttribute("tabindex", "-1");
            (main as HTMLElement).focus();
            main.scrollIntoView();
          }
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[2147483647] focus:rounded-lg focus:bg-[color:var(--fg)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[color:var(--bg)] focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--fg)]/40"
      >
        Skip to content
      </a>
      <ThemeAccountSync />
      <Suspense fallback={null}>
      <Routes>
      <Route path="/artists" element={<DashboardScope />}>
        <Route index element={<Dashboard />} />
      </Route>
      <Route path="/dashboard" element={<DashboardScope />}>
        <Route index element={<ProviderDashboard />} />
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
      {STUDIOS_ENABLED && (
        <Route path="/studios" element={<DashboardScope />}>
          <Route index element={<Studios />} />
        </Route>
      )}
      <Route path="/admin" element={<DashboardScope />}>
        <Route index element={<Admin />} />
      </Route>
      <Route path="/explore" element={<Gallery />} />
      <Route element={<PublicScope />}>
        <Route path="/signup" element={<SignUp />} />
        {STUDIOS_ENABLED && <Route path="/signup/studio" element={<StudioSignup />} />}
        <Route path="/login" element={<Login />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />
        <Route path="/tiers" element={<Tiers />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/artist/:handle" element={<ArtistWorks />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/sso-callback" element={<SSOCallback />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          path="/"
          element={
            <>
              <SignedIn>
                <HomeRedirect />
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
      </Suspense>
    </>
  );
};

export default App;