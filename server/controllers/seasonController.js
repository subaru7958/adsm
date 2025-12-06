import Season from '../models/season.js';
import Player from '../models/player.js';
import Coach from '../models/coach.js';
import Group from '../models/group.js';
import TrainingSession from '../models/trainingSession.js';

// Get all seasons for admin
export const getSeasons = async (req, res) => {
  try {
    const admin = req.userId; // Use req.userId from protect middleware
    const seasons = await Season.find({ admin }).sort({ createdAt: -1 });
    res.json({ seasons });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Create new season
export const createSeason = async (req, res) => {
  try {
    const { name, startDate, endDate, description } = req.body;
    const admin = req.userId; // Use req.userId from protect middleware
    
    const season = new Season({
      name,
      startDate,
      endDate,
      description,
      admin
    });
    
    await season.save();
    res.status(201).json({ season });
  } catch (err) {
    res.status(400).json({ message: 'Failed to create season', error: err.message });
  }
};

// Delete season (and all associated data)
export const deleteSeason = async (req, res) => {
  try {
    const { seasonId } = req.params;
    const admin = req.userId; // Use req.userId from protect middleware
    
    // Verify season belongs to admin
    const season = await Season.findOne({ _id: seasonId, admin });
    if (!season) {
      return res.status(404).json({ message: 'Season not found' });
    }
    
    // Delete season
    await Season.findByIdAndDelete(seasonId);
    
    // Delete all associated data
    await Promise.all([
      Player.deleteMany({ seasonId }),
      Coach.deleteMany({ seasonId }),
      Group.deleteMany({ seasonId }),
      TrainingSession.deleteMany({ seasonId })
    ]);
    
    res.json({ message: 'Season and all associated data deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Set active season
export const setActiveSeason = async (req, res) => {
  try {
    const { seasonId } = req.params;
    const admin = req.userId; // Use req.userId from protect middleware
    
    // Deactivate all seasons for this admin
    await Season.updateMany({ admin }, { isActive: false });
    
    // Activate selected season
    const season = await Season.findByIdAndUpdate(
      seasonId,
      { isActive: true },
      { new: true }
    );
    
    if (!season) {
      return res.status(404).json({ message: 'Season not found' });
    }
    
    res.json({ season });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
