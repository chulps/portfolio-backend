const mongoose = require('mongoose');

const FriendSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  friendEmail: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('Friend', FriendSchema);
