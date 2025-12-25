import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, CheckCircle2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminApi, api } from "@/lib/api";
import { useSeason } from "@/contexts/SeasonContext";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Season {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  description?: string;
  
}

const Seasons = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setActiveSeason } = useSeason();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    description: ""
  });
  const [summaries, setSummaries] = useState<Record<string, {
    days: { date: string; hasItem: boolean }[];
    outOfRange: boolean;
    insideCount: number;
    outsideCount: number;
  }>>({});

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    try {
      const { data } = await adminApi.getSeasons();
      const list: Season[] = data.seasons || [];
      setSeasons(list);
      // Load summaries after seasons load
      loadSummaries(list);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to load seasons",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await adminApi.createSeason(formData);
      toast({ title: "Success", description: "Season created successfully" });
      setDialogOpen(false);
      setFormData({ name: "", startDate: "", endDate: "", description: "" });
      fetchSeasons();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to create season",
        variant: "destructive"
      });
    }
  };

  const handleSelectSeason = (season: Season) => {
    setActiveSeason(season);
    toast({ title: "Season Selected", description: `Now managing: ${season.name}` });
    navigate("/admin");
  };

  const handleDeleteSeason = async (seasonId: string) => {
    if (!confirm("Are you sure? This will delete all data associated with this season.")) return;
    
    try {
      await adminApi.deleteSeason(seasonId);
      toast({ title: "Success", description: "Season deleted successfully" });
      fetchSeasons();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to delete season",
        variant: "destructive"
      });
    }
  };

  const clampDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const loadSummaries = async (list: Season[]) => {
    try {
      const entries = await Promise.all(list.map(async (s) => {
        const sStart = clampDate(new Date(s.startDate));
        const sEnd = clampDate(new Date(s.endDate));
        // pick a 28-day window around today within season bounds for the mini timeline
        const today = clampDate(new Date());
        const winStart = clampDate(new Date(Math.max(sStart.getTime(), today.getTime() - 14*24*60*60*1000)));
        const winEnd = clampDate(new Date(Math.min(sEnd.getTime(), today.getTime() + 13*24*60*60*1000)));
        const startStr = winStart.toISOString().slice(0,10);
        const endStr = winEnd.toISOString().slice(0,10);

        // fetch expanded sessions within window
        let sessionEvents: any[] = [];
        try {
          const { data } = await api.get(`/api/sessions?season=${s._id}&start=${startStr}&end=${endStr}`);
          sessionEvents = data.events || [];
        } catch {}

        // fetch raw sessions to determine weekly/special patterns for out-of-range
        let rawSessions: any[] = [];
        try {
          const { data } = await api.get(`/api/sessions?season=${s._id}`);
          rawSessions = data.sessions || data.events || [];
        } catch {}

        // fetch events list for season
        let seasonEvents: any[] = [];
        try {
          const { data } = await adminApi.events.list({ season: s._id });
          seasonEvents = data.events || [];
        } catch {}

        const daySet = new Set<string>();
        sessionEvents.forEach((ev) => {
          const d = new Date(ev.start);
          const key = d.toISOString().slice(0,10);
          daySet.add(key);
        });
        seasonEvents.forEach((ev) => {
          const key = (ev.date || '').slice(0,10);
          if (key && key >= startStr && key <= endStr) daySet.add(key);
        });

        // Determine out-of-range: any event outside season, any special session outside season, any weekly sessions (repeat beyond season)
        let outsideCount = 0;
        let outOfRange = false;
        seasonEvents.forEach((ev) => {
          const d = ev.date ? new Date(ev.date) : null;
          if (d && (d < sStart || d > sEnd)) {
            outOfRange = true; outsideCount += 1;
          }
        });
        rawSessions.forEach((rs) => {
          if (rs.sessionType === 'special') {
            const d = rs.specialStartTime ? new Date(rs.specialStartTime) : null;
            if (d && (d < sStart || d > sEnd)) { outOfRange = true; outsideCount += 1; }
          } else if (rs.sessionType === 'weekly') {
            // weekly repeats beyond season end; mark as out-of-range indicator
            outOfRange = true; outsideCount += 1;
          }
        });

        // build days array for the mini timeline window
        const days: { date: string; hasItem: boolean }[] = [];
        for (let d = new Date(winStart); d <= winEnd; d.setDate(d.getDate() + 1)) {
          const key = d.toISOString().slice(0,10);
          days.push({ date: key, hasItem: daySet.has(key) });
        }

        return [s._id, {
          days,
          outOfRange,
          insideCount: daySet.size,
          outsideCount,
        } as const] as const;
      }));
      const obj: any = {};
      entries.forEach(([id, summary]) => { obj[id] = summary; });
      setSummaries(obj);
    } catch (e) {
      // ignore summary failures
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading seasons...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Season Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Select a season to manage or create a new one
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary shadow-primary">
                <Plus className="w-4 h-4 mr-2" />
                Create New Season
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Season</DialogTitle>
                <DialogDescription>
                  Add a new season to organize your team's activities
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSeason} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Season Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Winter Football 2024"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this season..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-primary">
                  Create Season
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {seasons.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Seasons Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first season to start managing your team
              </p>
              <Button onClick={() => setDialogOpen(true)} className="bg-gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Create First Season
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {seasons.map((season) => (
              <Card
                key={season._id}
                className="hover:shadow-lg transition-shadow cursor-pointer relative"
                onClick={() => handleSelectSeason(season)}
              >
                {season.isActive && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {season.name}
                    {summaries[season._id]?.outOfRange && (
                      <Badge variant="destructive" className="ml-2">Out-of-range items</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {format(new Date(season.startDate), "MMM d, yyyy")} - {format(new Date(season.endDate), "MMM d, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {season.description && (
                    <p className="text-sm text-muted-foreground mb-4">{season.description}</p>
                  )}

                  {/* Mini timeline strip */}
                  {summaries[season._id] && (
                    <div className="mb-3">
                      <div className="text-xs text-muted-foreground mb-1">Upcoming window</div>
                      <div className="grid grid-cols-14 gap-1">
                        {summaries[season._id].days.map((d, idx) => (
                          <div key={idx} title={d.date} className={`h-2 rounded ${d.hasItem ? 'bg-primary' : 'bg-muted'}`} />
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span>{summaries[season._id].insideCount} in-range</span>
                        {summaries[season._id].outOfRange && (
                          <span className="ml-2 text-destructive">• {summaries[season._id].outsideCount} flagged</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectSeason(season);
                      }}
                      className="flex-1 bg-gradient-primary"
                      size="sm"
                    >
                      Select Season
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSeason(season._id);
                      }}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Seasons;
