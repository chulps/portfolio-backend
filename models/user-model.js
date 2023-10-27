const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    minlength: [8, 'Password should be at least 8 characters']
  },
});

// Hash the password before saving the user
userSchema.pre('save', async function(next) {
  // Check if password is modified (or new)
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);  // Using 12 salt rounds consistently
  }
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
