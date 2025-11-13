import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Mail, Phone, User, Upload, Loader2, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigate } from "react-router-dom";
import { clearToken, playerApi, adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfWeek, endOfWeek, addWeeks, isWithinInterval } from "date-fns";
import { useSeason } from "@/contexts/SeasonContext";

const PlayerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeSeason } = useSeason();
  const [loading, setLoading] = useState(true);
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [weekFilter, setWeekFilter] = useState<"this" | "next" | "all">("this");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [teamSettings, setTeamSettings] = useState<any>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchPlayerData();
    fetchTeamSettings();
  }, []);

  const fetchTeamSettings = async () => {
    try {
      const { data } = await adminApi.getSettings();
      setTeamSettings(data.settings);
    } catch (err) {
      // Silently fail if settings not available
    }
  };

  const fetchPlayerData = async () => {
    try {
      setLoading(true);
      
      // Fetch player profile
      const profileRes = await playerApi.myProfile();
      setPlayerInfo(profileRes.data.player);
      setGroups(profileRes.data.groups || []);

      // Fetch upcoming sessions (next 30 days)
      const start = format(new Date(), "yyyy-MM-dd");
      const end = format(addDays(new Date(), 30), "yyyy-MM-dd");
      const scheduleRes = await playerApi.mySchedule({ start, end });
      
      // Sort sessions by date
      const sortedSessions = (scheduleRes.data.events || [])
        .sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime());
      
      setAllSessions(sortedSessions);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to load player data",
        variant: "destructive",
      });
      if (err?.response?.status === 401) {
        clearToken();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("photo", file);
      
      await playerApi.updateMyProfile(formData);
      toast({ title: "Success", description: "Photo updated successfully!" });
      fetchPlayerData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to upload photo",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    clearToken();
    navigate("/login");
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      setChangingPassword(true);
      await playerApi.changePassword({
        currentPassword,
        newPassword,
      });
      toast({
        title: "Success",
        description: "Password changed successfully!",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSettingsOpen(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const getFilteredSessions = () => {
    const now = new Date();
    
    if (weekFilter === "this") {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
      return allSessions.filter((session) =>
        isWithinInterval(new Date(session.start), { start: weekStart, end: weekEnd })
      );
    } else if (weekFilter === "next") {
      const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
      const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
      return allSessions.filter((session) =>
        isWithinInterval(new Date(session.start), { start: nextWeekStart, end: nextWeekEnd })
      );
    }
    
    return allSessions;
  };

  const filteredSessions = getFilteredSessions();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!playerInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center">
        <p>No player data found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {teamSettings?.teamLogo && (
              <Avatar className="w-16 h-16">
                <AvatarImage src={`${import.meta.env.VITE_API_URL || "http://localhost:5000"}${teamSettings.teamLogo}`} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                  {teamSettings.teamName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "TM"}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              {teamSettings?.teamName && (
                <h2 className="text-2xl font-bold text-primary mb-1">{teamSettings.teamName}</h2>
              )}
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Player Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">Welcome back, {playerInfo.name}!</p>
              {activeSeason && (
                <div className="flex items-center gap-2 mt-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {activeSeason.name} • {format(new Date(activeSeason.startDate), "MMM d")} - {format(new Date(activeSeason.endDate), "MMM d, yyyy")}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Change Password</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="player-current-password">Current Password</Label>
                        <Input
                          id="player-current-password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="player-new-password">New Password</Label>
                        <Input
                          id="player-new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="player-confirm-password">Confirm New Password</Label>
                        <Input
                          id="player-confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                        />
                      </div>
                      <Button
                        onClick={handleChangePassword}
                        disabled={changingPassword}
                        className="w-full bg-gradient-primary"
                      >
                        {changingPassword ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Changing...
                          </>
                        ) : (
                          "Change Password"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <ThemeToggle />
            <Button variant="outline" onClick={handleLogout}>Logout</Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="shadow-card md:col-span-1">
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center">
                <Avatar className="w-24 h-24 mb-4">
                  <AvatarImage src={playerInfo.photo ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${playerInfo.photo}` : ""} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl">
                    {playerInfo.name?.split(" ").map((n: string) => n[0]).join("") || "P"}
                  </AvatarFallback>
                </Avatar>
                <label htmlFor="photo-upload">
                  <Button variant="outline" size="sm" type="button" onClick={() => document.getElementById('photo-upload')?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
                </label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{playerInfo.name || "N/A"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{playerInfo.email || "N/A"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{playerInfo.phone || "N/A"}</span>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sport</span>
                  <span className="text-sm font-medium capitalize">{playerInfo.sport || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Group{groups.length > 1 ? "s" : ""}</span>
                  <span className="text-sm font-medium">
                    {groups.length > 0 ? groups.map(g => g.name).join(", ") : "No group assigned"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Training Sessions
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Button
                  variant={weekFilter === "this" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setWeekFilter("this")}
                  className={weekFilter === "this" ? "bg-gradient-primary shadow-primary" : ""}
                >
                  This Week
                </Button>
                <Button
                  variant={weekFilter === "next" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setWeekFilter("next")}
                  className={weekFilter === "next" ? "bg-gradient-primary shadow-primary" : ""}
                >
                  Next Week
                </Button>
                <Button
                  variant={weekFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setWeekFilter("all")}
                  className={weekFilter === "all" ? "bg-gradient-primary shadow-primary" : ""}
                >
                  All Upcoming
                </Button>
              </div>
              <div className="space-y-4">
                {filteredSessions.length > 0 ? (
                  filteredSessions.map((session, idx) => {
                    const isGame = (session as any).eventType && (session as any).eventType !== 'training';
                    const isPast = new Date(session.end) < new Date();
                    const isCompleted = (session as any).isCompleted;
                    
                    return (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border transition-colors ${
                        isGame 
                          ? 'border-orange-300 bg-orange-50 dark:bg-orange-950 dark:border-orange-800 hover:border-orange-400' 
                          : 'border-border hover:border-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{session.title || "Training Session"}</h4>
                          {isPast && (
                            <Badge className="bg-green-600 text-xs">
                              COMPLETED
                            </Badge>
                          )}
                          {isGame && (
                            <Badge className="bg-orange-600 text-xs">
                              {(session as any).eventType?.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(session.start), "EEEE, MMM dd, yyyy")}
                        </span>
                      </div>
                      
                      {isGame && (
                        <div className="mb-2 text-sm">
                          <span className="font-medium">vs {(session as any).opponent || 'TBD'}</span>
                          <span className="text-muted-foreground ml-2">
                            • {(session as any).locationType ? `${(session as any).locationType.charAt(0).toUpperCase() + (session as any).locationType.slice(1)} Game` : ''}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{format(new Date(session.start), "h:mm a")} - {format(new Date(session.end), "h:mm a")}</span>
                        <span>{session.location || "TBD"}</span>
                      </div>
                      
                      {isGame && isPast && isCompleted && (session as any).teamScore !== undefined && (session as any).opponentScore !== undefined && (
                        <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Final Score:</span>
                            <span className="text-lg font-bold">
                              {(session as any).teamScore} - {(session as any).opponentScore}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {session.group && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Group: {session.group.name}
                        </p>
                      )}
                    </div>
                    );
                  })
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    {weekFilter === "this" 
                      ? "No training sessions this week" 
                      : weekFilter === "next" 
                      ? "No training sessions next week" 
                      : "No upcoming training sessions scheduled"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PlayerDashboard;
