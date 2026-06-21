const express = require('express');
const Message = require('../models/Message');
const authenticateToken = require('../middlewares/authMiddleware');

const router = express.Router();

// Get private messages between current user and another user
router.get('/private/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const otherUserId = req.params.otherUserId;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: otherUserId },
        { sender: otherUserId, receiver: currentUserId }
      ]
    })
    .populate('sender', 'username email')
    .populate('receiver', 'username email')
    .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching private messages' });
  }
});

// Get group messages
router.get('/group/:groupId', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.groupId;

    const messages = await Message.find({ group: groupId })
      .populate('sender', 'username email')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching group messages' });
  }
});

module.exports = router;
