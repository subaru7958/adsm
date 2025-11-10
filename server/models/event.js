import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    // Store date as Date (date-only semantics). Time stored separately as string HH:mm
    date: { type: Date, required: true },
    time: { type: String, required: true },
    location: { type: String },
    description: { type: String },
    banner: { type: String }, // URL path to uploaded image
  },
  { timestamps: true }
);

export const Event = mongoose.model("Event", eventSchema);
