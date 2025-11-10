import express from "express";
import { protect } from "../middlewares/protect.js";
import { createGroup, getGroups, getGroupById, updateGroup, deleteGroup } from "../controllers/groupsController.js";

const router = express.Router();

router.post("/", protect, createGroup);
router.get("/", protect, getGroups);
router.get("/:id", protect, getGroupById);
router.put("/:id", protect, updateGroup);
router.delete("/:id", protect, deleteGroup);

export default router;
