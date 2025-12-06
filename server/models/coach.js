import mongoose from "mongoose";

const coachSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, unique: true },
  phone: { type: String },
  photo: { type: String }, // URL to uploaded photo
  specialty: { type: String, enum: ["football", "handball", "swimming", "volleyball"], default: "football" },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: "Season", required: true },
}, { timestamps: true });

const Coach = mongoose.model("Coach", coachSchema);
export default Coach;
