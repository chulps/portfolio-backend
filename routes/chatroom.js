const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Chatroom = require('../models/Chatroom');

// Get all chatrooms
router.get('/', auth, async (req, res) => {
  try {
    const chatrooms = await Chatroom.find();
    res.json(chatrooms);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
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

    console.log("Chatroom before leaving:", chatroom);

    // Remove the user from the members list
    chatroom.members = chatroom.members.filter(member => member.toString() !== req.user.id);

    console.log("Chatroom after removing user:", chatroom);

    if (chatroom.members.length === 0) {
      // Delete the chatroom if there are no members left
      await Chatroom.deleteOne({ _id: chatroom._id });
      console.log("Chatroom deleted as no members left:", chatroom._id);
    } else {
      await chatroom.save();
      console.log("Chatroom updated after user left:", chatroom);
    }

    res.json({ msg: 'Successfully left the chatroom' });
  } catch (err) {
    console.error("Error leaving chatroom:", err.message);
    res.status(500).send('Server Error');
  }
});


module.exports = router;
