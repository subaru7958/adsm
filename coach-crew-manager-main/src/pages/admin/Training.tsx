import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Plus, Edit, Trash2, Clock, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

type UISession = {
  _id: string;
  name: string;
  type?: string;
  eventType?: "training" | "game" | "meet" | "competition";
  group?: string;
  day?: string;
  date?: string;
  time?: string;
  location?: string;
  start?: string;
  end?: string;
  days?: string[];
  coach?: string;
  sport?: string;
  // Game-specific fields
  opponent?: string;
  locationType?: "home" | "away" | "neutral";
  teamScore?: string;
  opponentScore?: string;
  isCompleted?: boolean;
  gameNotes?: string;
};

const DAY_LABELS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"] as const;
const DAY_CODES = ["MON","TUE","WED","THU","FRI","SAT","SUN"] as const;
const codeToLabel: Record<string,string> = Object.fromEntries(DAY_CODES.map((c,i)=>[c, DAY_LABELS[i]]));
const labelToCode: Record<string,string> = Object.fromEntries(DAY_LABELS.map((l,i)=>[l, DAY_CODES[i]]));

type SingleSelectOption = { value: string; label: string };

function SingleSelect({
  value,
  onChange,
  options,
  placeholder,
  title,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SingleSelectOption[];
  placeholder?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return q ? options.filter(o => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);
  const current = options.find(o=>o.value===value)?.label;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between w-full">
          <span className="truncate text-left">{current || placeholder || 'Select'}</span>
          {title && <span className="text-xs text-muted-foreground ml-2">{title}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <Command>
          <div className="p-2">
            <CommandInput value={query} onValueChange={setQuery} placeholder={`Search ${title?.toLowerCase() || 'items'}...`} />
          </div>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {filtered.map(opt => (
              <CommandItem key={opt.value} onSelect={() => { onChange(opt.value); setOpen(false); }}>
                {opt.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const Training = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<UISession[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<UISession | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "special",
    eventType: "training" as "training" | "game" | "meet" | "competition",
    date: "",
    time: "",
    location: "",
    group: "",
    weekly: false,
    days: [] as string[],
    // Game-specific fields
    opponent: "",
    locationType: "home" as "home" | "away" | "neutral",
  });
  const [groups, setGroups] = useState<Array<{ _id: string; name: string; sport?: string }>>([]);
  const groupOptions = useMemo<SingleSelectOption[]>(() => groups.map(g => ({ value: g._id, label: g.name })), [groups]);
  const [coaches, setCoaches] = useState<Array<{ _id: string; name: string }>>([]);
  const coachOptions = useMemo<SingleSelectOption[]>(() => coaches.map(c => ({ value: c._id, label: c.name })), [coaches]);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assignCoachId, setAssignCoachId] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [sessRes, groupsRes, coachesRes] = await Promise.all([
          adminApi.sessions.list(undefined as any),
          adminApi.groups.list(),
          adminApi.coaches.list(),
        ]);
        const data = sessRes.data;
        const list = (data.sessions || data.events || []) as any[];
        const groupsArr = groupsRes.data.groups || [];
        const groupsMap = Object.fromEntries(groupsArr.map((g: any) => [g._id, g.name]));
        const groupSportMap = Object.fromEntries(groupsArr.map((g: any) => [g._id, g.sport]));
        const coachesArr = coachesRes.data.coaches || coachesRes.data.items || [];
        const coachesMap = Object.fromEntries(coachesArr.map((c: any) => [c._id || c.id, c.name]));
        const normalized: UISession[] = list.map((it: any) => {
          const id = it._id || it.id;
          const type = (it.sessionType || it.type || '').toLowerCase();
          const dateStr = it.specialStartTime ? new Date(it.specialStartTime).toISOString().slice(0,10) : undefined;
          const timeStr = it.sessionType === 'weekly' ? (it.weeklyStartTime || '') : (it.specialStartTime ? new Date(it.specialStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
          const groupName = typeof it.group === 'string' ? (groupsMap[it.group] || it.group) : (it.group?.name || undefined);
          const groupSport = typeof it.group === 'string' ? (groupSportMap[it.group]) : (it.group?.sport);
          const coachName = typeof it.coach === 'string' ? (coachesMap[it.coach] || it.coach) : (it.coach?.name || undefined);
          return {
            _id: id,
            name: it.title || it.name || 'Session',
            type: type || (it.dayOfWeek !== undefined ? 'weekly' : 'special'),
            eventType: it.eventType || 'training',
            group: groupName,
            sport: groupSport,
            date: type === 'special' ? (dateStr || undefined) : undefined,
            time: timeStr,
            location: it.location,
            start: it.specialStartTime,
            end: it.specialEndTime,
            days: it.dayOfWeek !== undefined ? [String(it.dayOfWeek)] : undefined,
            coach: coachName,
            // Game-specific fields
            opponent: it.opponent,
            locationType: it.locationType,
            teamScore: it.teamScore,
            opponentScore: it.opponentScore,
            isCompleted: it.isCompleted,
            gameNotes: it.gameNotes,
          } as any;
        });
        setRows(normalized);
        setGroups(groupsArr);
        setCoaches(coachesArr);
      } catch (err: any) {
        toast({ title: 'Failed to load sessions', description: err?.response?.data?.message || 'Please try again', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const [searchQuery, setSearchQuery] = useState("");
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "completed">("all");

  // Check if session is completed
  const isSessionCompleted = (session: UISession) => {
    if (session.type === 'special' && session.end) {
      return new Date(session.end) < new Date();
    }
    return false; // Weekly sessions are never "completed" as they repeat
  };

  const all = rows;
  const weekly = useMemo(() => all.filter(s => (s.type || '').toLowerCase() === 'weekly'), [all]);
  const special = useMemo(() => all.filter(s => (s.type || '').toLowerCase() !== 'weekly'), [all]);

  // Get unique sports from sessions
  const availableSports = useMemo(() => {
    const sports = new Set<string>();
    rows.forEach(s => {
      if (s.sport) sports.add(s.sport);
    });
    return Array.from(sports).sort();
  }, [rows]);

  const filterBySearchAndSport = (sessions: UISession[]) => {
    let filtered = sessions;
    
    // Filter by sport
    if (sportFilter !== "all") {
      filtered = filtered.filter(s => s.sport === sportFilter);
    }

    // Filter by status (completed/upcoming)
    if (statusFilter === "completed") {
      filtered = filtered.filter(s => isSessionCompleted(s));
    } else if (statusFilter === "upcoming") {
      filtered = filtered.filter(s => !isSessionCompleted(s));
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        (s.name || '').toLowerCase().includes(query) ||
        (s.group || '').toLowerCase().includes(query) ||
        (s.location || '').toLowerCase().includes(query) ||
        (s.coach || '').toLowerCase().includes(query) ||
        (s.sport || '').toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const filteredAll = useMemo(() => filterBySearchAndSport(all), [all, searchQuery, sportFilter, statusFilter]);
  const filteredWeekly = useMemo(() => filterBySearchAndSport(weekly), [weekly, searchQuery, sportFilter, statusFilter]);
  const filteredSpecial = useMemo(() => filterBySearchAndSport(special), [special, searchQuery, sportFilter, statusFilter]);

  const handleDelete = async (id: string) => {
    try {
      await adminApi.sessions.remove(id);
      setRows(prev => prev.filter(s => s._id !== id));
      toast({ title: 'Session Deleted', description: 'The session has been removed.' });
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err?.response?.data?.message || 'Please try again', variant: 'destructive' });
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ 
      name: "", 
      type: "special", 
      eventType: "training",
      date: "", 
      time: "", 
      location: "", 
      group: "", 
      weekly: false, 
      days: [],
      opponent: "",
      locationType: "home",
    });
    setShowForm(true);
  };

  const openEdit = (s: UISession) => {
    setEditing(s);
    setForm({
      name: s.name || "",
      type: s.type || "special",
      eventType: s.eventType || "training",
      date: s.date || (s.start ? s.start.slice(0,10) : ""),
      time: s.time || "",
      location: s.location || "",
      group: (() => {
        const match = groups.find(g => g.name === s.group);
        return match?._id || "";
      })(),
      weekly: (s.type || '').toLowerCase() === 'weekly',
      days: (s.days || []).map(d => codeToLabel[d] ? d : (labelToCode[d as keyof typeof labelToCode] || d)),
      opponent: s.opponent || "",
      locationType: s.locationType || "home",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const isWeekly = form.weekly || (form.type.toLowerCase() === 'weekly');
      // validations
      if (!form.time) throw { response: { data: { message: 'Time is required' } } };
      if (isWeekly && (!form.days || form.days.length === 0)) throw { response: { data: { message: 'Select at least one day for weekly sessions' } } };
      if (!isWeekly && !form.date) throw { response: { data: { message: 'Date is required for one-time sessions' } } };

      // helpers
      const addHour = (hhmm: string) => {
        const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
        const date = new Date();
        date.setHours(h || 0, m || 0, 0, 0);
        date.setTime(date.getTime() + 60 * 60 * 1000);
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
      };
      const labelToIndex: Record<string, number> = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

      // Validate game-specific fields
      if (form.eventType !== 'training' && !form.opponent) {
        throw { response: { data: { message: 'Opponent is required for games/competitions' } } };
      }

      if (editing) {
        const base: any = {
          title: form.name,
          sessionType: isWeekly ? 'weekly' : 'special',
          eventType: form.eventType,
          group: form.group || undefined,
          location: form.location || undefined,
        };
        
        // Add game-specific fields
        if (form.eventType !== 'training') {
          base.opponent = form.opponent;
          base.locationType = form.locationType;
        }
        
        if (isWeekly) {
          const day = form.days && form.days.length ? (labelToIndex[codeToLabel[form.days[0]] || form.days[0]] ?? labelToIndex[form.days[0]] ?? 1) : undefined;
          base.dayOfWeek = day;
          base.weeklyStartTime = form.time;
          base.weeklyEndTime = addHour(form.time);
        } else {
          const start = new Date(`${form.date}T${form.time}`);
          const end = new Date(start.getTime() + 60 * 60 * 1000);
          base.specialStartTime = start.toISOString();
          base.specialEndTime = end.toISOString();
        }
        await adminApi.sessions.update(editing._id, base);
        setRows(prev => prev.map(s => s._id === editing._id ? { 
          ...s, 
          name: form.name, 
          type: base.sessionType, 
          eventType: form.eventType,
          date: form.date || s.date, 
          time: form.time || s.time, 
          location: form.location, 
          group: form.group, 
          sport: (groups.find(g=>g._id===form.group)?.sport) || s.sport,
          opponent: form.opponent,
          locationType: form.locationType,
        } : s));
        toast({ title: 'Session Updated' });
      } else {
        if (isWeekly) {
          const days = form.days || [];
          const results = await Promise.all(days.map(async (d) => {
            const idx = labelToIndex[codeToLabel[d] || d] ?? labelToIndex[d] ?? 1;
            const payload: any = {
              title: form.name,
              sessionType: 'weekly' as const,
              eventType: form.eventType,
              group: form.group || undefined,
              location: form.location || undefined,
              dayOfWeek: idx,
              weeklyStartTime: form.time,
              weeklyEndTime: addHour(form.time),
            };
            
            // Add game fields if not training
            if (form.eventType !== 'training') {
              payload.opponent = form.opponent;
              payload.locationType = form.locationType;
            }
            const { data } = await adminApi.sessions.create(payload);
            const created = data.session || payload as any;
            // compute the date within current week for this day index
            const ws = new Date();
            const dayKey = (() => { const di = (idx + 7) % 7; const d0 = new Date(ws); d0.setDate(ws.getDate() + di); return d0.toISOString().slice(0,10); })();
            const newItem: UISession = {
              _id: created._id || Math.random().toString(36).slice(2),
              name: created.title || form.name,
              type: created.sessionType || 'weekly',
              group: typeof created.group === 'string' ? created.group : (created.group?.name || (groups.find(g=>g._id===form.group)?.name || form.group)),
              sport: typeof created.group === 'string' ? (groups.find(g=>g._id===created.group)?.sport) : (created.group?.sport || (groups.find(g=>g._id===form.group)?.sport)),
              date: dayKey,
              time: form.time,
              location: created.location || form.location,
              start: undefined,
              end: undefined,
              days: [created.dayOfWeek ?? idx],
            };
            return newItem;
          }));
          setRows(prev => [...results, ...prev]);
          toast({ title: 'Sessions Created' });
        } else {
          const start = new Date(`${form.date}T${form.time}`);
          const end = new Date(start.getTime() + 60 * 60 * 1000);
          const payload: any = {
            title: form.name,
            sessionType: 'special' as const,
            eventType: form.eventType,
            group: form.group || undefined,
            location: form.location || undefined,
            specialStartTime: start.toISOString(),
            specialEndTime: end.toISOString(),
          };
          
          // Add game fields if not training
          if (form.eventType !== 'training') {
            payload.opponent = form.opponent;
            payload.locationType = form.locationType;
          }
          const { data } = await adminApi.sessions.create(payload);
          const created = data.session || payload as any;
          const newItem: UISession = {
            _id: created._id || Math.random().toString(36).slice(2),
            name: created.title || form.name,
            type: created.sessionType || 'special',
            group: typeof created.group === 'string' ? created.group : (created.group?.name || (groups.find(g=>g._id===form.group)?.name || form.group)),
            sport: typeof created.group === 'string' ? (groups.find(g=>g._id===created.group)?.sport) : (created.group?.sport || (groups.find(g=>g._id===form.group)?.sport)),
            date: form.date,
            time: form.time,
            location: created.location || form.location,
            start: created.specialStartTime,
            end: created.specialEndTime,
          };
          setRows(prev => [newItem, ...prev]);
          toast({ title: 'Session Created' });
        }
      }
      setShowForm(false);
      setEditing(null);
    } catch (err: any) {
      toast({ title: 'Save failed', description: err?.response?.data?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">Training Sessions</h1>
          <p className="text-muted-foreground mt-2">Plan and manage training schedules</p>
        </div>
        <Button className="bg-gradient-primary shadow-primary hover:shadow-hover" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Schedule Session
        </Button>
      </div>

      {showForm && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>{editing ? 'Edit Session' : 'Schedule Session'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Event Type</Label>
                <select 
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={form.eventType} 
                  onChange={(e) => setForm({ ...form, eventType: e.target.value as any })}
                >
                  <option value="training">Training</option>
                  <option value="game">Game</option>
                  <option value="meet">Meet</option>
                  <option value="competition">Competition</option>
                </select>
              </div>
              <div>
                <Label>Weekly</Label>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={form.weekly} onChange={(e) => setForm({ ...form, weekly: e.target.checked, type: e.target.checked ? 'weekly' : 'special', date: e.target.checked ? '' : form.date, days: e.target.checked ? form.days : [] })} />
                  <span className="text-sm text-muted-foreground">Repeat weekly</span>
                </div>
              </div>
              {!form.weekly && (
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
              )}
              <div>
                <Label>Time</Label>
                <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <Label>Group</Label>
                <SingleSelect value={form.group} onChange={(v) => setForm({ ...form, group: v })} options={groupOptions} placeholder="Select group" title="Group" />
              </div>
              
              {/* Game-specific fields */}
              {form.eventType !== 'training' && (
                <>
                  <div>
                    <Label>Opponent</Label>
                    <Input value={form.opponent} onChange={(e) => setForm({ ...form, opponent: e.target.value })} placeholder="Enter opponent name" />
                  </div>
                  <div>
                    <Label>Location Type</Label>
                    <select 
                      className="w-full border rounded px-3 py-2 text-sm"
                      value={form.locationType} 
                      onChange={(e) => setForm({ ...form, locationType: e.target.value as any })}
                    >
                      <option value="home">Home</option>
                      <option value="away">Away</option>
                      <option value="neutral">Neutral</option>
                    </select>
                  </div>
                </>
              )}
              
              {form.weekly && (
                <div className="md:col-span-2">
                  <Label>Days of week</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                    {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => (
                      <label key={d} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.days.includes(d)} onChange={() => setForm({ ...form, days: form.days.includes(d) ? form.days.filter(x=>x!==d) : [...form.days, d] })} />
                        <span>{d}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary">{saving ? 'Saving...' : 'Save'}</Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="shadow-card mb-6">
        <CardContent className="pt-6 space-y-4">
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
                className={sportFilter === sport ? "bg-gradient-primary" : ""}
              >
                <span className="capitalize">{sport}</span>
              </Button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground mr-2">Filter by Status:</span>
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              className={statusFilter === "all" ? "bg-gradient-primary" : ""}
            >
              All Sessions
            </Button>
            <Button
              variant={statusFilter === "upcoming" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("upcoming")}
              className={statusFilter === "upcoming" ? "bg-gradient-primary" : ""}
            >
              Upcoming
            </Button>
            <Button
              variant={statusFilter === "completed" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("completed")}
              className={statusFilter === "completed" ? "bg-green-600 hover:bg-green-700" : ""}
            >
              Completed
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="all">All Sessions ({filteredAll.length})</TabsTrigger>
            <TabsTrigger value="weekly">Weekly ({filteredWeekly.length})</TabsTrigger>
            <TabsTrigger value="special">Special ({filteredSpecial.length})</TabsTrigger>
          </TabsList>
          <div className="w-64">
            <Input
              placeholder="Search by name, group, location, coach..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <TabsContent value="all" className="space-y-4 mt-6">
          <div className="grid gap-4">
            {loading && <Card className="shadow-card"><CardContent className="py-8">Loading...</CardContent></Card>}
            {!loading && filteredAll.length === 0 && (
              <Card className="shadow-card">
                <CardContent className="py-8 text-center text-muted-foreground">
                  {searchQuery ? "No sessions match your search" : "No sessions scheduled yet"}
                </CardContent>
              </Card>
            )}
            {!loading && filteredAll.map((session) => {
              const completed = isSessionCompleted(session);
              const isGame = session.eventType && session.eventType !== 'training';
              return (
              <Card key={session._id} className={`shadow-card hover:shadow-hover transition-shadow ${completed ? 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{session.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{session.group || '-'}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {completed && (
                        <Badge className="bg-green-600">
                          Completed
                        </Badge>
                      )}
                      <Badge
                        variant={session.type === "weekly" ? "default" : "secondary"}
                        className={session.type === "weekly" ? "bg-primary" : "bg-accent"}
                      >
                        {session.type || 'special'}
                      </Badge>
                      {session.eventType && session.eventType !== 'training' && (
                        <Badge className="bg-orange-600 capitalize">
                          {session.eventType}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {session.type === 'weekly' ? (
                          session.days && session.days.length ? session.days.map(d => {
                            const mapIdx: Record<string, string> = { '0': 'Sunday', '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday', '4': 'Thursday', '5': 'Friday', '6': 'Saturday' };
                            return mapIdx[String(d)] || codeToLabel[d] || String(d);
                          }).join(', ') : '-'
                        ) : (
                          session.date || '-'
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{session.time || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{session.location || '-'}</span>
                    </div>
                    {session.sport && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="px-2 py-0.5 rounded-full bg-muted text-xs capitalize">{session.sport}</span>
                      </div>
                    )}
                    {(session as any).coach && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{(session as any).coach}</span>
                      </div>
                    )}
                  </div>

                  {/* Game-specific information */}
                  {isGame && (
                    <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">vs </span>
                          <span className="font-semibold">{session.opponent || 'TBD'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Location: </span>
                          <span className="capitalize font-medium">{session.locationType || 'TBD'}</span>
                        </div>
                        {session.isCompleted && session.teamScore !== undefined && session.opponentScore !== undefined && (
                          <div className="font-semibold text-lg">
                            <span className="text-green-600">Score: {session.teamScore} - {session.opponentScore}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 border-t" />
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(session)}>Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => { setAssigning(session._id); setAssignCoachId(''); }}>Assign Coach</Button>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(session._id)} className="text-destructive">Delete</Button>
                  </div>

                  {assigning === session._id && (
                    <div className="mt-3 flex items-center gap-2">
                      <SingleSelect value={assignCoachId} onChange={setAssignCoachId} options={coachOptions} placeholder="Select coach" title="Coach" />
                      <Button size="sm" onClick={async () => {
                        if (!assignCoachId) return;
                        await adminApi.sessions.update(session._id, { coach: assignCoachId });
                        const name = coachOptions.find(o => o.value === assignCoachId)?.label || '';
                        setRows(prev => prev.map(s => s._id === session._id ? ({ ...s, coach: name } as any) : s));
                        setAssigning(null);
                        toast({ title: 'Coach Assigned' });
                      }}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAssigning(null)}>Cancel</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4 mt-6">
          <div className="grid gap-4">
            {loading && <Card className="shadow-card"><CardContent className="py-8">Loading...</CardContent></Card>}
            {!loading && filteredWeekly.length === 0 && (
              <Card className="shadow-card">
                <CardContent className="py-8 text-center text-muted-foreground">
                  {searchQuery ? "No weekly sessions match your search" : "No weekly sessions scheduled yet"}
                </CardContent>
              </Card>
            )}
            {!loading && filteredWeekly.map((session) => (
              <Card key={session._id} className="shadow-card hover:shadow-hover transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{session.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{session.group || '-'}</p>
                    </div>
                    <Badge variant="default" className="bg-primary">Weekly</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {session.days && session.days.length ? session.days.map(d => {
                          const mapIdx: Record<string, string> = { '0': 'Sunday', '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday', '4': 'Thursday', '5': 'Friday', '6': 'Saturday' };
                          return mapIdx[String(d)] || codeToLabel[d] || String(d);
                        }).join(', ') : '-'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{session.time || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{session.location || '-'}</span>
                    </div>
                    {session.sport && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="px-2 py-0.5 rounded-full bg-muted text-xs capitalize">{session.sport}</span>
                      </div>
                    )}
                    {(session as any).coach && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{(session as any).coach}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 border-t" />
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(session)}>Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => { setAssigning(session._id); setAssignCoachId(''); }}>Assign Coach</Button>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(session._id)} className="text-destructive">Delete</Button>
                  </div>

                  {assigning === session._id && (
                    <div className="mt-3 flex items-center gap-2">
                      <SingleSelect value={assignCoachId} onChange={setAssignCoachId} options={coachOptions} placeholder="Select coach" title="Coach" />
                      <Button size="sm" onClick={async () => {
                        if (!assignCoachId) return;
                        await adminApi.sessions.update(session._id, { coach: assignCoachId });
                        const name = coachOptions.find(o => o.value === assignCoachId)?.label || '';
                        setRows(prev => prev.map(s => s._id === session._id ? ({ ...s, coach: name } as any) : s));
                        setAssigning(null);
                        toast({ title: 'Coach Assigned' });
                      }}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAssigning(null)}>Cancel</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="special" className="space-y-4 mt-6">
          <div className="grid gap-4">
            {loading && <Card className="shadow-card"><CardContent className="py-8">Loading...</CardContent></Card>}
            {!loading && filteredSpecial.length === 0 && (
              <Card className="shadow-card">
                <CardContent className="py-8 text-center text-muted-foreground">
                  {searchQuery ? "No special sessions match your search" : "No special sessions scheduled yet"}
                </CardContent>
              </Card>
            )}
            {!loading && filteredSpecial.map((session) => (
              <Card key={session._id} className="shadow-card hover:shadow-hover transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{session.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{session.group || '-'}</p>
                    </div>
                    <Badge variant="secondary" className="bg-accent">Special</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{session.date || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{session.time || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{session.location || '-'}</span>
                    </div>
                    {session.sport && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="px-2 py-0.5 rounded-full bg-muted text-xs capitalize">{session.sport}</span>
                      </div>
                    )}
                    {(session as any).coach && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{(session as any).coach}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 border-t" />
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(session)}>Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => { setAssigning(session._id); setAssignCoachId(''); }}>Assign Coach</Button>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(session._id)} className="text-destructive">Delete</Button>
                  </div>

                  {assigning === session._id && (
                    <div className="mt-3 flex items-center gap-2">
                      <SingleSelect value={assignCoachId} onChange={setAssignCoachId} options={coachOptions} placeholder="Select coach" title="Coach" />
                      <Button size="sm" onClick={async () => {
                        if (!assignCoachId) return;
                        await adminApi.sessions.update(session._id, { coach: assignCoachId });
                        const name = coachOptions.find(o => o.value === assignCoachId)?.label || '';
                        setRows(prev => prev.map(s => s._id === session._id ? ({ ...s, coach: name } as any) : s));
                        setAssigning(null);
                        toast({ title: 'Coach Assigned' });
                      }}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAssigning(null)}>Cancel</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Training;
