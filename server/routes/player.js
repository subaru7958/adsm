import express from "express";
import { playerProtect } from "../middlewares/playerProtect.js";
import { mySchedule, myProfile, updateMyProfile } from "../controllers/playerController.js";
import { upload } from "../middlewares/upload.js";

const router = express.Router();

router.get("/my-schedule", playerProtect, mySchedule);
router.get("/my-profile", playerProtect, myProfile);
router.put("/my-profile", playerProtect, upload.single("photo"), updateMyProfile);
router.put("/change-password", playerProtect, async (req, res, next) => {
  try {
    const playerId = req.playerId;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Please provide current and new password" });
    }
    
    const Player = (await import("../models/player.js")).default;
    const player = await Player.findById(playerId).select("+password");
    if (!player) return res.status(404).json({ success: false, message: "Player not found" });
    
    // Verify current password
    const bcrypt = await import("bcryptjs");
    const isMatch = await bcrypt.compare(currentPassword, player.password || "");
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }
    
    // Update password
    const salt = await bcrypt.genSalt(10);
    player.password = await bcrypt.hash(newPassword, salt);
    await player.save();
    
    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
