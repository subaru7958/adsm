import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, FileText, Loader2, User } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const Review = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [completedSessions, setCompletedSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [daysFilter, setDaysFilter] = useState(30);
  const [sportFilter, setSportFilter] = useState<string>("all");

  useEffect(() => {
    fetchCompletedSessions();
  }, [daysFilter]);

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
    try {
      setLoading(true);
      const { data } = await adminApi.completedSessions(daysFilter);
      setCompletedSessions(data.completedSessions || []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to load completed sessions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (session: any) => {
    setSelectedSession(session);
    setDialogOpen(true);
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

                <div className="pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => handleViewDetails(session)}>
                    View Full Details
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

              {/* General Notes */}
              {selectedSession.notes.length > 0 && selectedSession.notes[0].generalNote && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">General Session Notes</h3>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{selectedSession.notes[0].generalNote}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      By: {selectedSession.notes[0].coach?.name || "Unknown Coach"}
                    </p>
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
    </div>
  );
};

export default Review;
