import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: "TrainingSession", required: true },
    player: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
    status: { type: String, enum: ["present", "absent", "excused"], required: true },
    date: { type: Date, required: true }, // concrete instance date for weekly sessions
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

attendanceSchema.index({ session: 1, player: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
