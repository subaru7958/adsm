import Coach from "../models/coach.js";

export const createCoach = async (req, res, next) => {
  try {
    const { name, email, phone, specialty } = req.body;
    const admin = req.userId;
    const photo = req.file ? `/uploads/${req.file.filename}` : undefined;
    const coach = await Coach.create({ name, email, phone, specialty, photo, admin });
    res.status(201).json({ success: true, coach });
  } catch (err) {
    next(err);
  }
};

export const getCoaches = async (req, res, next) => {
  try {
    const admin = req.userId;
    const coaches = await Coach.find({ admin }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, coaches });
  } catch (err) {
    next(err);
  }
};

export const updateCoach = async (req, res, next) => {
  try {
    const admin = req.userId;
    const { id } = req.params;
    const updates = { ...req.body };
    if (req.file) {
      updates.photo = `/uploads/${req.file.filename}`;
    }

    const coach = await Coach.findOneAndUpdate({ _id: id, admin }, updates, {
      new: true,
      runValidators: true,
    });
    if (!coach) return res.status(404).json({ success: false, message: "Coach not found" });
    res.status(200).json({ success: true, coach });
  } catch (err) {
    next(err);
  }
};

export const deleteCoach = async (req, res, next) => {
  try {
    const admin = req.userId;
    const { id } = req.params;
    const coach = await Coach.findOneAndDelete({ _id: id, admin });
    if (!coach) return res.status(404).json({ success: false, message: "Coach not found" });
    res.status(200).json({ success: true, message: "Coach deleted" });
  } catch (err) {
    next(err);
  }
};
