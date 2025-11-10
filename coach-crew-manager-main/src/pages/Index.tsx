import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Calendar, BarChart3 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("[Index] Component mounted successfully");
    console.log("[Index] Checking CSS custom properties...");
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const gradientPrimary = computedStyle.getPropertyValue('--gradient-primary');
    const gradientHero = computedStyle.getPropertyValue('--gradient-hero');
    console.log("[Index] --gradient-primary:", gradientPrimary || "NOT DEFINED");
    console.log("[Index] --gradient-hero:", gradientHero || "NOT DEFINED");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
          <div className="w-20 h-20 bg-gradient-primary bg-primary rounded-full flex items-center justify-center shadow-primary">
            <Trophy className="w-10 h-10 text-primary-foreground text-white" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-hero bg-clip-text text-transparent [text-shadow:none] supports-[background-clip:text]:text-transparent supports-[background-clip:text]:bg-gradient-hero text-primary">
            Sports Team Management System
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl">
            Complete solution for managing your sports teams across multiple disciplines. 
            Track players, schedule training, manage coaches, and review performance all in one place.
          </p>

          <div className="flex gap-4 flex-wrap justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/register")}
              className="bg-gradient-primary bg-primary text-primary-foreground shadow-primary hover:shadow-hover transition-all"
            >
              Register Your Team
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/login")}
              className="border-primary text-primary hover:bg-primary/10"
            >
              Sign In
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full">
            <div className="p-6 rounded-xl bg-card shadow-card hover:shadow-hover transition-shadow">
              <Users className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Player & Coach Management</h3>
              <p className="text-sm text-muted-foreground">
                Organize players and coaches efficiently with detailed profiles and role assignments.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card shadow-card hover:shadow-hover transition-shadow">
              <Calendar className="w-10 h-10 text-secondary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Training Scheduler</h3>
              <p className="text-sm text-muted-foreground">
                Plan weekly recurring sessions or special training events with ease.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card shadow-card hover:shadow-hover transition-shadow">
              <BarChart3 className="w-10 h-10 text-accent mb-4" />
              <h3 className="text-lg font-semibold mb-2">Performance Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Monitor attendance, review sessions, and track team progress with detailed analytics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
