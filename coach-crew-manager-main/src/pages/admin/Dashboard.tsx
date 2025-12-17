import { useEffect, useState, useMemo } from "react";
import { adminApi, api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, Calendar, TrendingUp, MapPin, Clock } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, isWithinInterval } from "date-fns";
import { useSeason } from "@/contexts/SeasonContext";

const Dashboard = () => {
  const { activeSeasonId, activeSeason } = useSeason();
  const [counts, setCounts] = useState<{ players: number; coaches: number; groups: number } | null>(null);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [events, setEvents] = useState<Array<{ _id: string; title: string; date?: string; time?: string; location?: string; banner?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [teamSettings, setTeamSettings] = useState<any>(null);
  const [weekFilter, setWeekFilter] = useState<"this" | "next" | "all">("all");

  useEffect(() => {
    if (!activeSeasonId) return; // Don't fetch if no season selected
    
    (async () => {
      setLoading(true);
      try {
        const [playersRes, coachesRes, groupsRes, sessionsRes, eventsRes, settingsRes] = await Promise.all([
          api.get(`/api/players?season=${activeSeasonId}`),
          api.get(`/api/coaches?season=${activeSeasonId}`),
          api.get(`/api/groups?season=${activeSeasonId}`),
          api.get(`/api/sessions?season=${activeSeasonId}`),
          adminApi.events.list({ season: activeSeasonId }),
          adminApi.getSettings(),
        ]);
        
        setTeamSettings(settingsRes.data.settings);
        
        // Calculate counts from season-specific data
        const players = playersRes.data.players || [];
        const coaches = coachesRes.data.coaches || [];
        const groups = groupsRes.data.groups || [];
        const sessions = sessionsRes.data.events || [];
        const events = eventsRes.data.events || [];
        
        setCounts({
          players: players.length,
          coaches: coaches.length,
          groups: groups.length,
        });
        
        // Filter and generate upcoming sessions
        const now = new Date();
        const upcomingSessions: any[] = [];
        
        sessions.forEach((session: any) => {
          if (session.sessionType === "special") {
            // Special sessions - check if future
            const sessionDate = new Date(session.specialStartTime);
            if (sessionDate >= now) {
              upcomingSessions.push(session);
            }
          } else if (session.sessionType === "weekly") {
            // Weekly sessions - generate next occurrence
            const today = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
            const sessionDay = session.dayOfWeek; // 0 = Sunday, 1 = Monday, etc.
            
            // Calculate days until next occurrence
            let daysUntil = sessionDay - today;
            if (daysUntil <= 0) daysUntil += 7; // If today or past, get next week
            
            // Create next session date
            const nextSessionDate = new Date(now);
            nextSessionDate.setDate(now.getDate() + daysUntil);
            
            // Set the time
            const [hours, minutes] = session.weeklyStartTime.split(':');
            nextSessionDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            // Add to upcoming if it's in the future (or today but later time)
            if (nextSessionDate >= now) {
              upcomingSessions.push({
                ...session,
                nextOccurrence: nextSessionDate,
              });
            }
          }
        });
        
        setUpcoming(upcomingSessions);
        
        // Combine sessions and events for the events display
        const sessionEvents = upcomingSessions.map((it: any) => {
          let displayDate, displayTime;
          
          if (it.sessionType === "special") {
            displayDate = new Date(it.specialStartTime).toISOString().slice(0,10);
            displayTime = new Date(it.specialStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } else if (it.sessionType === "weekly" && it.nextOccurrence) {
            displayDate = it.nextOccurrence.toISOString().slice(0,10);
            displayTime = it.weeklyStartTime;
          }
          
          return {
            _id: it._id || it.id,
            title: it.title || it.name || "Session",
            date: displayDate,
            time: displayTime,
            location: it.location,
            banner: it.banner || it.photo,
          };
        });
        
        const actualEvents = events.map((event: any) => ({
          _id: event._id,
          title: event.title,
          date: event.date,
          time: event.time,
          location: event.location,
          banner: event.banner,
        }));
        
        setEvents([...sessionEvents, ...actualEvents]);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeSeasonId]);

  const filteredUpcoming = useMemo(() => {
    const now = new Date();
    
    if (weekFilter === "this") {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
      return upcoming.filter((session) =>
        isWithinInterval(new Date(session.start), { start: weekStart, end: weekEnd })
      );
    } else if (weekFilter === "next") {
      const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
      const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
      return upcoming.filter((session) =>
        isWithinInterval(new Date(session.start), { start: nextWeekStart, end: nextWeekEnd })
      );
    }
    
    return upcoming;
  }, [upcoming, weekFilter]);

  const tiles = [
    { title: "Total Players", value: counts?.players ?? "-", icon: Users, color: "text-primary" },
    { title: "Total Coaches", value: counts?.coaches ?? "-", icon: UserCheck, color: "text-secondary" },
    { title: "Active Groups", value: counts?.groups ?? "-", icon: TrendingUp, color: "text-accent" },
    { title: "Training Sessions", value: upcoming.length, icon: Calendar, color: "text-success" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        {teamSettings?.teamLogo && (
          <Avatar className="w-16 h-16">
            <AvatarImage src={`${import.meta.env.VITE_API_URL || "http://localhost:5000"}${teamSettings.teamLogo}`} />
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl">
              {teamSettings.teamName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "TM"}
            </AvatarFallback>
          </Avatar>
        )}
        <div>
          {teamSettings?.teamName && (
            <h2 className="text-2xl font-bold text-primary mb-1">{teamSettings.teamName}</h2>
          )}
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome back! Here's your team overview.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {tiles.map((stat) => (
          <Card key={stat.title} className="shadow-card hover:shadow-hover transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loading ? "…" : stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcoming.slice(0, 5).map((u, idx) => {
                const isGame = u.eventType && u.eventType !== 'training';
                const startDate = new Date(u.start);
                const groupName = typeof u.group === 'object' && u.group ? u.group.name : '—';
                
                return (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-lg border transition-colors ${
                      isGame 
                        ? 'border-orange-300 bg-orange-50 dark:bg-orange-950 dark:border-orange-800' 
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isGame ? 'bg-orange-600' : 'bg-primary'}`} />
                        <h4 className="font-semibold text-sm">{u.title || "Session"}</h4>
                      </div>
                      {isGame && (
                        <Badge className="bg-orange-600 text-xs capitalize">
                          {u.eventType}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="ml-5 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{format(startDate, "MMM dd, yyyy")}</span>
                        <Clock className="w-3 h-3 ml-2" />
                        <span>{format(startDate, "h:mm a")}</span>
                      </div>
                      
                      {isGame && u.opponent && (
                        <div className="text-xs font-medium">
                          <span className="text-muted-foreground">vs </span>
                          <span>{u.opponent}</span>
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground">
                        <span>Group: </span>
                        <span className="font-medium">{groupName}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!upcoming.length && <p className="text-sm text-muted-foreground">No recent activity</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Upcoming Sessions</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                variant={weekFilter === "this" ? "default" : "outline"}
                size="sm"
                onClick={() => setWeekFilter("this")}
                className={weekFilter === "this" ? "bg-gradient-primary" : ""}
              >
                This Week
              </Button>
              <Button
                variant={weekFilter === "next" ? "default" : "outline"}
                size="sm"
                onClick={() => setWeekFilter("next")}
                className={weekFilter === "next" ? "bg-gradient-primary" : ""}
              >
                Next Week
              </Button>
              <Button
                variant={weekFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setWeekFilter("all")}
                className={weekFilter === "all" ? "bg-gradient-primary" : ""}
              >
                All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredUpcoming.slice(0, 10).map((u, idx) => {
                const isGame = u.eventType && u.eventType !== 'training';
                const groupName = typeof u.group === 'object' && u.group ? u.group.name : '—';
                const groupSport = typeof u.group === 'object' && u.group ? u.group.sport : undefined;
                const startDate = new Date(u.start);
                const endDate = new Date(u.end);
                
                return (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-lg border transition-colors ${
                      isGame 
                        ? 'border-orange-300 bg-orange-50 dark:bg-orange-950 dark:border-orange-800' 
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{u.title || "Session"}</h4>
                        {isGame && (
                          <Badge className="bg-orange-600 text-xs capitalize">
                            {u.eventType}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {format(startDate, "MMM dd")}
                      </span>
                    </div>
                    
                    {isGame && u.opponent && (
                      <div className="text-sm font-medium mb-1">
                        <span className="text-muted-foreground">vs </span>
                        <span>{u.opponent}</span>
                        {u.locationType && (
                          <span className="text-muted-foreground ml-2">• {u.locationType}</span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Clock className="w-3 h-3" />
                      <span>{format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <MapPin className="w-3 h-3" />
                      <span>{u.location || "TBD"}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Group:</span>
                      <span className="font-medium">{groupName}</span>
                      {groupSport && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {groupSport}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
              {!filteredUpcoming.length && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {weekFilter === "this" 
                    ? "No sessions this week" 
                    : weekFilter === "next" 
                    ? "No sessions next week" 
                    : "No upcoming sessions"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const nowKey = new Date().toISOString().slice(0, 10);
              const upcomingEvents = events
                .filter(e => (e.date || '') >= nowKey)
                .sort((a,b) => (a.date||'').localeCompare(b.date||''))
                .slice(0, 6);
              if (!upcomingEvents.length) return <div className="text-sm text-muted-foreground">No upcoming events</div>;
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {upcomingEvents.map(ev => (
                    <div key={ev._id} className="rounded-lg overflow-hidden border bg-card">
                      <div className="relative h-20 w-full bg-muted">
                        {ev.banner ? (
                          <img src={ev.banner} alt={ev.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-r from-primary/20 to-primary/5" />
                        )}
                        <div className="absolute top-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                          {ev.date || '-'}
                        </div>
                      </div>
                      <div className="p-2 space-y-1">
                        <div className="text-sm font-medium truncate" title={ev.title}>{ev.title}</div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted">
                            <Calendar className="w-3 h-3" /> {ev.time || '-'}
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted">
                            <MapPin className="w-3 h-3" /> {ev.location || '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
