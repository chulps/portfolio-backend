const mongoose = require('mongoose');
const User = require('./models/User'); // Adjust the path according to your project structure

const generateRandomColor = () => {
  const colors = ["#FF5733", "#33FF57", "#3357FF", "#F333FF", "#33FFF3"];
  return colors[Math.floor(Math.random() * colors.length)];
};

const updateAvatars = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect('your_mongodb_connection_string', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Find all users without a profile image
    const users = await User.find({ profileImage: { $exists: false } });

    // Update each user with a fallback avatar
    for (let user of users) {
      if (!user.avatarColor || !user.avatarInitial) {
        const firstLetter = user.username.charAt(0).toUpperCase();
        const bgColor = generateRandomColor();

        // Update user's avatar color and initial
        user.avatarColor = bgColor;
        user.avatarInitial = firstLetter;
        await user.save();
      }
    }

    console.log('Avatars updated successfully!');
  } catch (err) {
    console.error('Error updating avatars:', err);
  } finally {
    // Close the connection
    mongoose.connection.close();
  }
};

updateAvatars();
