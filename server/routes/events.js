import express from "express";
import { protect } from "../middlewares/protect.js";
import { upload } from "../middlewares/upload.js";
import { listEvents, createEvent, updateEvent, deleteEvent } from "../controllers/eventsController.js";

const router = express.Router();

// List events (supports start, end, page, limit, q)
router.get("/", protect, listEvents);

// Create event (supports banner upload via field name 'banner')
router.post("/", protect, upload.single("banner"), createEvent);

// Update event
router.put("/:id", protect, upload.single("banner"), updateEvent);

// Delete event
router.delete("/:id", protect, deleteEvent);

export default router;
