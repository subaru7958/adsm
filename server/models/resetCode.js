import mongoose from "mongoose";

const resetCodeSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index to automatically delete expired codes
resetCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ResetCode = mongoose.model("ResetCode", resetCodeSchema);
export default ResetCode;
