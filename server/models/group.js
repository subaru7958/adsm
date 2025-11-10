import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sport: { type: String, enum: ["football", "handball", "swimming", "volleyball"], required: true, default: "football" },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
  coaches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Coach" }],
}, { timestamps: true });

const Group = mongoose.model("Group", groupSchema);
export default Group;
