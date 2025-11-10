import express from "express";
import { coachProtect } from "../middlewares/coachProtect.js";
import { mySessions, sessionRoster, submitAttendance, submitNotes, myProfile, myGroups, submitGameScore } from "../controllers/coachController.js";

const router = express.Router();

router.get("/my-sessions", coachProtect, mySessions);
router.get("/my-groups", coachProtect, myGroups);
router.get("/session-roster/:sessionId", coachProtect, sessionRoster);
router.post("/attendance", coachProtect, submitAttendance);
router.post("/notes", coachProtect, submitNotes);
router.post("/game-score", coachProtect, submitGameScore);
router.get("/me", coachProtect, myProfile);
router.put("/change-password", coachProtect, async (req, res, next) => {
  try {
    const coachId = req.coachId;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Please provide current and new password" });
    }
    
    const Coach = (await import("../models/coach.js")).default;
    const coach = await Coach.findById(coachId).select("+password");
    if (!coach) return res.status(404).json({ success: false, message: "Coach not found" });
    
    // Verify current password
    const bcrypt = await import("bcryptjs");
    const isMatch = await bcrypt.compare(currentPassword, coach.password || "");
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }
    
    // Update password
    const salt = await bcrypt.genSalt(10);
    coach.password = await bcrypt.hash(newPassword, salt);
    await coach.save();
    
    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
