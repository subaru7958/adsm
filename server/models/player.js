import mongoose from "mongoose";

const playerSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, unique: true },
  phone: { type: String },
  photo: { type: String }, // URL to uploaded photo
  sport: { type: String, enum: ["football", "handball", "swimming", "volleyball"], default: "football" },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: "Season", required: true },
}, { timestamps: true });

const Player = mongoose.model("Player", playerSchema);
export default Player;
