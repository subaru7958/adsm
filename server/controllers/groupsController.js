import Group from "../models/group.js";

export const createGroup = async (req, res, next) => {
  try {
    const { name, sport } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Group name is required" });
    if (!sport) return res.status(400).json({ success: false, message: "Sport is required" });
    const admin = req.userId;
    const group = await Group.create({ name, sport, admin, players: [], coaches: [] });
    res.status(201).json({ success: true, group });
  } catch (err) {
    next(err);
  }
};

export const deleteGroup = async (req, res, next) => {
  try {
    const admin = req.userId;
    const { id } = req.params;
    const group = await Group.findOneAndDelete({ _id: id, admin });
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });
    res.status(200).json({ success: true, message: "Group deleted" });
  } catch (err) {
    next(err);
  }
};

export const getGroups = async (req, res, next) => {
  try {
    const admin = req.userId;
    const groups = await Group.find({ admin })
      .populate({ path: 'players', select: 'name' })
      .populate({ path: 'coaches', select: 'name' })
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, groups });
  } catch (err) {
    next(err);
  }
};

export const getGroupById = async (req, res, next) => {
  try {
    const admin = req.userId;
    const { id } = req.params;
    const group = await Group.findOne({ _id: id, admin })
      .populate("players")
      .populate("coaches");
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });
    res.status(200).json({ success: true, group });
  } catch (err) {
    next(err);
  }
};

export const updateGroup = async (req, res, next) => {
  try {
    const admin = req.userId;
    const { id } = req.params;
    const { name, sport, players, coaches } = req.body;

    const update = {};
    if (typeof name === "string") update.name = name;
    if (typeof sport === "string") update.sport = sport;
    if (Array.isArray(players)) update.players = players;
    if (Array.isArray(coaches)) update.coaches = coaches;

    const group = await Group.findOneAndUpdate({ _id: id, admin }, update, {
      new: true,
      runValidators: true,
    });
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });
    res.status(200).json({ success: true, group });
  } catch (err) {
    next(err);
  }
};
