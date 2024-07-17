const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('MongoDB connected successfully');

  try {
    const users = await User.find();

    for (const user of users) {
      // Initialize contacts, blocked, friends, and friendRequests if not already present
      if (!user.contacts) {
        user.contacts = [];
      }

      if (!user.blocked) {
        user.blocked = [];
      }

      if (!user.friends) {
        user.friends = [];
      }

      if (!user.friendRequests) {
        user.friendRequests = [];
      }

      await user.save();
      console.log(`User ${user.username} updated successfully.`);
    }

    console.log('All users updated successfully.');
    mongoose.disconnect();
  } catch (err) {
    console.error('Error updating users:', err);
    mongoose.disconnect();
  }
}).catch(err => {
  console.error('MongoDB connection error:', err);
});
