import TrainingSession from "../models/trainingSession.js";
import Group from "../models/group.js";
import Attendance from "../models/attendance.js";
import SessionNote from "../models/sessionNote.js";
import Coach from "../models/coach.js";

function expandWeeklySessions(sessions, start, end) {
  const results = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate) || isNaN(endDate)) return results;

  const toMinutes = (hhmm) => {
    const [h, m] = String(hhmm).split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  sessions.forEach((s) => {
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
        template: true,
        // Include game fields for weekly games (rare but possible)
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
}

export const myProfile = async (req, res, next) => {
  try {
    const coachId = req.coachId;
    const coach = await Coach.findById(coachId);
    if (!coach) return res.status(404).json({ success: false, message: "Coach not found" });
    res.status(200).json({ success: true, coach });
  } catch (err) {
    next(err);
  }
};

export const myGroups = async (req, res, next) => {
  try {
    const coachId = req.coachId;
    const adminId = req.adminId;
    const groups = await Group.find({ admin: adminId, coaches: coachId })
      .select('name players sport')
      .populate({ path: 'players', select: 'name' });
    res.status(200).json({ success: true, groups });
  } catch (err) {
    next(err);
  }
};

export const mySessions = async (req, res, next) => {
  try {
    const coachId = req.coachId;
    const adminId = req.adminId;
    const { start, end } = req.query;

    // Find all groups where this coach is assigned
    const groups = await Group.find({ admin: adminId, coaches: coachId }).select("_id");
    const groupIds = groups.map((g) => g._id);

    // Find sessions for those groups OR where coach is directly assigned (for substitute)
    const sessions = await TrainingSession.find({
      admin: adminId,
      $or: [
        { group: { $in: groupIds } }, // Sessions for groups where coach is assigned
        { coach: coachId }, // Sessions where coach is directly assigned
        { substituteCoach: coachId }, // Sessions where coach is substitute
      ],
    })
      .populate("group")
      .populate("coach")
      .populate("substituteCoach");

    if (start && end) {
      const specials = sessions
        .filter((s) => s.sessionType === "special")
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
          // Include game fields
          opponent: s.opponent,
          locationType: s.locationType,
          teamScore: s.teamScore,
          opponentScore: s.opponentScore,
          isCompleted: s.isCompleted,
          gameNotes: s.gameNotes,
        }));
      const weekly = sessions.filter((s) => s.sessionType === "weekly");
      const expanded = expandWeeklySessions(weekly, start, end);
      return res.status(200).json({ success: true, events: [...specials, ...expanded] });
    }

    res.status(200).json({ success: true, sessions });
  } catch (err) {
    next(err);
  }
};

export const sessionRoster = async (req, res, next) => {
  try {
    const coachId = req.coachId;
    const adminId = req.adminId;
    const { sessionId } = req.params;

    const session = await TrainingSession.findOne({ _id: sessionId, admin: adminId })
      .populate("group")
      .populate("coach")
      .populate("substituteCoach");
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    // Check if coach has access: either assigned to group, or directly assigned as coach/substitute
    const group = await Group.findById(session.group);
    const isGroupCoach = group?.coaches?.some((c) => String(c) === String(coachId));
    const isDirectCoach = String(session.coach) === String(coachId);
    const isSubstituteCoach = String(session.substituteCoach) === String(coachId);

    if (!isGroupCoach && !isDirectCoach && !isSubstituteCoach) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const players = group?.players || [];
    const populatedGroup = await Group.findById(session.group).populate("players");
    res.status(200).json({ success: true, session, players: populatedGroup?.players || [] });
  } catch (err) {
    next(err);
  }
};

export const submitAttendance = async (req, res, next) => {
  try {
    const coachId = req.coachId;
    const adminId = req.adminId;
    const { sessionId, date, records } = req.body; // records: [{ playerId, status }]

    const session = await TrainingSession.findOne({ _id: sessionId, admin: adminId });
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    
    // Check if coach has access: either assigned to group, or directly assigned as coach/substitute
    const group = await Group.findById(session.group);
    const isGroupCoach = group?.coaches?.some((c) => String(c) === String(coachId));
    const isDirectCoach = String(session.coach) === String(coachId);
    const isSubstituteCoach = String(session.substituteCoach) === String(coachId);

    if (!isGroupCoach && !isDirectCoach && !isSubstituteCoach) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const eventDate = new Date(date);
    if (isNaN(eventDate)) return res.status(400).json({ success: false, message: "Invalid date" });

    const ops = (records || []).map((r) => (
      Attendance.findOneAndUpdate(
        { session: sessionId, player: r.playerId, date: eventDate, admin: adminId },
        { $set: { status: r.status } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    ));

    const saved = await Promise.all(ops);
    res.status(200).json({ success: true, attendance: saved });
  } catch (err) {
    next(err);
  }
};

export const submitNotes = async (req, res, next) => {
  try {
    const coachId = req.coachId;
    const adminId = req.adminId;
    const { sessionId, date, generalNote, playerNotes } = req.body;

    const session = await TrainingSession.findOne({ _id: sessionId, admin: adminId });
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    
    // Check if coach has access: either assigned to group, or directly assigned as coach/substitute
    const group = await Group.findById(session.group);
    const isGroupCoach = group?.coaches?.some((c) => String(c) === String(coachId));
    const isDirectCoach = String(session.coach) === String(coachId);
    const isSubstituteCoach = String(session.substituteCoach) === String(coachId);

    if (!isGroupCoach && !isDirectCoach && !isSubstituteCoach) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const note = await SessionNote.create({
      session: sessionId,
      coach: coachId,
      date,
      generalNote,
      playerNotes,
      admin: adminId,
    });

    res.status(201).json({ success: true, note });
  } catch (err) {
    next(err);
  }
};

export const submitGameScore = async (req, res, next) => {
  try {
    const coachId = req.coachId;
    const adminId = req.adminId;
    const { sessionId, teamScore, opponentScore, gameNotes } = req.body;

    const session = await TrainingSession.findOne({ _id: sessionId, admin: adminId });
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    
    // Check if this is actually a game/competition
    if (session.eventType === "training") {
      return res.status(400).json({ success: false, message: "Cannot submit scores for training sessions" });
    }

    // Check if coach has access
    const group = await Group.findById(session.group);
    const isGroupCoach = group?.coaches?.some((c) => String(c) === String(coachId));
    const isDirectCoach = String(session.coach) === String(coachId);
    const isSubstituteCoach = String(session.substituteCoach) === String(coachId);

    if (!isGroupCoach && !isDirectCoach && !isSubstituteCoach) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    // Update the session with scores
    session.teamScore = teamScore;
    session.opponentScore = opponentScore;
    session.isCompleted = true;
    if (gameNotes) session.gameNotes = gameNotes;
    
    await session.save();

    res.status(200).json({ success: true, session });
  } catch (err) {
    next(err);
  }
};
