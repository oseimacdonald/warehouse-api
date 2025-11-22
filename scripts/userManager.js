const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

/**
 * User management utility script
 * Usage: 
 *   node scripts/userManager.js --list
 *   node scripts/userManager.js --create --email user@example.com --password pass123 --role admin
 *   node scripts/userManager.js --update --email user@example.com --role user
 *   node scripts/userManager.js --delete --email user@example.com
 */

class UserManager {
  constructor() {
    this.connect();
  }

  async connect() {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/warehouse');
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    }
  }

  async listUsers() {
    try {
      const users = await User.find().sort({ createdAt: -1 });
      
      console.log('\n📋 User List:');
      console.log('=' .repeat(80));
      
      if (users.length === 0) {
        console.log('No users found');
        return;
      }

      users.forEach(user => {
        console.log(`ID: ${user._id}`);
        console.log(`Name: ${user.displayName}`);
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);
        console.log(`Active: ${user.isActive ? 'Yes' : 'No'}`);
        console.log(`Last Login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}`);
        console.log(`Created: ${user.createdAt.toLocaleString()}`);
        console.log(`Auth: ${user.googleId ? 'Google OAuth' : 'Email/Password'}`);
        console.log('-'.repeat(40));
      });

      console.log(`\nTotal users: ${users.length}`);
      
    } catch (error) {
      console.error('❌ Error listing users:', error.message);
    }
  }

  async createUser(email, password, role = 'user', firstName = 'User', lastName = 'Account') {
    try {
      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        console.log(`❌ User with email ${email} already exists`);
        return;
      }

      // Create user
      const user = new User({
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        email,
        password,
        role,
        isActive: true
      });

      await user.save();
      
      console.log('✅ User created successfully:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${password}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user._id}`);

    } catch (error) {
      console.error('❌ Error creating user:', error.message);
    }
  }

  async updateUser(email, updates) {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        console.log(`❌ User with email ${email} not found`);
        return;
      }

      // Update allowed fields
      const allowedUpdates = ['role', 'isActive', 'firstName', 'lastName', 'displayName'];
      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          user[key] = updates[key];
        }
      });

      await user.save();
      
      console.log('✅ User updated successfully:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.isActive ? 'Yes' : 'No'}`);

    } catch (error) {
      console.error('❌ Error updating user:', error.message);
    }
  }

  async deleteUser(email) {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        console.log(`❌ User with email ${email} not found`);
        return;
      }

      await User.findByIdAndDelete(user._id);
      console.log(`✅ User ${email} deleted successfully`);

    } catch (error) {
      console.error('❌ Error deleting user:', error.message);
    }
  }

  async disconnect() {
    await mongoose.connection.close();
    console.log('📦 Database connection closed');
  }
}

// Command line interface
const main = async () => {
  const args = process.argv.slice(2);
  const manager = new UserManager();

  try {
    // Give time for connection
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (args.includes('--list')) {
      await manager.listUsers();
    } 
    else if (args.includes('--create')) {
      const emailIndex = args.indexOf('--email');
      const passwordIndex = args.indexOf('--password');
      const roleIndex = args.indexOf('--role');
      
      if (emailIndex === -1 || passwordIndex === -1) {
        console.log('❌ Usage: node scripts/userManager.js --create --email user@example.com --password pass123 [--role admin]');
        return;
      }

      const email = args[emailIndex + 1];
      const password = args[passwordIndex + 1];
      const role = roleIndex !== -1 ? args[roleIndex + 1] : 'user';

      await manager.createUser(email, password, role);
    }
    else if (args.includes('--update')) {
      const emailIndex = args.indexOf('--email');
      const roleIndex = args.indexOf('--role');
      const activeIndex = args.indexOf('--active');
      
      if (emailIndex === -1) {
        console.log('❌ Usage: node scripts/userManager.js --update --email user@example.com [--role admin] [--active true/false]');
        return;
      }

      const email = args[emailIndex + 1];
      const updates = {};

      if (roleIndex !== -1) {
        updates.role = args[roleIndex + 1];
      }
      if (activeIndex !== -1) {
        updates.isActive = args[activeIndex + 1] === 'true';
      }

      await manager.updateUser(email, updates);
    }
    else if (args.includes('--delete')) {
      const emailIndex = args.indexOf('--email');
      
      if (emailIndex === -1) {
        console.log('❌ Usage: node scripts/userManager.js --delete --email user@example.com');
        return;
      }

      const email = args[emailIndex + 1];
      await manager.deleteUser(email);
    }
    else {
      console.log(`
🤖 Warehouse API User Manager

Usage:
  node scripts/userManager.js --list
  node scripts/userManager.js --create --email user@example.com --password pass123 [--role admin]
  node scripts/userManager.js --update --email user@example.com [--role admin] [--active true/false]
  node scripts/userManager.js --delete --email user@example.com

Examples:
  node scripts/userManager.js --list
  node scripts/userManager.js --create --email admin@warehouse.com --password admin123 --role admin
  node scripts/userManager.js --update --email user@example.com --role user --active false
      `);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await manager.disconnect();
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = UserManager;