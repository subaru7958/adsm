import TrainingSession from "../models/trainingSession.js";

// Helper: expand weekly sessions into concrete events between [start, end]
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
    // find first occurrence on or after startDate matching dayOfWeek
    const first = new Date(startDate);
    const diff = (s.dayOfWeek - first.getDay() + 7) % 7;
    first.setDate(first.getDate() + diff);

    // iterate weeks
    for (let d = new Date(first); d <= endDate; d.setDate(d.getDate() + 7)) {
      const minsStart = toMinutes(s.weeklyStartTime);
      const minsEnd = toMinutes(s.weeklyEndTime);
      const startInst = new Date(d);
      startInst.setHours(Math.floor(minsStart / 60), minsStart % 60, 0, 0);
      const endInst = new Date(d);
      endInst.setHours(Math.floor(minsEnd / 60), minsEnd % 60, 0, 0);

      results.push({
        _id: s._id, // reference to template session id
        title: s.title,
        sessionType: s.sessionType,
        group: s.group,
        coach: s.coach,
        substituteCoach: s.substituteCoach,
        location: s.location,
        admin: s.admin,
        start: startInst,
        end: endInst,
        template: true,
      });
    }
  });
  return results;
}

export const createSession = async (req, res, next) => {
  try {
    const admin = req.userId;
    const {
      title,
      sessionType,
      eventType,
      group,
      coach,
      substituteCoach,
      location,
      // special
      specialStartTime,
      specialEndTime,
      // weekly
      dayOfWeek,
      weeklyStartTime,
      weeklyEndTime,
      // game/competition fields
      opponent,
      locationType,
      teamScore,
      opponentScore,
      isCompleted,
      gameNotes,
    } = req.body;

    const payload = {
      title,
      sessionType,
      eventType: eventType || "training",
      group,
      coach,
      substituteCoach,
      location,
      admin,
    };

    if (sessionType === "special") {
      payload.specialStartTime = specialStartTime;
      payload.specialEndTime = specialEndTime;
    } else if (sessionType === "weekly") {
      payload.dayOfWeek = dayOfWeek;
      payload.weeklyStartTime = weeklyStartTime;
      payload.weeklyEndTime = weeklyEndTime;
    }

    // Add game-specific fields if not training
    if (eventType && eventType !== "training") {
      payload.opponent = opponent;
      payload.locationType = locationType;
      if (teamScore !== undefined) payload.teamScore = teamScore;
      if (opponentScore !== undefined) payload.opponentScore = opponentScore;
      if (isCompleted !== undefined) payload.isCompleted = isCompleted;
      if (gameNotes) payload.gameNotes = gameNotes;
    }

    const session = await TrainingSession.create(payload);
    res.status(201).json({ success: true, session });
  } catch (err) {
    next(err);
  }
};

export const getSessions = async (req, res, next) => {
  try {
    const admin = req.userId;
    const { start, end } = req.query; // optional range for expansion

    // fetch sessions for admin
    const sessions = await TrainingSession.find({ admin })
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

    // no range: return raw sessions
    res.status(200).json({ success: true, sessions });
  } catch (err) {
    next(err);
  }
};

export const updateSession = async (req, res, next) => {
  try {
    const admin = req.userId;
    const { id } = req.params;
    const updates = { ...req.body };
    // allow changing substituteCoach and other fields
    const session = await TrainingSession.findOneAndUpdate({ _id: id, admin }, updates, {
      new: true,
      runValidators: true,
    });
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    res.status(200).json({ success: true, session });
  } catch (err) {
    next(err);
  }
};

export const deleteSession = async (req, res, next) => {
  try {
    const admin = req.userId;
    const { id } = req.params;
    const session = await TrainingSession.findOneAndDelete({ _id: id, admin });
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    res.status(200).json({ success: true, message: "Session deleted" });
  } catch (err) {
    next(err);
  }
};
