import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useSeason } from "@/contexts/SeasonContext";
import { format } from "date-fns";

const AdminLayout = () => {
  const [teamSettings, setTeamSettings] = useState<any>(null);
  const { activeSeason } = useSeason();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchTeamSettings = async () => {
      try {
        const { data } = await adminApi.getSettings();
        setTeamSettings(data.settings);
      } catch (err) {
        // Silently fail if settings not available
      }
    };
    fetchTeamSettings();
  }, []);

  // Check if we're on the Seasons page
  const isOnSeasonsPage = location.pathname === '/admin/seasons' || location.pathname.startsWith('/admin/seasons/');
  
  // Show navbar if: on seasons page OR has active season
  const showNavbar = isOnSeasonsPage || !!activeSeason;
  
  // Debug logging
  console.log('AdminLayout Debug:', {
    pathname: location.pathname,
    isOnSeasonsPage,
    hasActiveSeason: !!activeSeason,
    showNavbar
  });
  
  // If should not show navbar, render without it
  if (!showNavbar) {
    return (
      <div className="min-h-screen bg-background">
        <Outlet />
      </div>
    );
  }

  // Show full layout with navbar and sidebar
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border flex items-center justify-between px-4 bg-card">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              {teamSettings?.teamLogo && (
                <Avatar className="w-10 h-10">
                  <AvatarImage src={`${import.meta.env.VITE_API_URL || "http://localhost:5000"}${teamSettings.teamLogo}`} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm">
                    {teamSettings.teamName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "TM"}
                  </AvatarFallback>
                </Avatar>
              )}
              <h2 className="ml-2 text-lg font-semibold">
                {teamSettings?.teamName || "Sports Team Manager"}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {activeSeason && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/admin/seasons')}
                  className="flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <div className="flex flex-col items-start">
                    <span className="text-xs font-semibold">{activeSeason.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(activeSeason.startDate), "MMM d")} - {format(new Date(activeSeason.endDate), "MMM d, yyyy")}
                    </span>
                  </div>
                </Button>
              )}
              {!activeSeason && isOnSeasonsPage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  disabled
                >
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">No Season Selected</span>
                </Button>
              )}
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 p-6 bg-background">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
