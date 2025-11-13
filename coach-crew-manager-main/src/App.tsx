import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeProvider as CustomThemeProvider } from "@/contexts/ThemeContext";
import { SeasonProvider } from "@/contexts/SeasonContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TeamRegister from "./pages/TeamRegister";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyEmail from "./pages/VerifyEmail";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Players from "./pages/admin/Players";
import Coaches from "./pages/admin/Coaches";
import Groups from "./pages/admin/Groups";
import Training from "./pages/admin/Training";
import Review from "./pages/admin/Review";
import Events from "./pages/admin/Events";
import Settings from "./pages/admin/Settings";
import Seasons from "./pages/admin/Seasons";
import PlayerDashboard from "./pages/player/PlayerDashboard";
import CoachDashboard from "./pages/coach/CoachDashboard";
import CoachAttendance from "./pages/coach/CoachAttendance";
import { SeasonGuard } from "./components/SeasonGuard";

const queryClient = new QueryClient();

// Component to reset theme for public pages
const PublicPageWrapper = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // Only remove custom team branding variables, keep default theme variables
    const root = document.documentElement;
    // Don't remove --primary, --gradient-primary etc as they're needed for the landing page
    // Only remove if they were customized by team settings
    const customPrimary = root.style.getPropertyValue('--primary');
    if (customPrimary && customPrimary !== '') {
      // Reset to default theme values instead of removing
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--secondary');
      root.style.removeProperty('--secondary-foreground');
      root.style.removeProperty('--gradient-primary');
    }
  }, []);

  return <>{children}</>;
};

// Wrapper component for authenticated routes with custom theming
const AuthenticatedRoutes = () => (
  <CustomThemeProvider>
    <SeasonProvider>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          {/* Seasons page is always accessible */}
          <Route path="seasons" element={<Seasons />} />
          {/* All other pages require an active season */}
          <Route index element={<SeasonGuard><Dashboard /></SeasonGuard>} />
          <Route path="players" element={<SeasonGuard><Players /></SeasonGuard>} />
          <Route path="coaches" element={<SeasonGuard><Coaches /></SeasonGuard>} />
          <Route path="groups" element={<SeasonGuard><Groups /></SeasonGuard>} />
          <Route path="training" element={<SeasonGuard><Training /></SeasonGuard>} />
          <Route path="events" element={<SeasonGuard><Events /></SeasonGuard>} />
          <Route path="review" element={<SeasonGuard><Review /></SeasonGuard>} />
          <Route path="settings" element={<SeasonGuard><Settings /></SeasonGuard>} />
        </Route>

        <Route path="/player" element={<PlayerDashboard />} />
        <Route path="/coach" element={<CoachDashboard />} />
        <Route path="/coach/attendance/:sessionId" element={<CoachAttendance />} />
      </Routes>
    </SeasonProvider>
  </CustomThemeProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="team-manager-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes - NO custom theming, reset to defaults */}
            <Route path="/" element={<PublicPageWrapper><Index /></PublicPageWrapper>} />
            <Route path="/register" element={<PublicPageWrapper><TeamRegister /></PublicPageWrapper>} />
            <Route path="/login" element={<PublicPageWrapper><Login /></PublicPageWrapper>} />
            <Route path="/forgot-password" element={<PublicPageWrapper><ForgotPassword /></PublicPageWrapper>} />
            <Route path="/verify-email" element={<PublicPageWrapper><VerifyEmail /></PublicPageWrapper>} />
            
            {/* Authenticated routes - WITH custom theming */}
            <Route path="/*" element={<AuthenticatedRoutes />} />

            {/* Catch-all */}
            <Route path="*" element={<PublicPageWrapper><NotFound /></PublicPageWrapper>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
