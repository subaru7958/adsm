import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, Trophy, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authApi, setToken } from "@/lib/api";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Try each role in order: Admin -> Coach -> Player
    try {
      // Try Admin login first
      try {
        const { data } = await authApi.adminLogin(credentials.email, credentials.password);
        setToken(data.token);
        toast({ title: "Login Successful!", description: "Welcome back, Admin!" });
        // Redirect to seasons page - user will select/create season first
        navigate("/admin/seasons");
        return;
      } catch (adminErr: any) {
        // Check if user needs verification
        if (adminErr?.response?.data?.needsVerification) {
          toast({
            title: "Email Not Verified",
            description: "Please verify your email address first",
            variant: "destructive"
          });
          navigate("/verify-email", {
            state: {
              email: adminErr.response.data.email,
              teamName: "Your Team",
              adminName: "Admin"
            }
          });
          return;
        }
        // Admin login failed, continue to next role
      }

      // Try Coach login
      try {
        const { data } = await authApi.coachLogin(credentials.email, credentials.password);
        setToken(data.token);
        toast({ title: "Login Successful!", description: "Welcome back, Coach!" });
        navigate("/coach");
        return;
      } catch (coachErr) {
        // Coach login failed, continue to next role
      }

      // Try Player login
      try {
        const { data } = await authApi.playerLogin(credentials.email, credentials.password);
        setToken(data.token);
        toast({ title: "Login Successful!", description: "Welcome back, Player!" });
        navigate("/player");
        return;
      } catch (playerErr) {
        // Player login failed
      }

      // If all attempts failed
      toast({ 
        title: "Login failed", 
        description: "Invalid email or password", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
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
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-primary shadow-primary hover:shadow-hover"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>

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
