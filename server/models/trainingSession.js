import mongoose from "mongoose";

const trainingSessionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    sessionType: {
      type: String,
      enum: ["special", "weekly"],
      required: true,
    },
    // NEW: Event type to distinguish training from games/competitions
    eventType: {
      type: String,
      enum: ["training", "game", "meet", "competition"],
      default: "training",
    },
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    coach: { type: mongoose.Schema.Types.ObjectId, ref: "Coach" },
    substituteCoach: { type: mongoose.Schema.Types.ObjectId, ref: "Coach" },
    location: { type: String },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seasonId: { type: mongoose.Schema.Types.ObjectId, ref: "Season", required: true },

    // Special session fields
    specialStartTime: {
      type: Date,
      required: function () {
        return this.sessionType === "special";
      },
    },
    specialEndTime: {
      type: Date,
      required: function () {
        return this.sessionType === "special";
      },
    },

    // Weekly session fields
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
      required: function () {
        return this.sessionType === "weekly";
      },
    },
    weeklyStartTime: {
      type: String, // e.g. "17:00"
      required: function () {
        return this.sessionType === "weekly";
      },
    },
    weeklyEndTime: {
      type: String, // e.g. "18:30"
      required: function () {
        return this.sessionType === "weekly";
      },
    },

    // NEW: Game/Competition specific fields
    opponent: {
      type: String,
      required: function () {
        return this.eventType !== "training";
      },
    },
    locationType: {
      type: String,
      enum: ["home", "away", "neutral"],
      required: function () {
        return this.eventType !== "training";
      },
    },
    teamScore: {
      type: String, // String to allow formats like "3-2" or just "3"
    },
    opponentScore: {
      type: String,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    // Optional: Additional game details
    gameNotes: {
      type: String, // Coach can add post-game summary
    },
  },
  { timestamps: true }
);

const TrainingSession = mongoose.model("TrainingSession", trainingSessionSchema);
export default TrainingSession;
