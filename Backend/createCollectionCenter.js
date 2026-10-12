require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function createCollectionCenter() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = 'collection@greenloop.com';
    const password = 'Collection@123';
    const name = 'Green Loop Collection Centre';

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      existingUser.name = name;
      existingUser.role = 'collection_center';
      existingUser.accountStatus = 'active';

      // Reset the password for this dedicated test account.
      existingUser.password = await bcrypt.hash(password, 10);

      await existingUser.save();

      console.log('Collection Centre account updated successfully.');
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);

      await User.create({
        name,
        email,
        password: hashedPassword,
        role: 'collection_center',
        accountStatus: 'active',
        points: 0,
      });

      console.log('Collection Centre account created successfully.');
    }

    console.log('\nCollection Centre Login Credentials');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Role: collection_center');
  } catch (error) {
    console.error('Failed to create account:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

createCollectionCenter();