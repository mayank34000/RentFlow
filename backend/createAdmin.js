require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log('[DB] Connected to MongoDB.');

        const email = 'rentflow132@gmail.com';
        const password = 'Rentflow@123';
        const name = 'RentFlow Admin';

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            existingUser.role = 'admin';

            if (password !== 'YOUR_ADMIN_PASSWORD') {
                existingUser.passwordHash = await bcrypt.hash(password, 12);
            }

            await existingUser.save();

            console.log('[Admin] Existing user promoted to admin.');
        } else {
            const passwordHash = await bcrypt.hash(password, 12);

            await User.create({
                name,
                email,
                passwordHash,
                role: 'admin',
                country: 'India',
            });

            console.log('[Admin] Admin account created successfully.');
        }

        await mongoose.disconnect();
        console.log('[DB] Disconnected.');
    } catch (error) {
        console.error('[Admin] Error:', error);
        process.exit(1);
    }
}

createAdmin();