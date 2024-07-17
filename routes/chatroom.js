// routes/chatroom.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Chatroom = require('../models/Chatroom');

// Get chatrooms where the authenticated user is a member
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const chatrooms = await Chatroom.find({ members: userId });
    const chatroomsWithLatestMessages = chatrooms.map((chatroom) => {
      const latestMessage = chatroom.getLatestMessage();
      const hasUnreadMessages = chatroom.hasUnreadMessages(userId);
      return {
        ...chatroom.toObject(),
        latestMessage,
        hasUnreadMessages,
      };
    });
    res.json(chatroomsWithLatestMessages);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Get chatroom by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const chatroom = await Chatroom.findById(req.params.id)
      .populate('originator')
      .populate('messages.sender', 'username'); // populate sender info

    if (!chatroom) {
      return res.status(404).json({ message: 'Chatroom not found' });
    }

    res.json(chatroom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get members of a chatroom by chatroom ID
router.get('/:id/members', auth, async (req, res) => {
  try {
    const chatroom = await Chatroom.findById(req.params.id).populate('members', 'username name profileImage');
    if (!chatroom) {
      return res.status(404).json({ message: 'Chatroom not found' });
    }
    res.json({ members: chatroom.members });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all messages for a chatroom by ID
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const chatroom = await Chatroom.findById(req.params.id).populate('messages.sender');
    if (!chatroom) {
      return res.status(404).json({ message: 'Chatroom not found' });
    }
    res.json(chatroom.messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new chatroom
router.post('/', auth, async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;

  try {
    let chatroom = new Chatroom({
      name,
      originator: userId,
      members: [userId]
    });

    await chatroom.save();
    res.json(chatroom);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Leave a chatroom
router.post('/leave', auth, async (req, res) => {
  const { chatroomId } = req.body;
  try {
    const chatroom = await Chatroom.findById(chatroomId);

    if (!chatroom) {
      return res.status(404).json({ msg: 'Chatroom not found' });
    }

    // Remove the user from the members list
    chatroom.members = chatroom.members.filter(member => member.toString() !== req.user.id);

    if (chatroom.members.length === 0) {
      // Delete the chatroom if there are no members left
      await Chatroom.deleteOne({ _id: chatroom._id });
    } else {
      await chatroom.save();
    }

    res.json({ msg: 'Successfully left the chatroom' });
  } catch (err) {
    console.error("Error leaving chatroom:", err.message);
    res.status(500).send('Server Error');
  }
});

// Mark messages as read in a chatroom
router.post('/:id/mark-read', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const chatroomId = req.params.id;

    const chatroom = await Chatroom.findById(chatroomId);
    if (!chatroom) {
      return res.status(404).json({ message: 'Chatroom not found' });
    }

    chatroom.messages.forEach(message => {
      if (!message.readBy.includes(userId)) {
        message.readBy.push(userId);
      }
    });

    await chatroom.save();
    res.status(200).json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).send('Server Error');
  }
});

// Update chatroom public status
router.put('/:id/public', auth, async (req, res) => {
  try {
    const chatroom = await Chatroom.findById(req.params.id);
    if (!chatroom) {
      return res.status(404).json({ message: 'Chatroom not found' });
    }

    // Check if the user is the originator
    if (chatroom.originator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not the originator of this chatroom' });
    }

    chatroom.isPublic = req.body.isPublic;
    await chatroom.save();
    res.json(chatroom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
