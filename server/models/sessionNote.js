import mongoose from "mongoose";

const playerNoteSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
    note: { type: String, required: true },
  },
  { _id: false }
);

const sessionNoteSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: "TrainingSession", required: true },
    coach: { type: mongoose.Schema.Types.ObjectId, ref: "Coach", required: true },
    date: { type: Date, required: true },
    generalNote: { type: String },
    playerNotes: [playerNoteSchema],
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const SessionNote = mongoose.model("SessionNote", sessionNoteSchema);
export default SessionNote;
