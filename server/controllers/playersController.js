import Player from "../models/player.js";

export const createPlayer = async (req, res, next) => {
  try {
    const { name, email, phone, sport, seasonId } = req.body;
    const admin = req.userId;
    
    if (!seasonId) {
      return res.status(400).json({ success: false, message: "Season ID is required" });
    }
    
    const photo = req.file ? `/uploads/${req.file.filename}` : undefined;
    const player = await Player.create({ name, email, phone, sport, photo, admin, seasonId });
    res.status(201).json({ success: true, player });
  } catch (err) {
    next(err);
  }
};

export const getPlayers = async (req, res, next) => {
  try {
    const admin = req.userId;
    const { season } = req.query;
    
    if (!season) {
      return res.status(400).json({ success: false, message: "Season ID is required" });
    }
    
    const players = await Player.find({ admin, seasonId: season }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, players });
  } catch (err) {
    next(err);
  }
};

export const updatePlayer = async (req, res, next) => {
  try {
    const admin = req.userId;
    const { id } = req.params;
    const updates = { ...req.body };
    if (req.file) {
      updates.photo = `/uploads/${req.file.filename}`;
    }

    const player = await Player.findOneAndUpdate({ _id: id, admin }, updates, {
      new: true,
      runValidators: true,
    });
    if (!player) return res.status(404).json({ success: false, message: "Player not found" });
    res.status(200).json({ success: true, player });
  } catch (err) {
    next(err);
  }
};

export const deletePlayer = async (req, res, next) => {
  try {
    const admin = req.userId;
    const { id } = req.params;
    const player = await Player.findOneAndDelete({ _id: id, admin });
    if (!player) return res.status(404).json({ success: false, message: "Player not found" });
    res.status(200).json({ success: true, message: "Player deleted" });
  } catch (err) {
    next(err);
  }
};
