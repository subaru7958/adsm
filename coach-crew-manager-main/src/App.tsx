import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeProvider as CustomThemeProvider } from "@/contexts/ThemeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TeamRegister from "./pages/TeamRegister";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Players from "./pages/admin/Players";
import Coaches from "./pages/admin/Coaches";
import Groups from "./pages/admin/Groups";
import Training from "./pages/admin/Training";
import Review from "./pages/admin/Review";
import Events from "./pages/admin/Events";
import Settings from "./pages/admin/Settings";
import PlayerDashboard from "./pages/player/PlayerDashboard";
import CoachDashboard from "./pages/coach/CoachDashboard";
import CoachAttendance from "./pages/coach/CoachAttendance";

const queryClient = new QueryClient();

// Component to reset theme for public pages
const PublicPageWrapper = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // Reset CSS variables to default values for public pages
    const root = document.documentElement;
    root.style.removeProperty('--primary');
    root.style.removeProperty('--primary-foreground');
    root.style.removeProperty('--secondary');
    root.style.removeProperty('--secondary-foreground');
    root.style.removeProperty('--gradient-primary');
  }, []);

  return <>{children}</>;
};

// Wrapper component for authenticated routes with custom theming
const AuthenticatedRoutes = () => (
  <CustomThemeProvider>
    <Routes>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="players" element={<Players />} />
        <Route path="coaches" element={<Coaches />} />
        <Route path="groups" element={<Groups />} />
        <Route path="training" element={<Training />} />
        <Route path="events" element={<Events />} />
        <Route path="review" element={<Review />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="/player" element={<PlayerDashboard />} />
      <Route path="/coach" element={<CoachDashboard />} />
      <Route path="/coach/attendance/:sessionId" element={<CoachAttendance />} />
    </Routes>
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
