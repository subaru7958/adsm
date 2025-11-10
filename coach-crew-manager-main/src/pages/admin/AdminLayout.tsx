import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { adminApi } from "@/lib/api";

const AdminLayout = () => {
  const [teamSettings, setTeamSettings] = useState<any>(null);

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
            <ThemeToggle />
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
