const express = require('express');
const router = express.Router();

let chatRooms = {};

// Create a new temporary chatroom
router.post('/', (req, res) => {
  const newChatroomId = Math.random().toString(36).substring(2, 7);
  chatRooms[newChatroomId] = {
    messages: [],
    createdAt: Date.now(),
    timeout: setTimeout(() => {
      delete chatRooms[newChatroomId];
      console.log(`Chatroom ${newChatroomId} deleted due to inactivity.`);
    }, 30 * 60 * 1000), // 30 minutes
  };
  console.log(`Chatroom ${newChatroomId} created.`);
  res.status(201).json({ chatroomId: newChatroomId });
});

module.exports = { router, chatRooms };
