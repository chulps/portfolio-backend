const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Chatroom = require('./models/Chatroom');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('MongoDB connected successfully');

  try {
    const chatrooms = await Chatroom.find();

    for (const chatroom of chatrooms) {
      for (const message of chatroom.messages) {
        if (!message.username || !message.name || !message.email) {
          const user = await User.findById(message.sender);

          if (user) {
            message.username = user.username;
            message.name = user.name;
            message.email = user.email;
          } else {
            console.warn(`User with ID ${message.sender} not found`);
          }
        }
      }

      await chatroom.save();
      console.log(`Chatroom ${chatroom.name} updated successfully.`);
    }

    console.log('All chatrooms updated successfully.');
    mongoose.disconnect();
  } catch (err) {
    console.error('Error updating chatrooms:', err);
    mongoose.disconnect();
  }
}).catch(err => {
  console.error('MongoDB connection error:', err);
});
