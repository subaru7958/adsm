import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, UserCheck, Check, Eye, Search } from "lucide-react";
import { adminApi, api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSeason } from "@/contexts/SeasonContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const { activeSeasonId } = useSeason();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [allPlayers, setAllPlayers] = useState<Array<{ _id: string; name?: string; email?: string; sport?: string; photo?: string }>>([]);
  const [allCoaches, setAllCoaches] = useState<Array<{ _id: string; name?: string; email?: string; specialty?: string; photo?: string }>>([]);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [viewGroup, setViewGroup] = useState<GroupItem | null>(null);
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [showCoachSelector, setShowCoachSelector] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [coachSearchQuery, setCoachSearchQuery] = useState("");
  

  useEffect(() => {
    if (!activeSeasonId) return; // Don't fetch if no season selected
    
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/api/groups?season=${activeSeasonId}`);
        setGroups(data.groups || []);
      } catch (err: any) {
        toast({ title: "Failed to load groups", description: err?.response?.data?.message || "Please try again", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [activeSeasonId, toast]);

  const filteredGroups = useMemo(() => {
    let result = groups;
    
    // Filter by sport
    if (sportFilter !== "all") {
      result = result.filter(g => (g.sport || "football") === sportFilter);
    }
    
    // Filter by search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(g => {
        const groupName = (g.name || "").toLowerCase();
        const playersArr = (g.players || []) as any[];
        const coachesArr = (g.coaches || []) as any[];
        
        // Search in group name
        if (groupName.includes(q)) return true;
        
        // Search in player names
        if (playersArr.some(p => {
          const name = typeof p === 'object' ? (p.name || "") : "";
          return name.toLowerCase().includes(q);
        })) return true;
        
        // Search in coach names
        if (coachesArr.some(c => {
          const name = typeof c === 'object' ? (c.name || "") : "";
          return name.toLowerCase().includes(q);
        })) return true;
        
        return false;
      });
    }
    
    return result;
  }, [groups, sportFilter, searchQuery]);

  // Get unique sports from current groups
  const availableSports = useMemo(() => {
    const sports = new Set(groups.map(g => g.sport || "football"));
    return Array.from(sports).sort();
  }, [groups]);

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);
  const createPlayerOptions: MultiSelectOption[] = useMemo(() => allPlayers.filter(p => (p.sport || 'football') === createSport).map(p => ({ value: p._id, label: p.name || p.email || 'Player' })), [allPlayers, createSport]);
  const createCoachOptions: MultiSelectOption[] = useMemo(() => allCoaches.filter(c => (c.specialty || 'football') === createSport).map(c => ({ value: c._id, label: c.name || c.email || 'Coach' })), [allCoaches, createSport]);
  
  // Filtered players and coaches for selector dialogs
  const filteredPlayersForSelector = useMemo(() => {
    const q = playerSearchQuery.trim().toLowerCase();
    const sportFiltered = allPlayers.filter(p => (p.sport || 'football') === createSport);
    if (!q) return sportFiltered;
    return sportFiltered.filter(p => 
      (p.name || '').toLowerCase().includes(q) || 
      (p.email || '').toLowerCase().includes(q)
    );
  }, [allPlayers, createSport, playerSearchQuery]);
  
  const filteredCoachesForSelector = useMemo(() => {
    const q = coachSearchQuery.trim().toLowerCase();
    const sportFiltered = allCoaches.filter(c => (c.specialty || 'football') === createSport);
    if (!q) return sportFiltered;
    return sportFiltered.filter(c => 
      (c.name || '').toLowerCase().includes(q) || 
      (c.email || '').toLowerCase().includes(q)
    );
  }, [allCoaches, createSport, coachSearchQuery]);
  const editPlayerOptions: MultiSelectOption[] = useMemo(() => allPlayers.filter(p => (p.sport || 'football') === editSport).map(p => ({ value: p._id, label: p.name || p.email || 'Player' })), [allPlayers, editSport]);
  const editCoachOptions: MultiSelectOption[] = useMemo(() => allCoaches.filter(c => (c.specialty || 'football') === editSport).map(c => ({ value: c._id, label: c.name || c.email || 'Coach' })), [allCoaches, editSport]);

  const openEditor = async (id: string) => {
    if (!activeSeasonId) return;
    
    setEditingId(id);
    setLoadingEditor(true);
    try {
      const [detailRes, playersRes, coachesRes] = await Promise.all([
        adminApi.groups.detail(id),
        api.get(`/api/players?season=${activeSeasonId}`),
        api.get(`/api/coaches?season=${activeSeasonId}`),
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
    if (!activeSeasonId) return;
    
    if (!allPlayers.length || !allCoaches.length) {
      try {
        const [playersRes, coachesRes] = await Promise.all([
          api.get(`/api/players?season=${activeSeasonId}`),
          api.get(`/api/coaches?season=${activeSeasonId}`),
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
    if (!activeSeasonId) {
      toast({ title: "No season selected", description: "Please select a season first", variant: "destructive" });
      return;
    }
    setCreateSaving(true);
    try {
      const { data } = await api.post("/api/groups", {
        name: createName.trim(),
        sport: createSport,
        seasonId: activeSeasonId
      });
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

      {/* Search and Sport Filter */}
      <Card className="shadow-card">
        <CardContent className="pt-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search groups, players, or coaches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Sport Filter */}
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
            {availableSports.map((sport) => (
              <Button
                key={sport}
                variant={sportFilter === sport ? "default" : "outline"}
                size="sm"
                onClick={() => setSportFilter(sport)}
                className={sportFilter === sport ? "bg-gradient-primary capitalize" : "capitalize"}
              >
                {sport}
              </Button>
            ))}
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
                  <Label>Players</Label>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => setShowPlayerSelector(true)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {createSelectedPlayers.length > 0 
                      ? `${createSelectedPlayers.length} player${createSelectedPlayers.length > 1 ? 's' : ''} selected` 
                      : 'Select players'}
                  </Button>
                </div>
                <div>
                  <Label>Coaches</Label>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => setShowCoachSelector(true)}
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    {createSelectedCoaches.length > 0 
                      ? `${createSelectedCoaches.length} coach${createSelectedCoaches.length > 1 ? 'es' : ''} selected` 
                      : 'Select coaches'}
                  </Button>
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
                <Button variant="outline" size="sm" onClick={() => setViewGroup(group)} title="View Details">
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </Button>
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

      {/* View Group Details Dialog */}
      <Dialog open={!!viewGroup} onOpenChange={() => setViewGroup(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Group Details</DialogTitle>
          </DialogHeader>
          {viewGroup && (() => {
            const playersArr = (viewGroup.players || []) as any[];
            const coachesArr = (viewGroup.coaches || []) as any[];
            
            return (
              <div className="space-y-6">
                {/* Group Name and Sport */}
                <div className="text-center pb-4 border-b">
                  <h3 className="text-2xl font-bold mb-2">{viewGroup.name}</h3>
                  <Badge className="capitalize">{viewGroup.sport || "football"}</Badge>
                </div>

                {/* Players Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <h4 className="text-lg font-semibold">Players ({playersArr.length})</h4>
                  </div>
                  {playersArr.length > 0 ? (
                    <div className="grid gap-3">
                      {playersArr.map((player: any, idx: number) => {
                        const playerObj = typeof player === 'object' ? player : { name: player };
                        return (
                          <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={playerObj.photo ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${playerObj.photo}` : ""} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {(playerObj.name || "P").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium">{playerObj.name || "Unknown Player"}</p>
                              {playerObj.email && (
                                <p className="text-sm text-muted-foreground">{playerObj.email}</p>
                              )}
                            </div>
                            {playerObj.sport && (
                              <Badge variant="outline" className="capitalize text-xs">
                                {playerObj.sport}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No players in this group</p>
                  )}
                </div>

                {/* Coaches Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-primary" />
                    <h4 className="text-lg font-semibold">Coaches ({coachesArr.length})</h4>
                  </div>
                  {coachesArr.length > 0 ? (
                    <div className="grid gap-3">
                      {coachesArr.map((coach: any, idx: number) => {
                        const coachObj = typeof coach === 'object' ? coach : { name: coach };
                        return (
                          <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={coachObj.photo ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${coachObj.photo}` : ""} />
                              <AvatarFallback className="bg-secondary/10 text-secondary">
                                {(coachObj.name || "C").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium">{coachObj.name || "Unknown Coach"}</p>
                              {coachObj.email && (
                                <p className="text-sm text-muted-foreground">{coachObj.email}</p>
                              )}
                            </div>
                            {coachObj.specialty && (
                              <Badge variant="outline" className="capitalize text-xs">
                                {coachObj.specialty}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No coaches assigned to this group</p>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Player Selector Dialog */}
      <Dialog open={showPlayerSelector} onOpenChange={setShowPlayerSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Players</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search players by name..."
                value={playerSearchQuery}
                onChange={(e) => setPlayerSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Selected Count */}
            <div className="text-sm text-muted-foreground">
              {createSelectedPlayers.length} player{createSelectedPlayers.length !== 1 ? 's' : ''} selected
            </div>

            {/* Players List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {filteredPlayersForSelector.length > 0 ? (
                filteredPlayersForSelector.map((player) => {
                  const isSelected = createSelectedPlayers.includes(player._id);
                  return (
                    <div
                      key={player._id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        if (isSelected) {
                          setCreateSelectedPlayers(prev => prev.filter(id => id !== player._id));
                        } else {
                          setCreateSelectedPlayers(prev => [...prev, player._id]);
                        }
                      }}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={player.photo ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${player.photo}` : ""} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {(player.name || "P").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{player.name || "Unknown Player"}</p>
                        <p className="text-sm text-muted-foreground">{player.email}</p>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {playerSearchQuery ? 'No players found matching your search' : 'No players available for this sport'}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setPlayerSearchQuery("");
                  setShowPlayerSelector(false);
                }}
                className="flex-1"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Coach Selector Dialog */}
      <Dialog open={showCoachSelector} onOpenChange={setShowCoachSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Coaches</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search coaches by name..."
                value={coachSearchQuery}
                onChange={(e) => setCoachSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Selected Count */}
            <div className="text-sm text-muted-foreground">
              {createSelectedCoaches.length} coach{createSelectedCoaches.length !== 1 ? 'es' : ''} selected
            </div>

            {/* Coaches List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {filteredCoachesForSelector.length > 0 ? (
                filteredCoachesForSelector.map((coach) => {
                  const isSelected = createSelectedCoaches.includes(coach._id);
                  return (
                    <div
                      key={coach._id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        if (isSelected) {
                          setCreateSelectedCoaches(prev => prev.filter(id => id !== coach._id));
                        } else {
                          setCreateSelectedCoaches(prev => [...prev, coach._id]);
                        }
                      }}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={coach.photo ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${coach.photo}` : ""} />
                        <AvatarFallback className="bg-secondary/10 text-secondary">
                          {(coach.name || "C").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{coach.name || "Unknown Coach"}</p>
                        <p className="text-sm text-muted-foreground">{coach.email}</p>
                        {coach.specialty && (
                          <Badge variant="outline" className="capitalize text-xs mt-1">
                            {coach.specialty}
                          </Badge>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {coachSearchQuery ? 'No coaches found matching your search' : 'No coaches available for this sport'}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setCoachSearchQuery("");
                  setShowCoachSelector(false);
                }}
                className="flex-1"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Groups;
