import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, MapPin, Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminApi } from "@/lib/api";
// Chart imports removed as we switch to a card grid UI for upcoming events

type UIEvent = {
  _id: string;
  title: string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm
  location?: string;
  description?: string;
  banner?: string;
};

const Events = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<UIEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<UIEvent | null>(null);
  const [form, setForm] = useState({ title: "", date: "", time: "", location: "", description: "" });
  const [banner, setBanner] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const start = new Date();
        const end = new Date();
        end.setDate(end.getDate() + 30);
        const { data } = await adminApi.events.list({ start: start.toISOString(), end: end.toISOString() });
        const list: any[] = data.events || data.items || [];
        const normalized: UIEvent[] = list.map((it: any) => {
          const id = it._id || it.id;
          const d = it.date || (it.start ? new Date(it.start).toISOString().slice(0, 10) : undefined);
          const t = it.time || (it.start ? new Date(it.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined);
          return {
            _id: id,
            title: it.title || it.name || "Event",
            date: d,
            time: t,
            location: it.location,
            description: it.description,
            banner: it.banner || it.photo || undefined,
          };
        });
        setRows(normalized);
      } catch (err: any) {
        toast({ title: "Failed to load events", description: err?.response?.data?.message || "Please try again", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return rows;
    return rows.filter(e => [e.title, e.location, e.description].some(v => (v || "").toLowerCase().includes(q)));
  }, [rows, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", date: "", time: "", location: "", description: "" });
    setBanner(null);
    setBannerPreview("");
    setShowForm(true);
  };
  const openEdit = (e: UIEvent) => {
    setEditing(e);
    setForm({ title: e.title || "", date: e.date || "", time: e.time || "", location: e.location || "", description: e.description || "" });
    setBanner(null);
    setBannerPreview(e.banner || "");
    setShowForm(true);
  };
  const onBannerChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0] || null;
    setBanner(f);
    if (f) {
      const reader = new FileReader();
      reader.onloadend = () => setBannerPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setBannerPreview("");
    }
  };
  const handleSave = async () => {
    if (!form.title) { toast({ title: "Title required", variant: "destructive" }); return; }
    if (!form.date) { toast({ title: "Date required", variant: "destructive" }); return; }
    if (!form.time) { toast({ title: "Time required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const hasFile = Boolean(banner);
      const payload: any = hasFile ? new FormData() : {
        title: form.title,
        date: form.date,
        time: form.time,
        location: form.location || undefined,
        description: form.description || undefined,
      };
      if (hasFile) {
        payload.append("title", form.title);
        payload.append("date", form.date);
        payload.append("time", form.time);
        if (form.location) payload.append("location", form.location);
        if (form.description) payload.append("description", form.description);
        if (banner) payload.append("banner", banner);
      }
      if (editing) {
        await adminApi.events.update(editing._id, payload);
        setRows(prev => prev.map(e => e._id === editing._id ? { ...e, ...form, banner: bannerPreview || e.banner } : e));
        toast({ title: "Event Updated" });
      } else {
        const { data } = await adminApi.events.create(payload);
        const created = data.event || data.created || payload;
        const newItem: UIEvent = {
          _id: created._id || Math.random().toString(36).slice(2),
          title: created.title || form.title,
          date: created.date || form.date,
          time: created.time || form.time,
          location: created.location || form.location,
          description: created.description || form.description,
          banner: created.banner || (hasFile ? bannerPreview : undefined),
        };
        setRows(prev => [newItem, ...prev]);
        toast({ title: "Event Created" });
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
    if (!confirm("Delete this event?")) return;
    try {
      await adminApi.events.remove(id);
      setRows(prev => prev.filter(e => e._id !== id));
      toast({ title: "Event Deleted" });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.response?.data?.message || "Please try again", variant: "destructive" });
    }
  };

  // Build upcoming chart data (next 14 days)
  // Removed Upcoming Events UI and related data

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">Events</h1>
          <p className="text-muted-foreground mt-2">Create events and view upcoming schedule</p>
        </div>
        <Button className="bg-gradient-primary shadow-primary hover:shadow-hover" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>

      {showForm && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>{editing ? "Edit Event" : "Create Event"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
              </div>
              <div className="md:col-span-2">
                <Label>Banner Image</Label>
                <Input type="file" accept="image/*" onChange={onBannerChange} />
                {bannerPreview && (
                  <img src={bannerPreview} alt="Banner" className="mt-2 w-full max-w-md h-32 object-cover rounded" />
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary">{saving ? 'Saving...' : 'Save'}</Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Search</CardTitle>
          </CardHeader>
          <CardContent>
            <Input placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>All Events</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && paged.map((ev) => (
                <TableRow key={ev._id}>
                  <TableCell className="font-medium">{ev.title}</TableCell>
                  <TableCell><div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" />{ev.date || '-'}</div></TableCell>
                  <TableCell>{ev.time || '-'}</TableCell>
                  <TableCell><div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" />{ev.location || '-'}</div></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(ev)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(ev._id)}>
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
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</div>
            <div className="flex items-center gap-2">
              <select className="border rounded px-2 py-1 text-sm" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}>
                {[5,10,20,50].map(s => <option key={s} value={s}>{s}/page</option>)}
              </select>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={currentPage<=1}>Prev</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={currentPage>=totalPages}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Events;
