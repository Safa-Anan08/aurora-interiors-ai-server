const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aurora-interiors';

async function run() {
  try {
    console.log('Connecting to URI:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    // Update all users containing 'admin' in email to role 'admin'
    const result = await mongoose.connection.db.collection('users').updateMany(
      { email: /admin/i },
      { $set: { role: 'admin' } }
    );

    console.log(`Successfully upgraded ${result.modifiedCount} users to admin role.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error during upgrade:', err);
    process.exit(1);
  }
}

run();
