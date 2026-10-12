require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function createRecycler() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = 'recycler@greenloop.com';
    const password = 'Recycler@123';
    const name = 'Green Loop Recycling Centre';

    const hashedPassword = await bcrypt.hash(password, 10);

    let recycler = await User.findOne({ email });

    if (recycler) {
      recycler.name = name;
      recycler.password = hashedPassword;
      recycler.role = 'recycler';
      recycler.accountStatus = 'active';

      await recycler.save();
      console.log('Recycler account updated successfully.');
    } else {
      await User.create({
        name,
        email,
        password: hashedPassword,
        role: 'recycler',
        accountStatus: 'active',
        points: 0
      });

      console.log('Recycler account created successfully.');
    }

    console.log('\n--- RECYCLER LOGIN ---');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Role: recycler');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

createRecycler();