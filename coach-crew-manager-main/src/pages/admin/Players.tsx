import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, Eye, Mail, Phone, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminApi } from "@/lib/api";
import { Label } from "@/components/ui/label";
import { useSeason } from "@/contexts/SeasonContext";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Players = () => {
  const { toast } = useToast();
  const { activeSeasonId } = useSeason();
  const [searchQuery, setSearchQuery] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");
  const [rows, setRows] = useState<Array<{ _id: string; name?: string; email?: string; phone?: string; photo?: string; sport?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<{ _id: string; name?: string; email?: string; phone?: string; photo?: string; sport?: string } | null>(null);
  const [form, setForm] = useState<{ name: string; email: string; phone: string; sport: string }>({ name: "", email: "", phone: "", sport: "football" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [viewPlayer, setViewPlayer] = useState<{ _id: string; name?: string; email?: string; phone?: string; photo?: string; sport?: string } | null>(null);

  useEffect(() => {
    if (!activeSeasonId) return; // Don't fetch if no season selected
    
    (async () => {
      setLoading(true);
      try {
        // Pass season query parameter
        const { data } = await api.get(`/api/players?season=${activeSeasonId}`);
        setRows(data.players || []);
      } catch (err: any) {
        toast({ title: "Failed to load players", description: err?.response?.data?.message || "Please try again", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [activeSeasonId, toast]);

  // Get unique sports from current players
  const availableSports = useMemo(() => {
    const sports = new Set(rows.map(p => p.sport || "football"));
    return Array.from(sports).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    
    // Filter by discipline
    if (disciplineFilter !== "all") {
      result = result.filter((p) => (p.sport || "football") === disciplineFilter);
    }
    
    // Filter by search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((p) =>
        [p.name, p.email, p.phone].some((v) => (v || "").toLowerCase().includes(q))
      );
    }
    
    return result;
  }, [rows, searchQuery, disciplineFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", email: "", phone: "", sport: "football" });
    setPhoto(null);
    setPhotoPreview("");
    setShowForm(true);
  };

  const openEdit = (p: { _id: string; name?: string; email?: string; phone?: string; photo?: string; sport?: string }) => {
    setEditing(p);
    setForm({ name: p.name || "", email: p.email || "", phone: p.phone || "", sport: p.sport || "football" });
    setPhoto(null);
    setPhotoPreview(p.photo || "");
    setShowForm(true);
  };

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setPhoto(f);
    if (f) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPhotoPreview("");
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      toast({ title: "Name and Email are required", variant: "destructive" });
      return;
    }
    if (!activeSeasonId) {
      toast({ title: "No season selected", description: "Please select a season first", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("email", form.email);
      if (form.phone) fd.append("phone", form.phone);
      if (photo) fd.append("photo", photo);
      if (form.sport) fd.append("sport", form.sport);
      fd.append("seasonId", activeSeasonId); // Add seasonId to form data
      
      if (editing) {
        await adminApi.players.update(editing._id, fd);
        setRows(prev => prev.map(p => p._id === editing._id ? { ...p, ...form, photo: photoPreview || p.photo } : p));
        toast({ title: "Player Updated" });
      } else {
        const { data } = await api.post("/api/players", fd, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        const created = data.player || data.created || {};
        const newItem = { _id: created._id || Math.random().toString(36).slice(2), name: created.name || form.name, email: created.email || form.email, phone: created.phone || form.phone, photo: created.photo || photoPreview, sport: created.sport || form.sport };
        setRows(prev => [newItem, ...prev]);
        toast({ title: "Player Created" });
      }
      setShowForm(false);
      setEditing(null);
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.response?.data?.message || "Please try again", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this player?")) return;
    try {
      await adminApi.players.remove(id);
      setRows((prev) => prev.filter((p) => p._id !== id));
      toast({ title: "Player Deleted", description: "The player has been removed successfully." });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.response?.data?.message || "Please try again", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Players
          </h1>
          <p className="text-muted-foreground mt-2">Manage your team players</p>
        </div>
        <Button className="bg-gradient-primary shadow-primary hover:shadow-hover" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add Player
        </Button>
      </div>

      {showForm && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>{editing ? 'Edit Player' : 'Add Player'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Photo</Label>
                <Input type="file" accept="image/*" onChange={onPhotoChange} />
                {photoPreview && (
                  <img src={photoPreview} alt="Preview" className="mt-2 w-24 h-24 rounded object-cover" />
                )}
              </div>
              <div>
                <Label>Sport</Label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })}>
                  <option value="football">Football</option>
                  <option value="handball">Handball</option>
                  <option value="swimming">Swimming</option>
                  <option value="volleyball">Volleyball</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary">{saving ? 'Saving...' : 'Save'}</Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">Filter by Sport:</span>
              <Button
                variant={disciplineFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setDisciplineFilter("all")}
                className={disciplineFilter === "all" ? "bg-gradient-primary" : ""}
              >
                All Sports
              </Button>
              {availableSports.map((sport) => (
                <Button
                  key={sport}
                  variant={disciplineFilter === sport ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDisciplineFilter(sport)}
                  className={disciplineFilter === sport ? "bg-gradient-primary" : ""}
                >
                  {sport.charAt(0).toUpperCase() + sport.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Sport</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && filtered.map((player) => (
                <TableRow key={player._id}>
                  <TableCell className="font-medium">{player.name || "-"}</TableCell>
                  <TableCell>{player.email || "-"}</TableCell>
                  <TableCell>{player.phone || "-"}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary capitalize">
                      {player.sport || "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setViewPlayer(player)} title="View Details">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(player)} title="Edit">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(player._id)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {loading && (
                <TableRow>
                  <TableCell colSpan={5}>Loading...</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Player Details Dialog */}
      <Dialog open={!!viewPlayer} onOpenChange={() => setViewPlayer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Player Details</DialogTitle>
          </DialogHeader>
          {viewPlayer && (
            <div className="space-y-6">
              <div className="flex flex-col items-center">
                <Avatar className="w-24 h-24 mb-4">
                  <AvatarImage 
                    src={viewPlayer.photo ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${viewPlayer.photo}` : ""} 
                  />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl">
                    {viewPlayer.name?.split(" ").map((n: string) => n[0]).join("") || "P"}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-semibold">{viewPlayer.name || "N/A"}</h3>
                <span className="px-3 py-1 rounded-full text-sm bg-primary/10 text-primary capitalize mt-2">
                  {viewPlayer.sport || "N/A"}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                    <p className="text-sm">{viewPlayer.name || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-sm">{viewPlayer.email || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p className="text-sm">{viewPlayer.phone || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Players;
