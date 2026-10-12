require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function createManufacturer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = 'manufacturer@greenloop.com';
    const password = 'Manufacturer@123';
    const name = 'Green Loop Manufacturer';

    const hashedPassword = await bcrypt.hash(password, 10);

    let manufacturer = await User.findOne({ email });

    if (manufacturer) {
      manufacturer.name = name;
      manufacturer.password = hashedPassword;
      manufacturer.role = 'manufacturer';
      manufacturer.accountStatus = 'active';

      await manufacturer.save();

      console.log('Manufacturer account updated successfully.');
    } else {
      await User.create({
        name,
        email,
        password: hashedPassword,
        role: 'manufacturer',
        accountStatus: 'active',
        points: 0
      });

      console.log('Manufacturer account created successfully.');
    }

    console.log('\n--- MANUFACTURER LOGIN ---');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Role: manufacturer');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

createManufacturer();