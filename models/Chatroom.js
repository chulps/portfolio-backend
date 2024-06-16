const mongoose = require('mongoose');

const ChatroomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Chatroom', ChatroomSchema);
