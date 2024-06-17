const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ChatroomSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  originator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Chatroom', ChatroomSchema);
