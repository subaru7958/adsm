import TrainingSession from "../models/trainingSession.js";
import Group from "../models/group.js";
import Player from "../models/player.js";

export const mySchedule = async (req, res, next) => {
  try {
    const playerId = req.playerId;
    const adminId = req.adminId;
    const { start, end } = req.query;

    // find groups containing this player
    const groups = await Group.find({ admin: adminId, players: playerId }).select("_id");
    const groupIds = groups.map((g) => g._id);

    const sessions = await TrainingSession.find({ admin: adminId, group: { $in: groupIds } })
      .populate("group")
      .populate("coach")
      .populate("substituteCoach");

    if (start && end) {
      // same expansion as in sessionsController
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
              template: true,
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
          // Game-specific fields
          opponent: s.opponent,
          locationType: s.locationType,
          teamScore: s.teamScore,
          opponentScore: s.opponentScore,
          isCompleted: s.isCompleted,
          gameNotes: s.gameNotes,
        }));
      const weekly = sessions.filter((s) => s.sessionType === "weekly");
      const expanded = expandWeekly(weekly, start, end);
      return res.status(200).json({ success: true, events: [...specials, ...expanded] });
    }

    res.status(200).json({ success: true, sessions });
  } catch (err) {
    next(err);
  }
};

export const myProfile = async (req, res, next) => {
  try {
    const player = await Player.findOne({ _id: req.playerId, admin: req.adminId });
    if (!player) return res.status(404).json({ success: false, message: "Player not found" });
    
    // Find the group(s) this player belongs to
    const groups = await Group.find({ admin: req.adminId, players: req.playerId }).select("name sport");
    
    res.status(200).json({ success: true, player, groups });
  } catch (err) {
    next(err);
  }
};

export const updateMyProfile = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (req.file) updates.photo = `/uploads/${req.file.filename}`;
    const player = await Player.findOneAndUpdate({ _id: req.playerId, admin: req.adminId }, updates, {
      new: true,
      runValidators: true,
    });
    if (!player) return res.status(404).json({ success: false, message: "Player not found" });
    res.status(200).json({ success: true, player });
  } catch (err) {
    next(err);
  }
};
