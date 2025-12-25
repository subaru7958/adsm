import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, FileText, Loader2, User } from "lucide-react";
import { adminApi, api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useSeason } from "@/contexts/SeasonContext";
import { format } from "date-fns";

const Review = () => {
  const { toast } = useToast();
  const { activeSeasonId } = useSeason();
  const [loading, setLoading] = useState(true);
  const [completedSessions, setCompletedSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [daysFilter, setDaysFilter] = useState(30);
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteGeneral, setNoteGeneral] = useState("");
  const [notePlayerNotes, setNotePlayerNotes] = useState<Array<{ player: string; note: string }>>([]);
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (activeSeasonId) {
      fetchCompletedSessions();
    }
  }, [daysFilter, activeSeasonId]);

  // Get unique sports from completed sessions
  const availableSports = Array.from(
    new Set(
      completedSessions
        .map(s => s.group?.sport)
        .filter(Boolean)
    )
  ).sort();

  // Filter sessions by sport
  const filteredSessions = sportFilter === "all" 
    ? completedSessions 
    : completedSessions.filter(s => s.group?.sport === sportFilter);

  const fetchCompletedSessions = async () => {
    if (!activeSeasonId) return;
    try {
      setLoading(true);
      // Fetch expanded sessions for the last N days up to now
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - daysFilter);
      const startStr = start.toISOString().slice(0,10);
      const endStr = end.toISOString().slice(0,10);
      const { data } = await api.get(`/api/sessions?season=${activeSeasonId}&start=${startStr}&end=${endStr}`);
      const events = data.events || [];

      const now = new Date();
      const passed = events.filter((e: any) => {
        const s = new Date(e.start);
        const en = new Date(e.end);
        return (en || s) < now;
      }).map((e: any) => ({
        sessionId: e._id,
        sessionTitle: e.title || 'Training Session',
        date: e.start,
        dateStr: new Date(e.start).toISOString().slice(0,10),
        group: e.group,
        coach: e.coach,
        substituteCoach: e.substituteCoach,
        location: e.location,
        eventType: e.eventType,
        notes: [],
        attendance: [],
        attended: 0,
        totalPlayers: 0,
        attendanceRate: 0,
      }));

      setCompletedSessions(passed);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to load sessions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (session: any) => {
    setSelectedSession(session);
    setDialogOpen(true);
    try {
      const dateKey = session.dateStr || (session.date ? new Date(session.date).toISOString().slice(0,10) : undefined);
      if (!dateKey) return;
      const { data } = await api.get(`/api/admin/session-review/${session.sessionId}/${dateKey}`);
      setSelectedSession((prev: any) => ({
        ...(prev || session),
        attendance: data.attendance || [],
        notes: data.notes || [],
        attended: (data.attendance || []).filter((a: any) => a.status === 'present').length,
        totalPlayers: (data.attendance || []).length,
        attendanceRate: (data.attendance || []).length ? Math.round(((data.attendance || []).filter((a:any)=>a.status==='present').length/(data.attendance||[]).length)*100) : 0,
      }));
    } catch (err: any) {
      // details fetch failed; keep minimal
    }
  };

  const openNoteDialog = (session: any) => {
    setSelectedSession(session);
    // Pre-fill from existing admin note if present (notes without coach are admin)
    const adminNote = (session.notes || []).find((n: any) => !n.coach);
    setNoteGeneral(adminNote?.generalNote || "");
    setNotePlayerNotes(adminNote?.playerNotes?.map((pn: any) => ({ player: pn.player?._id || pn.player, note: pn.note })) || []);
    setNoteDialogOpen(true);
  };

  const saveAdminNote = async () => {
    if (!selectedSession) return;
    try {
      setSavingNote(true);
      await api.post("/api/admin/session-notes", {
        sessionId: selectedSession.sessionId,
        date: selectedSession.date,
        generalNote: noteGeneral.trim() || undefined,
        playerNotes: notePlayerNotes.filter(p => p.player && p.note?.trim()),
      });
      toast({ title: "Saved", description: "Admin note saved successfully" });
      setNoteDialogOpen(false);
      fetchCompletedSessions();
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.message || "Failed to save note", variant: "destructive" });
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Session Review
          </h1>
          <p className="text-muted-foreground mt-2">Review completed training sessions</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={daysFilter === 7 ? "default" : "outline"}
            size="sm"
            onClick={() => setDaysFilter(7)}
          >
            Last 7 Days
          </Button>
          <Button
            variant={daysFilter === 30 ? "default" : "outline"}
            size="sm"
            onClick={() => setDaysFilter(30)}
          >
            Last 30 Days
          </Button>
          <Button
            variant={daysFilter === 90 ? "default" : "outline"}
            size="sm"
            onClick={() => setDaysFilter(90)}
          >
            Last 90 Days
          </Button>
        </div>
      </div>

      {/* Sport Filter */}
      {availableSports.length > 0 && (
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
                All Sports ({completedSessions.length})
              </Button>
              {availableSports.map((sport) => (
                <Button
                  key={sport}
                  variant={sportFilter === sport ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSportFilter(sport)}
                  className={sportFilter === sport ? "bg-gradient-primary" : ""}
                >
                  <span className="capitalize">
                    {sport} ({completedSessions.filter(s => s.group?.sport === sport).length})
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {filteredSessions.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {sportFilter === "all" 
                ? "No completed sessions found in the selected period" 
                : `No completed ${sportFilter} sessions found in the selected period`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredSessions.map((session) => (
            <Card key={`${session.sessionId}_${session.date}`} className="shadow-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{session.sessionTitle || "Training Session"}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {session.group?.name || "No group"}
                    </p>
                  </div>
                  <Badge className="bg-green-600">Completed</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{format(new Date(session.date), "MMM dd, yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Coach</p>
                    <p className="font-medium">{session.coach?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Attendance</p>
                    <p className="font-medium">
                      {session.attended}/{session.totalPlayers}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Attendance Rate</p>
                    <p className="font-medium">{session.attendanceRate}%</p>
                  </div>
                </div>

                {session.notes.length > 0 && session.notes[0].generalNote && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="w-4 h-4" />
                      Coach Notes
                    </div>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">
                      {session.notes[0].generalNote}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-sm text-muted-foreground">
                    {session.attended} players present
                  </span>
                  <XCircle className="w-4 h-4 text-destructive ml-4" />
                  <span className="text-sm text-muted-foreground">
                    {session.totalPlayers - session.attended} absent
                  </span>
                </div>

                <div className="pt-4 border-t flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleViewDetails(session)}>
                    View Full Details
                  </Button>
                  <Button size="sm" onClick={() => openNoteDialog(session)}>
                    Add/Edit Admin Note
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedSession?.sessionTitle || "Training Session"}
            </DialogTitle>
            <div className="text-sm text-muted-foreground space-y-1 pt-2">
              <p>{selectedSession?.date && format(new Date(selectedSession.date), "EEEE, MMMM dd, yyyy")}</p>
              <p>Group: {selectedSession?.group?.name || "N/A"}</p>
              <p>Coach: {selectedSession?.coach?.name || "N/A"}</p>
              <p>Location: {selectedSession?.location || "N/A"}</p>
            </div>
          </DialogHeader>

          {selectedSession && (
            <div className="space-y-6 pt-4">
              {/* Attendance Details */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Attendance Details</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-green-600">{selectedSession.attended}</p>
                        <p className="text-sm text-muted-foreground">Present</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-red-600">
                          {selectedSession.totalPlayers - selectedSession.attended}
                        </p>
                        <p className="text-sm text-muted-foreground">Absent</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  {selectedSession.attendance.map((record: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{record.player?.name || record.player?.email || "Unknown"}</span>
                      </div>
                      <Badge variant={record.status === 'present' ? 'default' : 'destructive'}>
                        {record.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes List (Coach/Admin) */}
              {(selectedSession.notes || []).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Notes</h3>
                  <div className="space-y-3">
                    {selectedSession.notes.map((note: any, idx: number) => (
                      <div key={idx} className="bg-muted/50 p-4 rounded-lg">
                        {note.generalNote && (
                          <p className="text-sm whitespace-pre-wrap">{note.generalNote}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          By: {note.coach?.name || "Admin"}
                        </p>
                        {note.playerNotes?.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {note.playerNotes.map((pn: any, i: number) => (
                              <div key={i} className="text-sm text-muted-foreground">
                                <span className="font-medium">{pn.player?.name || pn.player?.email || 'Player'}: </span>
                                <span>{pn.note}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Player Notes */}
              {selectedSession.notes.length > 0 && selectedSession.notes[0].playerNotes?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Individual Player Notes</h3>
                  <div className="space-y-3">
                    {selectedSession.notes[0].playerNotes.map((note: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-4 bg-muted/20">
                        <p className="font-medium mb-2">
                          {note.player?.name || note.player?.email || "Unknown Player"}
                        </p>
                        <p className="text-sm text-muted-foreground">{note.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    {/* Admin Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add/Edit Admin Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">General Note</label>
              <textarea
                className="w-full border rounded p-2 mt-1 min-h-[120px] bg-background"
                value={noteGeneral}
                onChange={(e) => setNoteGeneral(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Player Notes</label>
              <div className="text-xs text-muted-foreground mb-2">Add notes for individual players (optional)</div>
              <div className="space-y-2">
                {notePlayerNotes.map((pn, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      className="flex-1 border rounded p-2"
                      placeholder="Player ID"
                      value={pn.player}
                      onChange={(e) => {
                        const arr = [...notePlayerNotes];
                        arr[idx] = { ...arr[idx], player: e.target.value };
                        setNotePlayerNotes(arr);
                      }}
                    />
                    <input
                      className="flex-[2] border rounded p-2"
                      placeholder="Note"
                      value={pn.note}
                      onChange={(e) => {
                        const arr = [...notePlayerNotes];
                        arr[idx] = { ...arr[idx], note: e.target.value };
                        setNotePlayerNotes(arr);
                      }}
                    />
                    <Button variant="outline" size="sm" onClick={() => setNotePlayerNotes(prev => prev.filter((_,i)=> i!==idx))}>Remove</Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setNotePlayerNotes(prev => [...prev, { player: '', note: '' }])}>Add Player Note</Button>
              </div>
              <div className="text-xs text-muted-foreground mt-2">Tip: use the Attendance list in details to copy Player IDs for accuracy.</div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveAdminNote} disabled={savingNote}>
                {savingNote ? 'Saving…' : 'Save Note'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Review;
