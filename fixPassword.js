const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function fixPassword() {
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('./models/User');
  const user = await User.findOne({ email: 'test@example.com' });
  if (user) {
    user.password = bcrypt.hashSync('password123', 10);
    await user.save();
    console.log('Password updated');
  } else {
    console.log('User not found');
  }
  mongoose.connection.close();
}

fixPassword();