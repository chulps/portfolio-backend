const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
});

const chatroomSchema = new mongoose.Schema({
  name: String,
  originator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  isPublic: Boolean,
  messages: [messageSchema],
}, {
  timestamps: true,
});

chatroomSchema.methods.getLatestMessage = function () {
  if (this.messages.length > 0) {
    return this.messages[this.messages.length - 1];
  }
  return null;
};

chatroomSchema.methods.hasUnreadMessages = function (userId) {
  return this.messages.some(message => !message.readBy.includes(userId));
};

const Chatroom = mongoose.model('Chatroom', chatroomSchema);

module.exports = Chatroom;
