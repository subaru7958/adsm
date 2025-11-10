import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { coachApi } from "@/lib/api";

interface PlayerItem { _id: string; name?: string; email?: string }

const CoachAttendance = () => {
  const { sessionId } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [statuses, setStatuses] = useState<Record<string, 'present' | 'absent'>>({});
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [generalNote, setGeneralNote] = useState<string>("");
  const [playerNotes, setPlayerNotes] = useState<Record<string, string>>({});
  // Game score fields
  const [teamScore, setTeamScore] = useState<string>("");
  const [opponentScore, setOpponentScore] = useState<string>("");
  const [gameNotes, setGameNotes] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (!sessionId) return;
        const { data } = await coachApi.sessionRoster(sessionId);
        const s = data.session || data.data?.session || null;
        const ps: PlayerItem[] = data.players || [];
        setSession(s);
        setPlayers(ps);
        setStatuses(Object.fromEntries(ps.map(p => [p._id, 'present'])) as any);
        // default date from special session start if applicable
        if (s?.specialStartTime) {
          try { setDate(new Date(s.specialStartTime).toISOString().slice(0,10)); } catch { /* ignore */ }
        }
      } catch (err: any) {
        toast({ title: 'Failed to load roster', description: err?.response?.data?.message || 'Please try again', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, toast]);

  const header = useMemo(() => {
    if (!session) return { title: 'Attendance', sub: '' };
    const groupName = typeof session.group === 'string' ? '' : (session.group?.name || '');
    const dateStr = session.specialStartTime ? new Date(session.specialStartTime).toLocaleDateString() : 'Weekly';
    const timeStr = session.sessionType === 'weekly' ? `${session.weeklyStartTime || ''}${session.weeklyEndTime ? ` - ${session.weeklyEndTime}` : ''}` : (session.specialStartTime ? new Date(session.specialStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
    return { title: groupName || 'Training Session', sub: `${dateStr} • ${timeStr}` };
  }, [session]);

  const toggle = (id: string) => {
    setStatuses(prev => ({ ...prev, [id]: prev[id] === 'present' ? 'absent' : 'present' }));
  };

  const presentCount = useMemo(() => Object.values(statuses).filter(s => s === 'present').length, [statuses]);

  const submit = async () => {
    if (!sessionId) return;
    setSaving(true);
    try {
      const records = Object.entries(statuses).map(([playerId, status]) => ({ playerId, status }));
      await coachApi.submitAttendance({ sessionId, date, records });
      
      // Submit notes if any
      const playerNotesArray = Object.entries(playerNotes)
        .filter(([_, note]) => note.trim())
        .map(([player, note]) => ({ player, note }));
      
      if (generalNote.trim() || playerNotesArray.length > 0) {
        await coachApi.submitNotes({ 
          sessionId, 
          date, 
          generalNote: generalNote.trim() || undefined,
          playerNotes: playerNotesArray.length > 0 ? playerNotesArray : undefined
        });
      }
      
      // Submit game score if this is a game/competition
      const isGame = session?.eventType && session.eventType !== 'training';
      if (isGame && (teamScore || opponentScore)) {
        await coachApi.submitGameScore({
          sessionId,
          teamScore,
          opponentScore,
          gameNotes: gameNotes.trim() || undefined,
        });
      }
      
      toast({ title: isGame ? 'Attendance and game score submitted!' : 'Attendance and notes submitted successfully!' });
      navigate('/coach');
    } catch (err: any) {
      toast({ title: 'Submit failed', description: err?.response?.data?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Mark Attendance</h1>
            <p className="text-muted-foreground mt-1">{header.title} <span className="ml-2 text-xs">{header.sub}</span></p>
          </div>
          <Button variant="ghost" onClick={() => navigate(-1)}>Back</Button>
        </div>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Players</CardTitle>
            <Badge variant="secondary">{presentCount}/{players.length} present</Badge>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-sm text-muted-foreground">Date</label>
                  <input type="date" className="border rounded px-2 py-1 text-sm" value={date} onChange={(e)=>setDate(e.target.value)} />
                </div>
                {players.map((p) => (
                  <div key={p._id} className="border rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{p.name || p.email || 'Player'}</div>
                      <div className="flex gap-2">
                        <Button size="sm" variant={statuses[p._id] === 'present' ? 'default' : 'outline'} onClick={() => toggle(p._id)}>Present</Button>
                        <Button size="sm" variant={statuses[p._id] === 'absent' ? 'destructive' : 'outline'} onClick={() => toggle(p._id)}>Absent</Button>
                      </div>
                    </div>
                    <Textarea
                      placeholder="Add note for this player (optional)"
                      value={playerNotes[p._id] || ""}
                      onChange={(e) => setPlayerNotes(prev => ({ ...prev, [p._id]: e.target.value }))}
                      className="text-sm min-h-[60px]"
                    />
                  </div>
                ))}
                {!players.length && (
                  <div className="text-sm text-muted-foreground">No players in this group.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Game Score Card - Only show for games/competitions */}
        {session?.eventType && session.eventType !== 'training' && (
          <Card className="shadow-card border-orange-200 dark:border-orange-800">
            <CardHeader className="bg-orange-50 dark:bg-orange-950">
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge className="bg-orange-600">Game</Badge>
                Enter Final Score
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                vs {session.opponent || 'Opponent'} • {session.locationType ? `${session.locationType.charAt(0).toUpperCase() + session.locationType.slice(1)} Game` : ''}
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Our Score</label>
                  <input
                    type="text"
                    placeholder="0"
                    value={teamScore}
                    onChange={(e) => setTeamScore(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-lg font-bold text-center"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Opponent Score</label>
                  <input
                    type="text"
                    placeholder="0"
                    value={opponentScore}
                    onChange={(e) => setOpponentScore(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-lg font-bold text-center"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Game Summary (optional)</label>
                <Textarea
                  placeholder="Add notes about the game performance, key moments, etc."
                  value={gameNotes}
                  onChange={(e) => setGameNotes(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Session Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">General Session Notes</label>
                <Textarea
                  placeholder="Add general notes about this training session (optional)"
                  value={generalNote}
                  onChange={(e) => setGeneralNote(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <div className="pt-3 flex gap-2">
                <Button className="bg-gradient-primary" onClick={submit} disabled={saving || loading}>
                  {saving ? 'Submitting...' : (session?.eventType && session.eventType !== 'training' ? 'Submit All' : 'Submit Attendance & Notes')}
                </Button>
                <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CoachAttendance;
