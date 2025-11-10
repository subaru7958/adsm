import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogIn, Trophy, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authApi, setToken } from "@/lib/api";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [adminData, setAdminData] = useState({ email: "", password: "" });
  const [playerData, setPlayerData] = useState({ email: "", password: "" });
  const [coachData, setCoachData] = useState({ email: "", password: "" });
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showPlayerPassword, setShowPlayerPassword] = useState(false);
  const [showCoachPassword, setShowCoachPassword] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await authApi.adminLogin(adminData.email, adminData.password);
      setToken(data.token);
      toast({ title: "Login Successful!", description: "Welcome back, Admin!" });
      navigate("/admin");
    } catch (err: any) {
      toast({ title: "Login failed", description: err?.response?.data?.message || "Invalid credentials", variant: "destructive" });
    }
  };

  const handlePlayerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await authApi.playerLogin(playerData.email, playerData.password);
      setToken(data.token);
      toast({ title: "Login Successful!", description: "Welcome back, Player!" });
      navigate("/player");
    } catch (err: any) {
      toast({ title: "Login failed", description: err?.response?.data?.message || "Invalid credentials", variant: "destructive" });
    }
  };

  const handleCoachLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await authApi.coachLogin(coachData.email, coachData.password);
      setToken(data.token);
      toast({ title: "Login Successful!", description: "Welcome back, Coach!" });
      navigate("/coach");
    } catch (err: any) {
      toast({ title: "Login failed", description: err?.response?.data?.message || "Invalid credentials", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-card">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center shadow-primary mb-2">
            <Trophy className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Welcome Back
          </CardTitle>
          <CardDescription>
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="admin" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="admin">Admin</TabsTrigger>
              <TabsTrigger value="player">Player</TabsTrigger>
              <TabsTrigger value="coach">Coach</TabsTrigger>
            </TabsList>

            <TabsContent value="admin">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={adminData.email}
                    onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="admin-password"
                      type={showAdminPassword ? "text" : "password"}
                      value={adminData.password}
                      onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                    >
                      {showAdminPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-gradient-primary shadow-primary hover:shadow-hover">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In as Admin
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="player">
              <form onSubmit={handlePlayerLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="player-email">Email</Label>
                  <Input
                    id="player-email"
                    type="email"
                    placeholder="player@example.com"
                    value={playerData.email}
                    onChange={(e) => setPlayerData({ ...playerData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="player-password"
                      type={showPlayerPassword ? "text" : "password"}
                      placeholder="Your name"
                      value={playerData.password}
                      onChange={(e) => setPlayerData({ ...playerData, password: e.target.value })}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPlayerPassword(!showPlayerPassword)}
                    >
                      {showPlayerPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-gradient-primary shadow-primary hover:shadow-hover">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In as Player
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="coach">
              <form onSubmit={handleCoachLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="coach-email">Email</Label>
                  <Input
                    id="coach-email"
                    type="email"
                    placeholder="coach@example.com"
                    value={coachData.email}
                    onChange={(e) => setCoachData({ ...coachData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coach-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="coach-password"
                      type={showCoachPassword ? "text" : "password"}
                      placeholder="Your name"
                      value={coachData.password}
                      onChange={(e) => setCoachData({ ...coachData, password: e.target.value })}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowCoachPassword(!showCoachPassword)}
                    >
                      {showCoachPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-gradient-primary shadow-primary hover:shadow-hover">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In as Coach
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-4 text-center space-y-2">
            <Button variant="link" onClick={() => navigate("/forgot-password")}>
              Forgot password?
            </Button>
            <div>
              <Button variant="link" onClick={() => navigate("/register")}>
                Don't have an account? Register your team
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
