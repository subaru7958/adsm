import express from "express";
import { protect } from "../middlewares/protect.js";
import { createCoach, getCoaches, updateCoach, deleteCoach } from "../controllers/coachesController.js";
import { upload } from "../middlewares/upload.js";

const router = express.Router();

router.post("/", protect, upload.single("photo"), createCoach);
router.get("/", protect, getCoaches);
router.put("/:id", protect, upload.single("photo"), updateCoach);
router.delete("/:id", protect, deleteCoach);

export default router;
