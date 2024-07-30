const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequests: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    }
  }],
  bio: {
    type: String,
  },
  name: {
    type: String,
  },
  profileImage: {
    type: String,
  },
  blocked: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  notifications: [{
    message: String,
    type: {
      type: String,
      enum: ['chatroom_invite', 'friend_request', 'other'],
    },
    chatroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chatroom',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    read: {
      type: Boolean,
      default: false,
    }
  }],
});

module.exports = mongoose.model('User', UserSchema);
