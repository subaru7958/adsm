import express from "express";
import { protect } from "../middlewares/protect.js";
import { upload } from "../middlewares/upload.js";
import Attendance from "../models/attendance.js";
import SessionNote from "../models/sessionNote.js";
import Player from "../models/player.js";
import Coach from "../models/coach.js";
import Group from "../models/group.js";
import TrainingSession from "../models/trainingSession.js";
import User from "../models/user.js";
import { getSeasons, createSeason, deleteSeason, setActiveSeason } from "../controllers/seasonController.js";

const router = express.Router();

router.get("/session-review/:sessionId/:date", protect, async (req, res, next) => {
  try {
    const admin = req.userId;
    const { sessionId, date } = req.params;
    const day = new Date(date);
    if (isNaN(day)) return res.status(400).json({ success: false, message: "Invalid date" });

    const [attendance, notes] = await Promise.all([
      Attendance.find({ admin, session: sessionId, date: day }).populate("player", "name email"),
      SessionNote.find({ admin, session: sessionId, date: day }).populate("coach", "name email"),
    ]);

    res.status(200).json({ success: true, attendance, notes });
  } catch (err) {
    next(err);
  }
});

// Get all completed sessions with attendance and notes
router.get("/completed-sessions", protect, async (req, res, next) => {
  try {
    const admin = req.userId;
    const { days = 30 } = req.query; // Default to last 30 days
    
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));
    
    // Get all attendance records from the last X days
    const attendanceRecords = await Attendance.find({ 
      admin, 
      date: { $gte: since } 
    })
      .populate("session")
      .populate("player", "name email")
      .sort({ date: -1 });

    // Get all session notes from the last X days
    const sessionNotes = await SessionNote.find({ 
      admin, 
      date: { $gte: since } 
    })
      .populate("session")
      .populate("coach", "name email")
      .populate("playerNotes.player", "name email")
      .sort({ date: -1 });

    // Group by session and date
    const sessionsMap = new Map();
    
    // Process attendance
    attendanceRecords.forEach(record => {
      if (!record.session) return;
      const key = `${record.session._id}_${record.date.toISOString().split('T')[0]}`;
      if (!sessionsMap.has(key)) {
        sessionsMap.set(key, {
          session: record.session,
          date: record.date,
          attendance: [],
          notes: [],
        });
      }
      sessionsMap.get(key).attendance.push({
        player: record.player,
        status: record.status,
      });
    });

    // Process notes
    sessionNotes.forEach(note => {
      if (!note.session) return;
      const key = `${note.session._id}_${note.date.toISOString().split('T')[0]}`;
      if (!sessionsMap.has(key)) {
        sessionsMap.set(key, {
          session: note.session,
          date: note.date,
          attendance: [],
          notes: [],
        });
      }
      sessionsMap.get(key).notes.push({
        coach: note.coach,
        generalNote: note.generalNote,
        playerNotes: note.playerNotes,
      });
    });

    // Convert to array and populate session details
    const completedSessions = [];
    for (const [key, data] of sessionsMap.entries()) {
      const session = await TrainingSession.findById(data.session._id)
        .populate("group")
        .populate("coach", "name email")
        .populate("substituteCoach", "name email");
      
      if (!session) continue;

      const totalPlayers = data.attendance.length;
      const attended = data.attendance.filter(a => a.status === 'present').length;
      
      completedSessions.push({
        sessionId: session._id,
        sessionTitle: session.title,
        sessionType: session.sessionType,
        date: data.date,
        group: session.group,
        coach: session.coach,
        substituteCoach: session.substituteCoach,
        location: session.location,
        attendance: data.attendance,
        totalPlayers,
        attended,
        attendanceRate: totalPlayers > 0 ? Math.round((attended / totalPlayers) * 100) : 0,
        notes: data.notes,
      });
    }

    // Sort by date descending
    completedSessions.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({ success: true, completedSessions });
  } catch (err) {
    next(err);
  }
});

// Get admin settings
router.get("/settings", protect, async (req, res, next) => {
  try {
    const admin = req.userId;
    const user = await User.findById(admin);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    
    res.status(200).json({
      success: true,
      settings: {
        teamName: user.teamName,
        teamLogo: user.teamLogo,
        primaryColor: user.primaryColor || "#3b82f6",
        secondaryColor: user.secondaryColor || "#8b5cf6",
      },
    });
  } catch (err) {
    next(err);
  }
});

