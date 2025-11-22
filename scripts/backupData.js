const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
require('dotenv').config();

/**
 * Database backup and restoration utility
 * Usage: 
 *   node scripts/backupData.js --backup
 *   node scripts/backupData.js --restore --file backup-2024-01-15.json
 */

class BackupManager {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.ensureBackupDir();
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
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

  async backupData() {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const backupFile = path.join(this.backupDir, `backup-${timestamp}.json`);
      
      const Product = require('../models/Product');
      const Order = require('../models/Order');
      const User = require('../models/User');

      console.log('📦 Starting database backup...');

      // Fetch all data (excluding passwords from users)
      const [products, orders, users] = await Promise.all([
        Product.find({}),
        Order.find({}),
        User.find({}).select('-password')
      ]);

      const backupData = {
        timestamp: new Date().toISOString(),
        products,
        orders,
        users,
        summary: {
          products: products.length,
          orders: orders.length,
          users: users.length
        }
      };

      // Write backup file
      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
      
      console.log('✅ Backup completed successfully!');
      console.log(`📁 Backup file: ${backupFile}`);
      console.log(`📊 Summary: ${products.length} products, ${orders.length} orders, ${users.length} users`);

      return backupFile;

    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      throw error;
    }
  }

  async restoreData(backupFile) {
    try {
      if (!fs.existsSync(backupFile)) {
        console.error(`❌ Backup file not found: ${backupFile}`);
        return;
      }

      console.log('🔄 Starting database restoration...');

      const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
      
      const Product = require('../models/Product');
      const Order = require('../models/Order');
      const User = require('../models/User');

      // Clear existing data
      await Promise.all([
        Product.deleteMany({}),
        Order.deleteMany({}),
        User.deleteMany({})
      ]);

      console.log('🗑️  Cleared existing data');

      // Restore data
      const [products, orders, users] = await Promise.all([
        Product.insertMany(backupData.products),
        Order.insertMany(backupData.orders),
        User.insertMany(backupData.users)
      ]);

      console.log('✅ Restoration completed successfully!');
      console.log(`📊 Restored: ${products.length} products, ${orders.length} orders, ${users.length} users`);
      console.log(`📅 Backup date: ${backupData.timestamp}`);

    } catch (error) {
      console.error('❌ Restoration failed:', error.message);
      throw error;
    }
  }

  listBackups() {
    const files = fs.readdirSync(this.backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
      .sort()
      .reverse();

    console.log('\n📂 Available backups:');
    console.log('=' .repeat(50));
    
    if (files.length === 0) {
      console.log('No backup files found');
      return;
    }

    files.forEach((file, index) => {
      const filePath = path.join(this.backupDir, file);
      const stats = fs.statSync(filePath);
      const fileSize = (stats.size / 1024).toFixed(2);
      
      console.log(`${index + 1}. ${file}`);
      console.log(`   Size: ${fileSize} KB`);
      console.log(`   Modified: ${stats.mtime.toLocaleString()}`);
      console.log('   -'.repeat(25));
    });
  }

  async disconnect() {
    await mongoose.connection.close();
    console.log('📦 Database connection closed');
  }
}

// Command line interface
const main = async () => {
  const args = process.argv.slice(2);
  const manager = new BackupManager();

  try {
    await manager.connect();

    if (args.includes('--backup')) {
      await manager.backupData();
    }
    else if (args.includes('--restore')) {
      const fileIndex = args.indexOf('--file');
      if (fileIndex === -1) {
        console.log('❌ Usage: node scripts/backupData.js --restore --file backup-2024-01-15.json');
        return;
      }
      const backupFile = args[fileIndex + 1];
      await manager.restoreData(backupFile);
    }
    else if (args.includes('--list')) {
      manager.listBackups();
    }
    else {
      console.log(`
💾 Warehouse API Backup Manager

Usage:
  node scripts/backupData.js --backup
  node scripts/backupData.js --restore --file backup-2024-01-15.json
  node scripts/backupData.js --list

Examples:
  node scripts/backupData.js --backup
  node scripts/backupData.js --restore --file backups/backup-2024-01-15.json
  node scripts/backupData.js --list
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

module.exports = BackupManager;