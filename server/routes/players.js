import express from "express";
import { protect } from "../middlewares/protect.js";
import { createPlayer, getPlayers, updatePlayer, deletePlayer } from "../controllers/playersController.js";
import { upload } from "../middlewares/upload.js";

const router = express.Router();

router.post("/", protect, upload.single("photo"), createPlayer);
router.get("/", protect, getPlayers);
router.put("/:id", protect, upload.single("photo"), updatePlayer);
router.delete("/:id", protect, deletePlayer);

export default router;
