const express = require('express');
const Group = require('../models/Group');
const authenticateToken = require('../middlewares/authMiddleware');

const router = express.Router();

// Create a new group
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const creatorId = req.user.userId;

    const group = new Group({
      name,
      creator: creatorId,
      members: [creatorId] // creator is automatically a member
    });

    await group.save();
    
    await group.populate('creator', 'username email');
    await group.populate('members', 'username email');

    // Emit event to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('group-created', group);
    }

    res.status(201).json(group);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error creating group' });
  }
});

// Get all groups
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Return all groups so everyone can join/see them
    const groups = await Group.find()
      .populate('creator', 'username email')
      .populate('members', 'username email')
      .sort({ createdAt: -1 });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching groups' });
  }
});

// Join a group (optional API if we want explicit joining, though socket joining handles real-time)
router.post('/:groupId/join', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (!group.members.includes(userId)) {
      group.members.push(userId);
      await group.save();
      
      const io = req.app.get('io');
      if (io) {
        io.emit('groups-updated');
      }
    }

    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Server error joining group' });
  }
});

module.exports = router;