// Update admin settings
router.put("/settings", protect, upload.single("teamLogo"), async (req, res, next) => {
  try {
    const admin = req.userId;
    const { teamName, primaryColor, secondaryColor } = req.body;
    
    const updates = {};
    if (teamName) updates.teamName = teamName;
    if (primaryColor) updates.primaryColor = primaryColor;
    if (secondaryColor) updates.secondaryColor = secondaryColor;
    if (req.file) updates.teamLogo = `/uploads/${req.file.filename}`;
    
    const user = await User.findByIdAndUpdate(admin, updates, { new: true });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    
    res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      settings: {
        teamName: user.teamName,
        teamLogo: user.teamLogo,
        primaryColor: user.primaryColor,
        secondaryColor: user.secondaryColor,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Change admin password
router.put("/change-password", protect, async (req, res, next) => {
  try {
    const admin = req.userId;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Please provide current and new password" });
    }
    
    const user = await User.findById(admin).select("+password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    
    // Verify current password
    const bcrypt = await import("bcryptjs");
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    next(err);
  }
});

// Season Management Routes
router.get("/seasons", protect, getSeasons);
router.post("/seasons", protect, createSeason);
router.delete("/seasons/:seasonId", protect, deleteSeason);
router.put("/seasons/:seasonId/activate", protect, setActiveSeason);

export default router;

// Stats endpoint
router.get("/stats", protect, async (req, res, next) => {
  try {
    const admin = req.userId;

    // basic counts
    const [playersCount, coachesCount, groupsCount] = await Promise.all([
      Player.countDocuments({ admin }),
      Coach.countDocuments({ admin }),
      Group.countDocuments({ admin }),
    ]);

    // upcoming sessions for next 14 days (expanded)
    const now = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 14);

    const sessions = await TrainingSession.find({ admin })
      .populate("group")
      .populate("coach")
      .populate("substituteCoach");

    const toMinutes = (hhmm) => { const [h, m] = String(hhmm).split(":").map(Number); return (h || 0) * 60 + (m || 0); };
    const expandWeekly = (weekly, startISO, endISO) => {
      const results = [];
      const startDate = new Date(startISO);
      const endDate = new Date(endISO);
      weekly.forEach((s) => {
        const first = new Date(startDate);
        const diff = (s.dayOfWeek - first.getDay() + 7) % 7;
        first.setDate(first.getDate() + diff);
        for (let d = new Date(first); d <= endDate; d.setDate(d.getDate() + 7)) {
          const minsStart = toMinutes(s.weeklyStartTime);
          const minsEnd = toMinutes(s.weeklyEndTime);
          const startInst = new Date(d);
          startInst.setHours(Math.floor(minsStart / 60), minsStart % 60, 0, 0);
          const endInst = new Date(d);
          endInst.setHours(Math.floor(minsEnd / 60), minsEnd % 60, 0, 0);
          results.push({
            _id: s._id,
            title: s.title,
            sessionType: s.sessionType,
            eventType: s.eventType,
            group: s.group,
            coach: s.coach,
            substituteCoach: s.substituteCoach,
            location: s.location,
            admin: s.admin,
            start: startInst,
            end: endInst,
            // Game-specific fields
            opponent: s.opponent,
            locationType: s.locationType,
            teamScore: s.teamScore,
            opponentScore: s.opponentScore,
            isCompleted: s.isCompleted,
            gameNotes: s.gameNotes,
          });
        }
      });
      return results;
    };

    const specials = sessions
      .filter((s) => s.sessionType === "special" && s.specialStartTime >= now && s.specialStartTime <= end)
      .map((s) => ({
        _id: s._id,
        title: s.title,
        sessionType: s.sessionType,
        eventType: s.eventType,
        group: s.group,
        coach: s.coach,
        substituteCoach: s.substituteCoach,
        location: s.location,
        admin: s.admin,
        start: s.specialStartTime,
        end: s.specialEndTime,
        // Game-specific fields
        opponent: s.opponent,
        locationType: s.locationType,
        teamScore: s.teamScore,
        opponentScore: s.opponentScore,
        isCompleted: s.isCompleted,
        gameNotes: s.gameNotes,
      }));
    const weekly = sessions.filter((s) => s.sessionType === "weekly");
    const upcomingExpanded = expandWeekly(weekly, now, end);
    const upcoming = [...specials, ...upcomingExpanded].sort((a, b) => new Date(a.start) - new Date(b.start)).slice(0, 50);

    // attendance aggregate: counts by status and present rate (last 30 days)
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const agg = await Attendance.aggregate([
      { $match: { admin, date: { $gte: since } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const totals = agg.reduce((acc, { _id, count }) => { acc[_id] = count; acc.total = (acc.total || 0) + count; return acc; }, {});
    const attendanceRates = {
      byStatus: totals,
      presentRate: totals.total ? Math.round(((totals.present || 0) / totals.total) * 100) : 0,
      windowDays: 30,
    };

    res.status(200).json({
      success: true,
      stats: {
        counts: { players: playersCount, coaches: coachesCount, groups: groupsCount },
        upcoming,
        attendance: attendanceRates,
      },
    });
  } catch (err) {
    next(err);
  }
});
