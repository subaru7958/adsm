import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, UserCheck, Check } from "lucide-react";
import { adminApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

type GroupItem = {
  _id: string;
  name: string;
  sport?: string;
  players?: Array<{ _id: string; name?: string }> | string[];
  coaches?: Array<{ _id: string; name?: string }> | string[];
};

function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

type MultiSelectOption = { value: string; label: string };

function MultiSelect({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query, 250).toLowerCase();
  const filtered = useMemo(
    () => (q ? options.filter(o => o.label.toLowerCase().includes(q)) : options),
    [options, q]
  );
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };
  const display = useMemo(() => {
    if (!selected.length) return `Select ${title.toLowerCase()}`;
    if (selected.length === 1) return options.find(o => o.value === selected[0])?.label || `1 ${title}`;
    return `${selected.length} selected`;
  }, [selected, options, title]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between w-full">
          <span className="truncate text-left">{display}</span>
          <span className="text-xs text-muted-foreground ml-2">{title}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <Command>
          <div className="p-2">
            <CommandInput value={query} onValueChange={setQuery} placeholder={`Filter ${title.toLowerCase()}...`} />
          </div>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {filtered.map(opt => (
              <CommandItem key={opt.value} onSelect={() => toggle(opt.value)}>
                <Check className={`mr-2 h-4 w-4 ${selected.includes(opt.value) ? '' : 'opacity-0'}`} />
                {opt.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const Groups = () => {
  const { toast } = useToast();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [allPlayers, setAllPlayers] = useState<Array<{ _id: string; name?: string; email?: string; sport?: string }>>([]);
  const [allCoaches, setAllCoaches] = useState<Array<{ _id: string; name?: string; email?: string; specialty?: string }>>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedCoaches, setSelectedCoaches] = useState<string[]>([]);
  const [loadingEditor, setLoadingEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSport, setCreateSport] = useState<string>("football");
  const [createSelectedPlayers, setCreateSelectedPlayers] = useState<string[]>([]);
  const [createSelectedCoaches, setCreateSelectedCoaches] = useState<string[]>([]);
  const [createSaving, setCreateSaving] = useState(false);
  const [editSport, setEditSport] = useState<string>("football");
  

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await adminApi.groups.list();
        setGroups(data.groups || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredGroups = useMemo(() => {
    if (sportFilter === "all") return groups;
    return groups.filter(g => (g.sport || "football") === sportFilter);
  }, [groups, sportFilter]);

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);
  const createPlayerOptions: MultiSelectOption[] = useMemo(() => allPlayers.filter(p => (p.sport || 'football') === createSport).map(p => ({ value: p._id, label: p.name || p.email || 'Player' })), [allPlayers, createSport]);
  const createCoachOptions: MultiSelectOption[] = useMemo(() => allCoaches.filter(c => (c.specialty || 'football') === createSport).map(c => ({ value: c._id, label: c.name || c.email || 'Coach' })), [allCoaches, createSport]);
  const editPlayerOptions: MultiSelectOption[] = useMemo(() => allPlayers.filter(p => (p.sport || 'football') === editSport).map(p => ({ value: p._id, label: p.name || p.email || 'Player' })), [allPlayers, editSport]);
  const editCoachOptions: MultiSelectOption[] = useMemo(() => allCoaches.filter(c => (c.specialty || 'football') === editSport).map(c => ({ value: c._id, label: c.name || c.email || 'Coach' })), [allCoaches, editSport]);

  const openEditor = async (id: string) => {
    setEditingId(id);
    setLoadingEditor(true);
    try {
      const [detailRes, playersRes, coachesRes] = await Promise.all([
        adminApi.groups.detail(id),
        adminApi.players.list(),
        adminApi.coaches.list(),
      ]);
      const g = detailRes.data.group || detailRes.data;
      setFormName(g.name || "");
      setEditSport(g.sport || "football");
      setAllPlayers(playersRes.data.players || []);
      setAllCoaches(coachesRes.data.coaches || []);
      const playerIds: string[] = (g.players || []).map((p: any) => (typeof p === "string" ? p : p._id));
      const coachIds: string[] = (g.coaches || []).map((c: any) => (typeof c === "string" ? c : c._id));
      setSelectedPlayers(playerIds);
      setSelectedCoaches(coachIds);
    } catch (err: any) {
      toast({ title: "Failed to open group", description: err?.response?.data?.message || "Please try again", variant: "destructive" });
      setEditingId(null);
    } finally {
      setLoadingEditor(false);
    }
  };

  const toggleIn = (arr: string[], id: string) => arr.includes(id) ? arr.filter(i => i !== id) : [...arr, id];

  const saveEditor = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await adminApi.groups.update(editingId, { name: formName, sport: editSport, players: selectedPlayers, coaches: selectedCoaches });
      setGroups(prev => prev.map(g => g._id === editingId ? { ...g, name: formName, sport: editSport, players: selectedPlayers as any, coaches: selectedCoaches as any } : g));
      toast({ title: "Group updated" });
      setEditingId(null);
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.response?.data?.message || "Please try again", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openCreate = async () => {
    setShowCreate(true);
    setCreateName("");
    setCreateSport("football");
    setCreateSelectedPlayers([]);
    setCreateSelectedCoaches([]);
    if (!allPlayers.length || !allCoaches.length) {
      try {
        const [playersRes, coachesRes] = await Promise.all([
          adminApi.players.list(),
          adminApi.coaches.list(),
        ]);
        setAllPlayers(playersRes.data.players || []);
        setAllCoaches(coachesRes.data.coaches || []);
      } catch (e) {
        // ignore, handled when selecting
      }
    }
  };

  const saveCreate = async () => {
    if (!createName.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    setCreateSaving(true);
    try {
      const { data } = await adminApi.groups.create({ name: createName.trim(), sport: createSport });
      const created = data.group || data.created || { name: createName.trim(), _id: data._id };
      const id = created._id as string;
      if (id && (createSelectedPlayers.length || createSelectedCoaches.length)) {
        await adminApi.groups.update(id, { players: createSelectedPlayers, coaches: createSelectedCoaches });
      }
      setGroups(prev => [{ _id: id, name: createName.trim(), sport: createSport, players: createSelectedPlayers as any, coaches: createSelectedCoaches as any }, ...prev]);
      toast({ title: 'Group created' });
      setShowCreate(false);
    } catch (err: any) {
      toast({ title: 'Create failed', description: err?.response?.data?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setCreateSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Groups
          </h1>
          <p className="text-muted-foreground mt-2">Organize players and coaches into groups</p>
        </div>
        <Button className="bg-gradient-primary shadow-primary hover:shadow-hover" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Sport Filter */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground mr-2">Filter by Sport:</span>
            <Button
              variant={sportFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSportFilter("all")}
              className={sportFilter === "all" ? "bg-gradient-primary" : ""}
            >
              All Sports
            </Button>
            <Button
              variant={sportFilter === "football" ? "default" : "outline"}
              size="sm"
              onClick={() => setSportFilter("football")}
              className={sportFilter === "football" ? "bg-gradient-primary" : ""}
            >
              Football
            </Button>
            <Button
              variant={sportFilter === "handball" ? "default" : "outline"}
              size="sm"
              onClick={() => setSportFilter("handball")}
              className={sportFilter === "handball" ? "bg-gradient-primary" : ""}
            >
              Handball
            </Button>
            <Button
              variant={sportFilter === "swimming" ? "default" : "outline"}
              size="sm"
              onClick={() => setSportFilter("swimming")}
              className={sportFilter === "swimming" ? "bg-gradient-primary" : ""}
            >
              Swimming
            </Button>
            <Button
              variant={sportFilter === "volleyball" ? "default" : "outline"}
              size="sm"
              onClick={() => setSportFilter("volleyball")}
              className={sportFilter === "volleyball" ? "bg-gradient-primary" : ""}
            >
              Volleyball
            </Button>
          </div>
        </CardContent>
      </Card>

      {showCreate && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Create Group</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <Label>Name</Label>
                <Input value={createName} onChange={(e) => setCreateName(e.target.value)} />
              </div>
              <div>
                <Label>Sport</Label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={createSport} onChange={(e) => { setCreateSport(e.target.value); setCreateSelectedPlayers([]); setCreateSelectedCoaches([]); }}>
                  <option value="football">Football</option>
                  <option value="handball">Handball</option>
                  <option value="swimming">Swimming</option>
                  <option value="volleyball">Volleyball</option>
                </select>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <MultiSelect title="Players" options={createPlayerOptions} selected={createSelectedPlayers} onChange={setCreateSelectedPlayers} />
                </div>
                <div>
                  <MultiSelect title="Coaches" options={createCoachOptions} selected={createSelectedCoaches} onChange={setCreateSelectedCoaches} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveCreate} disabled={createSaving} className="bg-gradient-primary">{createSaving ? 'Creating...' : 'Create'}</Button>
                <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isEditing && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Edit Group</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEditor ? (
              <div>Loading...</div>
            ) : (
              <div className="space-y-6">
                <div>
                  <Label>Name</Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
                </div>
                <div>
                  <Label>Sport</Label>
                  <select className="w-full border rounded px-3 py-2 text-sm" value={editSport} onChange={(e) => { setEditSport(e.target.value); setSelectedPlayers([]); setSelectedCoaches([]); }}>
                    <option value="football">Football</option>
                    <option value="handball">Handball</option>
                    <option value="swimming">Swimming</option>
                    <option value="volleyball">Volleyball</option>
                  </select>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <MultiSelect title="Players" options={editPlayerOptions} selected={selectedPlayers} onChange={setSelectedPlayers} />
                  <MultiSelect title="Coaches" options={editCoachOptions} selected={selectedCoaches} onChange={setSelectedCoaches} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveEditor} disabled={saving} className="bg-gradient-primary">{saving ? 'Saving...' : 'Save'}</Button>
                  <Button variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading && (
          <Card className="shadow-card"><CardContent>Loading...</CardContent></Card>
        )}
        {!loading && filteredGroups.length === 0 && (
          <Card className="shadow-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              No groups found for this sport
            </CardContent>
          </Card>
        )}
        {!loading && filteredGroups.map((group) => {
          const playersArr = (group.players || []) as any[];
          const coachesArr = (group.coaches || []) as any[];
          const playersCount = playersArr.length;
          const coachesCount = coachesArr.length;
          const playerNames = playersArr.slice(0, 3).map((p: any) => (typeof p === "string" ? p : p.name || "Player"));
          const coachNames = coachesArr.slice(0, 3).map((c: any) => (typeof c === "string" ? c : c.name || "Coach"));
          return (
          <Card key={group._id} className="shadow-card hover:shadow-hover transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{group.name}</span>
                <Badge variant="outline">{playersCount + coachesCount} members</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>Players ({playersCount})</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {playerNames.map((player, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">{player}</Badge>
                  ))}
                  {playersCount > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{playersCount - 3} more
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UserCheck className="w-4 h-4" />
                  <span>Coaches ({coachesCount})</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {coachNames.map((coach, idx) => (
                    <Badge key={idx} className="text-xs bg-secondary">{coach}</Badge>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditor(group._id)}>
                  Edit Group
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => {
                  if (!confirm('Delete this group?')) return;
                  try {
                    await adminApi.groups.remove(group._id);
                    setGroups(prev => prev.filter(g => g._id !== group._id));
                    toast({ title: 'Group deleted' });
                  } catch (err: any) {
                    toast({ title: 'Delete failed', description: err?.response?.data?.message || 'Please try again', variant: 'destructive' });
                  }
                }}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        );})}
      </div>
    </div>
  );
};

export default Groups;
