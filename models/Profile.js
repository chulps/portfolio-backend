const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProfileSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  bio: {
    type: String,
  },
  profileImage: {
    type: String,
  },
});

module.exports = mongoose.model('Profile', ProfileSchema);
