import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Calendar, Mail, Phone, User, Upload, Loader2, Archive, ClipboardCheck, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigate } from "react-router-dom";
import { clearToken } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { adminApi, coachApi, coachApiPassword } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfWeek, endOfWeek, addWeeks, isWithinInterval, subDays } from "date-fns";

const CoachDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [coaches, setCoaches] = useState<Array<{ _id: string; name?: string; email?: string; phone?: string; specialty?: string; photo?: string }>>([]);
  const [groups, setGroups] = useState<Array<{ _id: string; name: string; coaches?: string[] | any[]; players?: string[] | any[] }>>([]);
  const [allSessions, setAllSessions] = useState<Array<any>>([]);
  const [selectedCoachId, setSelectedCoachId] = useState<string>("");
  const [coachMode, setCoachMode] = useState(false);
  const [myProfile, setMyProfile] = useState<{ _id: string; name?: string; email?: string; phone?: string; specialty?: string; photo?: string } | null>(null);
  const [weekFilter, setWeekFilter] = useState<"this" | "next" | "all">("all");
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sessionPlayers, setSessionPlayers] = useState<any[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, 'present' | 'absent'>>({});
  const [generalNote, setGeneralNote] = useState<string>("");
  const [playerNotes, setPlayerNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [teamSettings, setTeamSettings] = useState<any>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchCoachData();
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

  const fetchCoachData = async () => {
    try {
      setLoading(true);
      const [coachesRes, groupsRes] = await Promise.all([
        adminApi.coaches.list(),
        adminApi.groups.list(),
      ]);
      setCoaches(coachesRes.data.coaches || []);
      setGroups(groupsRes.data.groups || []);
      
      // Try coach-auth mode first
      try {
        const meRes = await coachApi.myProfile();
        const me = meRes.data.coach || meRes.data?.data?.coach;
        if (me?._id) {
          setMyProfile(me);
          setSelectedCoachId(me._id);
          setCoachMode(true);
          
          // Load sessions with date range (next 60 days to catch more sessions)
          const start = format(new Date(), "yyyy-MM-dd");
          const end = format(addDays(new Date(), 60), "yyyy-MM-dd");
          const mySessRes = await coachApi.mySessions({ start, end });
          const data = mySessRes.data;
          const sessions = data.events || data.sessions || [];
          console.log("Fetched sessions for coach:", sessions);
          setAllSessions(sessions);
          
          try {
            const myGroupsRes = await coachApi.myGroups();
            const gs = myGroupsRes.data.groups || [];
            setGroups(gs);
          } catch (_) { /* ignore */ }
          setLoading(false);
          return;
        }
      } catch (_) {
        // fall back to admin mode below
      }
      
      // Admin mode fallback
      const start = format(new Date(), "yyyy-MM-dd");
      const end = format(addDays(new Date(), 60), "yyyy-MM-dd");
      const sessRes = await adminApi.sessions.list({ start, end });
      const sessions = sessRes.data.events || sessRes.data.sessions || sessRes.data || [];
      console.log("Fetched sessions (admin mode):", sessions);
      setAllSessions(sessions);
      const firstId = (coachesRes.data.coaches?.[0]?._id) || "";
      setSelectedCoachId(firstId);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to load coach data",
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

  const profile = useMemo(() => (coachMode && myProfile) ? myProfile : coaches.find(c => c._id === selectedCoachId), [coachMode, myProfile, coaches, selectedCoachId]);
  
  const assignedGroups = useMemo(() => {
    if (coachMode) {
      return groups.map((g: any) => ({ name: g.name, players: (g.players || []).length }));
    }
    if (!selectedCoachId) return [] as Array<{ name: string; players: number }>;
    return groups
      .filter(g => (g.coaches || []).some((c: any) => (typeof c === 'string' ? c === selectedCoachId : c?._id === selectedCoachId)))
      .map(g => ({ name: g.name, players: (g.players || []).length }));
  }, [groups, selectedCoachId, coachMode]);

  const getFilteredSessions = (archived: boolean = false) => {
    const now = new Date();
    const coachId = selectedCoachId;
    if (!coachId) return [];

    // In coach mode, sessions are already filtered by backend
    // In admin mode, we need to filter by selected coach
    let coachSessions = allSessions;
    if (!coachMode) {
      coachSessions = allSessions.filter((s: any) => {
        const c = s.coach;
        const sc = s.substituteCoach;
        const cid = typeof c === 'string' ? c : c?._id;
        const sid = typeof sc === 'string' ? sc : sc?._id;
        return cid === coachId || sid === coachId;
      });
    }

    // Filter by archived status (sessions that ended more than 1 hour ago)
    const oneHourAgo = subDays(now, 0).getTime() - (60 * 60 * 1000);
    coachSessions = coachSessions.filter((s: any) => {
      if (!s.end) return !archived;
      const endTime = new Date(s.end).getTime();
      return archived ? endTime < oneHourAgo : endTime >= oneHourAgo;
    });

    // Apply week filter (only for upcoming sessions)
    let filtered = coachSessions;
    if (!archived) {
      if (weekFilter === "this") {
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        filtered = coachSessions.filter((s: any) => {
          if (!s.start) return false;
          return isWithinInterval(new Date(s.start), { start: weekStart, end: weekEnd });
        });
      } else if (weekFilter === "next") {
        const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
        const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
        filtered = coachSessions.filter((s: any) => {
          if (!s.start) return false;
          return isWithinInterval(new Date(s.start), { start: nextWeekStart, end: nextWeekEnd });
        });
      }
    }

    // Sort and format
    return filtered
      .filter((s: any) => s.start && s.end) // Only sessions with valid dates
      .sort((a: any, b: any) => {
        const aTime = new Date(a.start).getTime();
        const bTime = new Date(b.start).getTime();
        return archived ? bTime - aTime : aTime - bTime; // Reverse order for archived
      })
      .map((s: any) => {
        const startDate = new Date(s.start);
        const endDate = new Date(s.end);
        const groupName = typeof s.group === 'object' && s.group ? s.group.name : '—';
        const groupSport = typeof s.group === 'object' && s.group ? s.group.sport : undefined;
        
        return {
          id: s._id,
          title: s.title || "Training Session",
          date: format(startDate, "EEEE, MMM dd, yyyy"),
          time: `${format(startDate, "h:mm a")} - ${format(endDate, "h:mm a")}`,
          group: groupName,
          sport: groupSport,
          location: s.location || 'TBD',
          status: startDate.getTime() <= Date.now() ? 'completed' : 'upcoming' as 'completed' | 'upcoming',
          start: startDate,
          dateStr: format(startDate, "yyyy-MM-dd"),
          // Game-specific fields
          eventType: s.eventType,
          opponent: s.opponent,
          locationType: s.locationType,
          teamScore: s.teamScore,
          opponentScore: s.opponentScore,
          isCompleted: s.isCompleted,
          gameNotes: s.gameNotes,
        };
      });
  };

  const upcomingSessions = getFilteredSessions(false);
  const archivedSessions = getFilteredSessions(true);

  const handleSessionClick = async (session: any) => {
    setSelectedSession(session);
    setDialogOpen(true);
    setLoadingPlayers(true);
    
    try {
      const { data } = await coachApi.sessionRoster(session.id);
      const players = data.players || [];
      setSessionPlayers(players);
      setStatuses(Object.fromEntries(players.map((p: any) => [p._id, 'present'])));
      setPlayerNotes({});
      setGeneralNote("");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to load players",
        variant: "destructive",
      });
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleSubmitAttendance = async () => {
    if (!selectedSession) return;
    
    setSubmitting(true);
    try {
      const records = Object.entries(statuses).map(([playerId, status]) => ({ playerId, status }));
      await coachApi.submitAttendance({ sessionId: selectedSession.id, date: selectedSession.dateStr, records });
      
      // Submit notes if any
      const playerNotesArray = Object.entries(playerNotes)
        .filter(([_, note]) => note.trim())
        .map(([player, note]) => ({ player, note }));
      
      if (generalNote.trim() || playerNotesArray.length > 0) {
        await coachApi.submitNotes({ 
          sessionId: selectedSession.id, 
          date: selectedSession.dateStr, 
          generalNote: generalNote.trim() || undefined,
          playerNotes: playerNotesArray.length > 0 ? playerNotesArray : undefined
        });
      }
      
      toast({ title: "Success", description: "Attendance and notes submitted!" });
      setDialogOpen(false);
      setSelectedSession(null);
      fetchCoachData(); // Refresh to update archived sessions
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to submit",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggle = (id: string) => {
    setStatuses((prev: any) => ({ ...prev, [id]: prev[id] === 'present' ? 'absent' : 'present' }));
  };

  const presentCount = Object.values(statuses).filter((s: any) => s === 'present').length;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!coachMode) {
      toast({ title: "Error", description: "Photo upload only available in coach mode", variant: "destructive" });
      return;
    }
    
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("photo", file);
      
      await adminApi.coaches.update(myProfile!._id, formData);
      toast({ title: "Success", description: "Photo updated successfully!" });
      fetchCoachData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to upload photo",
        variant: "destructive",
      });
    }
  };

  const navigate = useNavigate();
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
      await coachApiPassword.changePassword({
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
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
                Coach Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">{profile ? `Welcome back, ${profile.name}!` : 'Choose a coach to view details.'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!coachMode && (
              <select className="border rounded px-3 py-2 text-sm" value={selectedCoachId} onChange={(e) => setSelectedCoachId(e.target.value)}>
                {coaches.map(c => (
                  <option key={c._id} value={c._id}>{c.name || c.email}</option>
                ))}
              </select>
            )}
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
                        <Label htmlFor="coach-current-password">Current Password</Label>
                        <Input
                          id="coach-current-password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="coach-new-password">New Password</Label>
                        <Input
                          id="coach-new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="coach-confirm-password">Confirm New Password</Label>
                        <Input
                          id="coach-confirm-password"
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
                  <AvatarImage src={profile?.photo ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${profile.photo}` : ""} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl">
                    {(profile?.name || 'Coach').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {coachMode && (
                  <>
                    <label htmlFor="coach-photo-upload">
                      <Button variant="outline" size="sm" type="button" onClick={() => document.getElementById('coach-photo-upload')?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Photo
                      </Button>
                    </label>
                    <input
                      id="coach-photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{profile?.name || '-'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{profile?.email || '-'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{profile?.phone || '-'}</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Specialty</span>
                  <span className="text-sm font-medium capitalize">{profile?.specialty || '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                My Groups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assignedGroups.map((group, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-border">
                    <h4 className="font-semibold mb-1">{group.name}</h4>
                    <p className="text-sm text-muted-foreground">{group.players} players</p>
                  </div>
                ))}
                {!assignedGroups.length && (
                  <div className="text-sm text-muted-foreground">No groups assigned.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Training Sessions
              </CardTitle>
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
                  All
                </Button>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {upcomingSessions.map((session) => {
                  const isGame = session.eventType && session.eventType !== 'training';
                  return (
                  <div 
                    key={session.id} 
                    className={`p-3 rounded-lg border cursor-pointer transition-all space-y-2 ${
                      isGame 
                        ? 'border-orange-300 bg-orange-50 dark:bg-orange-950 dark:border-orange-800 hover:border-orange-400' 
                        : 'border-border hover:border-primary hover:bg-muted/50'
                    }`}
                    onClick={() => handleSessionClick(session)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{session.title}</h4>
                        {isGame && (
                          <Badge className="bg-orange-600 text-xs capitalize">
                            {session.eventType}
                          </Badge>
                        )}
                      </div>
                      <Badge
                        variant={session.status === "completed" ? "default" : "secondary"}
                        className={session.status === "completed" ? "bg-success" : ""}
                      >
                        {session.status}
                      </Badge>
                    </div>
                    
                    {isGame && (
                      <div className="text-sm font-medium">
                        <span className="text-muted-foreground">vs </span>
                        <span>{session.opponent || 'TBD'}</span>
                        <span className="text-muted-foreground ml-2">• </span>
                        <span className="capitalize text-xs">{session.locationType || 'TBD'} Game</span>
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">{session.date}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      {session.group}
                      {session.sport && (
                        <span className="px-2 py-0.5 rounded-full bg-muted text-xs capitalize">{session.sport}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.time} • {session.location}
                    </p>
                    
                    {isGame && session.isCompleted && session.teamScore !== undefined && session.opponentScore !== undefined && (
                      <div className="pt-2 border-t border-orange-200 dark:border-orange-800">
                        <span className="text-sm font-semibold text-green-600">
                          Final Score: {session.teamScore} - {session.opponentScore}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-primary pt-1">
                      <ClipboardCheck className="w-3 h-3" />
                      <span>{isGame ? 'Click to mark attendance & enter score' : 'Click to mark attendance'}</span>
                    </div>
                  </div>
                  );
                })}
                {!upcomingSessions.length && (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    {weekFilter === "this" 
                      ? "No sessions this week" 
                      : weekFilter === "next" 
                      ? "No sessions next week" 
                      : "No upcoming sessions"}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Archived Sessions */}
        {archivedSessions.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="w-5 h-5" />
                Archived Training Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {archivedSessions.map((session) => {
                  const isGame = session.eventType && session.eventType !== 'training';
                  return (
                  <div key={session.id} className="p-3 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{session.title}</h4>
                        {isGame && (
                          <Badge className="bg-orange-600 text-xs capitalize">
                            {session.eventType}
                          </Badge>
                        )}
                      </div>
                      <Badge variant="default" className="bg-green-600">
                        Completed
                      </Badge>
                    </div>
                    
                    {isGame && (
                      <div className="text-sm font-medium">
                        <span className="text-muted-foreground">vs </span>
                        <span>{session.opponent || 'TBD'}</span>
                        <span className="text-muted-foreground ml-2">• </span>
                        <span className="capitalize text-xs">{session.locationType || 'TBD'} Game</span>
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">{session.date}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      {session.group}
                      {session.sport && (
                        <span className="px-2 py-0.5 rounded-full bg-muted text-xs capitalize">{session.sport}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.time} • {session.location}
                    </p>
                    
                    {isGame && session.isCompleted && session.teamScore !== undefined && session.opponentScore !== undefined && (
                      <div className="pt-2 border-t border-green-300 dark:border-green-700">
                        <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                          Final Score: {session.teamScore} - {session.opponentScore}
                        </span>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Attendance Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedSession?.title || "Training Session"}
            </DialogTitle>
            <div className="text-sm text-muted-foreground space-y-1 pt-2">
              <p>{selectedSession?.date}</p>
              <p>{selectedSession?.time} • {selectedSession?.location}</p>
              <p className="flex items-center gap-2">
                {selectedSession?.group}
                {selectedSession?.sport && (
                  <span className="px-2 py-0.5 rounded-full bg-muted text-xs capitalize">{selectedSession?.sport}</span>
                )}
              </p>
            </div>
          </DialogHeader>

          {loadingPlayers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6 pt-4">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Players Attendance</h3>
                  <Badge variant="secondary" className="text-sm">
                    {presentCount}/{sessionPlayers.length} present
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {sessionPlayers.map((p: any) => (
                    <div key={p._id} className="border rounded-lg p-4 space-y-3 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{p.name || p.email || 'Player'}</span>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant={statuses[p._id] === 'present' ? 'default' : 'outline'} 
                            onClick={() => toggle(p._id)}
                          >
                            Present
                          </Button>
                          <Button 
                            size="sm" 
                            variant={statuses[p._id] === 'absent' ? 'destructive' : 'outline'} 
                            onClick={() => toggle(p._id)}
                          >
                            Absent
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        placeholder="Add note for this player (optional)"
                        value={playerNotes[p._id] || ""}
                        onChange={(e) => setPlayerNotes((prev: any) => ({ ...prev, [p._id]: e.target.value }))}
                        className="min-h-[70px]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">General Session Notes</h3>
                <Textarea
                  placeholder="Add general notes about this training session (optional)"
                  value={generalNote}
                  onChange={(e) => setGeneralNote(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  className="flex-1 bg-gradient-primary" 
                  onClick={handleSubmitAttendance} 
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Attendance & Notes'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoachDashboard;
