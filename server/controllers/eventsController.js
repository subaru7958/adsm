import { Event } from "../models/event.js";

function toDateOnly(dateStr) {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return undefined;
  // zero the time to date-only
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export const listEvents = async (req, res, next) => {
  try {
    const { start, end, page = 1, limit = 50, q, season } = req.query;
    const filter = {};
    
    // Filter by admin (user who created the events)
    filter.admin = req.userId;
    
    // Filter by season if provided
    if (season) {
      filter.season = season;
    }
    
    if (start || end) {
      filter.date = {};
      if (start) filter.date.$gte = toDateOnly(start);
      if (end) filter.date.$lte = toDateOnly(end);
    }
    if (q) {
      const regex = new RegExp(q, "i");
      filter.$or = [
        { title: regex },
        { location: regex },
        { description: regex },
      ];
    }
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(200, parseInt(limit)));

    const [items, total] = await Promise.all([
      Event.find(filter)
        .sort({ date: 1, time: 1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Event.countDocuments(filter),
    ]);

    res.json({
      success: true,
      events: items.map((e) => ({
        _id: e._id,
        title: e.title,
        date: e.date ? e.date.toISOString().slice(0, 10) : undefined,
        time: e.time,
        location: e.location,
        description: e.description,
        banner: e.banner,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
      page: pageNum,
      limit: limitNum,
      total,
    });
  } catch (err) {
    next(err);
  }
};

export const createEvent = async (req, res, next) => {
  try {
    const { title, date, time, location, description, season } = req.body;
    if (!title || !date || !time) {
      return res.status(400).json({ success: false, message: "title, date and time are required" });
    }
    if (!season) {
      return res.status(400).json({ success: false, message: "season is required" });
    }
    const bannerPath = req.file ? `/uploads/${req.file.filename}` : undefined;
    const event = await Event.create({
      title,
      date: toDateOnly(date),
      time,
      location,
      description,
      banner: bannerPath,
      season,
      admin: req.userId,
    });
    res.status(201).json({ success: true, event: {
      _id: event._id,
      title: event.title,
      date: event.date?.toISOString().slice(0,10),
      time: event.time,
      location: event.location,
      description: event.description,
      banner: event.banner,
    }});
  } catch (err) {
    next(err);
  }
};

export const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, date, time, location, description } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (date !== undefined) update.date = toDateOnly(date);
    if (time !== undefined) update.time = time;
    if (location !== undefined) update.location = location;
    if (description !== undefined) update.description = description;
    if (req.file) update.banner = `/uploads/${req.file.filename}`;

    const event = await Event.findOneAndUpdate(
      { _id: id, admin: req.userId }, 
      update, 
      { new: true }
    );
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    res.json({ success: true, event: {
      _id: event._id,
      title: event.title,
      date: event.date?.toISOString().slice(0,10),
      time: event.time,
      location: event.location,
      description: event.description,
      banner: event.banner,
    }});
  } catch (err) {
    next(err);
  }
};

export const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await Event.findOneAndDelete({ _id: id, admin: req.userId });
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    next(err);
  }
};
