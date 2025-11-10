import express from "express";
import { protect } from "../middlewares/protect.js";
import { createSession, getSessions, updateSession, deleteSession } from "../controllers/sessionsController.js";

const router = express.Router();

router.post("/", protect, createSession);
router.get("/", protect, getSessions);
router.put("/:id", protect, updateSession);
router.delete("/:id", protect, deleteSession);

export default router;
