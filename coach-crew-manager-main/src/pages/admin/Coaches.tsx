import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminApi } from "@/lib/api";
import { Label } from "@/components/ui/label";

const Coaches = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");
  const [rows, setRows] = useState<Array<{ _id: string; name?: string; email?: string; phone?: string; photo?: string; specialty?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<{ _id: string; name?: string; email?: string; phone?: string; photo?: string; specialty?: string } | null>(null);
  const [form, setForm] = useState<{ name: string; email: string; phone: string; specialty: string }>({ name: "", email: "", phone: "", specialty: "football" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await adminApi.coaches.list();
        setRows(data.coaches || []);
      } catch (err: any) {
        toast({ title: "Failed to load coaches", description: err?.response?.data?.message || "Please try again", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const filtered = useMemo(() => {
    let result = rows;
    
    // Filter by discipline
    if (disciplineFilter !== "all") {
      result = result.filter((c) => (c.specialty || "football") === disciplineFilter);
    }
    
    // Filter by search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((c) => [c.name, c.email, c.phone].some((v) => (v || "").toLowerCase().includes(q)));
    }
    
    return result;
  }, [rows, searchQuery, disciplineFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", email: "", phone: "", specialty: "football" });
    setPhoto(null);
    setPhotoPreview("");
    setShowForm(true);
  };

  const openEdit = (c: { _id: string; name?: string; email?: string; phone?: string; photo?: string; specialty?: string }) => {
    setEditing(c);
    setForm({ name: c.name || "", email: c.email || "", phone: c.phone || "", specialty: c.specialty || "football" });
    setPhoto(null);
    setPhotoPreview(c.photo || "");
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
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("email", form.email);
      if (form.phone) fd.append("phone", form.phone);
      if (photo) fd.append("photo", photo);
      if (form.specialty) fd.append("specialty", form.specialty);
      if (editing) {
        await adminApi.coaches.update(editing._id, fd);
        setRows(prev => prev.map(c => c._id === editing._id ? { ...c, ...form, photo: photoPreview || c.photo } : c));
        toast({ title: "Coach Updated" });
      } else {
        const { data } = await adminApi.coaches.create(fd);
        const created = data.coach || data.created || {};
        const newItem = { _id: created._id || Math.random().toString(36).slice(2), name: created.name || form.name, email: created.email || form.email, phone: created.phone || form.phone, photo: created.photo || photoPreview, specialty: created.specialty || form.specialty };
        setRows(prev => [newItem, ...prev]);
        toast({ title: "Coach Created" });
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
    if (!confirm("Delete this coach?")) return;
    try {
      await adminApi.coaches.remove(id);
      setRows((prev) => prev.filter((c) => c._id !== id));
      toast({ title: "Coach Deleted", description: "The coach has been removed successfully." });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.response?.data?.message || "Please try again", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Coaches
          </h1>
          <p className="text-muted-foreground mt-2">Manage your coaching staff</p>
        </div>
        <Button className="bg-gradient-primary shadow-primary hover:shadow-hover" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add Coach
        </Button>
      </div>

      {showForm && (
        <Card className="shadow-card">
          <CardHeader>
            <div className="text-xl font-semibold">{editing ? 'Edit Coach' : 'Add Coach'}</div>
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
                <Label>Specialty</Label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })}>
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
                placeholder="Search coaches..."
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
              <Button
                variant={disciplineFilter === "football" ? "default" : "outline"}
                size="sm"
                onClick={() => setDisciplineFilter("football")}
                className={disciplineFilter === "football" ? "bg-gradient-primary" : ""}
              >
                Football
              </Button>
              <Button
                variant={disciplineFilter === "handball" ? "default" : "outline"}
                size="sm"
                onClick={() => setDisciplineFilter("handball")}
                className={disciplineFilter === "handball" ? "bg-gradient-primary" : ""}
              >
                Handball
              </Button>
              <Button
                variant={disciplineFilter === "swimming" ? "default" : "outline"}
                size="sm"
                onClick={() => setDisciplineFilter("swimming")}
                className={disciplineFilter === "swimming" ? "bg-gradient-primary" : ""}
              >
                Swimming
              </Button>
              <Button
                variant={disciplineFilter === "volleyball" ? "default" : "outline"}
                size="sm"
                onClick={() => setDisciplineFilter("volleyball")}
                className={disciplineFilter === "volleyball" ? "bg-gradient-primary" : ""}
              >
                Volleyball
              </Button>
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
                <TableHead>Specialty</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && filtered.map((coach) => (
                <TableRow key={coach._id}>
                  <TableCell className="font-medium">{coach.name || "-"}</TableCell>
                  <TableCell>{coach.email || "-"}</TableCell>
                  <TableCell>{coach.phone || "-"}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs bg-secondary/10 text-secondary capitalize">
                      {coach.specialty || "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(coach)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(coach._id)}
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
    </div>
  );
};

export default Coaches;
