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
import { adminApi } from "@/lib/api";
import { useSeason } from "@/contexts/SeasonContext";
import { format } from "date-fns";

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

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    try {
      const { data } = await adminApi.getSeasons();
      setSeasons(data.seasons || []);
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
              <fieldset disabled={true} style={{ border: "none", padding: 0 }}>
              <form onSubmit={handleCreateSeason} className="space-y-4" dis>
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
              </fieldset>
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
                  </CardTitle>
                  <CardDescription>
                    {format(new Date(season.startDate), "MMM d, yyyy")} - {format(new Date(season.endDate), "MMM d, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {season.description && (
                    <p className="text-sm text-muted-foreground mb-4">{season.description}</p>
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
