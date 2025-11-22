const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Data migration and maintenance utilities
 * Usage:
 *   node scripts/migrateData.js --fix-order-numbers
 *   node scripts/migrateData.js --update-skus
 *   node scripts/migrateData.js --cleanup-inactive
 */

class DataMigrator {
  constructor() {
    this.stats = {
      processed: 0,
      updated: 0,
      errors: 0
    };
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

  async fixOrderNumbers() {
    try {
      console.log('🔧 Fixing order numbers sequence...');
      
      const Order = require('../models/Order');
      const orders = await Order.find().sort({ createdAt: 1 });
      
      let sequence = 1;
      
      for (const order of orders) {
        const expectedOrderNumber = `ORD-${String(sequence).padStart(6, '0')}`;
        
        if (order.orderNumber !== expectedOrderNumber) {
          console.log(`   Updating ${order.orderNumber} → ${expectedOrderNumber}`);
          order.orderNumber = expectedOrderNumber;
          await order.save();
          this.stats.updated++;
        }
        
        sequence++;
        this.stats.processed++;
      }
      
      console.log(`✅ Order numbers fixed: ${this.stats.processed} processed, ${this.stats.updated} updated`);
      
    } catch (error) {
      console.error('❌ Error fixing order numbers:', error.message);
      this.stats.errors++;
    }
  }

  async updateProductSKUs() {
    try {
      console.log('🏷️  Updating product SKUs...');
      
      const Product = require('../models/Product');
      const products = await Product.find();
      
      for (const product of products) {
        if (!product.sku) {
          // Generate SKU based on category and name
          const categoryPrefix = product.category.substring(0, 3).toUpperCase();
          const namePart = product.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
          const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          
          const newSKU = `${categoryPrefix}-${namePart}-${randomNum}`;
          
          console.log(`   Generated SKU for ${product.name}: ${newSKU}`);
          product.sku = newSKU;
          await product.save();
          this.stats.updated++;
        }
        
        this.stats.processed++;
      }
      
      console.log(`✅ SKUs updated: ${this.stats.processed} processed, ${this.stats.updated} updated`);
      
    } catch (error) {
      console.error('❌ Error updating SKUs:', error.message);
      this.stats.errors++;
    }
  }

  async cleanupInactiveProducts() {
    try {
      console.log('🧹 Cleaning up inactive products...');
      
      const Product = require('../models/Product');
      const Order = require('../models/Order');
      
      // Find inactive products with no orders
      const inactiveProducts = await Product.find({ 
        isActive: false,
        stockQuantity: 0
      });
      
      let deletedCount = 0;
      
      for (const product of inactiveProducts) {
        // Check if product is used in any orders
        const orderCount = await Order.countDocuments({
          'items.product': product._id
        });
        
        if (orderCount === 0) {
          console.log(`   Deleting inactive product: ${product.name} (${product.sku})`);
          await Product.findByIdAndDelete(product._id);
          deletedCount++;
        } else {
          console.log(`   Keeping product (used in ${orderCount} orders): ${product.name}`);
        }
        
        this.stats.processed++;
      }
      
      console.log(`✅ Cleanup completed: ${this.stats.processed} processed, ${deletedCount} deleted`);
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error.message);
      this.stats.errors++;
    }
  }

  async recalculateOrderTotals() {
    try {
      console.log('💰 Recalculating order totals...');
      
      const Order = require('../models/Order');
      const orders = await Order.find().populate('items.product');
      
      for (const order of orders) {
        let recalculatedTotal = order.shippingCost || 0;
        
        for (const item of order.items) {
          if (item.product && item.product.price) {
            recalculatedTotal += item.product.price * item.quantity;
          }
        }
        
        // Only update if different
        if (Math.abs(order.totalAmount - recalculatedTotal) > 0.01) {
          console.log(`   Updating order ${order.orderNumber}: $${order.totalAmount} → $${recalculatedTotal.toFixed(2)}`);
          order.totalAmount = parseFloat(recalculatedTotal.toFixed(2));
          await order.save();
          this.stats.updated++;
        }
        
        this.stats.processed++;
      }
      
      console.log(`✅ Order totals recalculated: ${this.stats.processed} processed, ${this.stats.updated} updated`);
      
    } catch (error) {
      console.error('❌ Error recalculating totals:', error.message);
      this.stats.errors++;
    }
  }

  resetStats() {
    this.stats = { processed: 0, updated: 0, errors: 0 };
  }

  async disconnect() {
    await mongoose.connection.close();
    console.log('📦 Database connection closed');
  }
}

// Command line interface
const main = async () => {
  const args = process.argv.slice(2);
  const migrator = new DataMigrator();

  try {
    await migrator.connect();

    if (args.includes('--fix-order-numbers')) {
      await migrator.fixOrderNumbers();
    }
    else if (args.includes('--update-skus')) {
      await migrator.updateProductSKUs();
    }
    else if (args.includes('--cleanup-inactive')) {
      await migrator.cleanupInactiveProducts();
    }
    else if (args.includes('--recalculate-totals')) {
      await migrator.recalculateOrderTotals();
    }
    else if (args.includes('--run-all')) {
      console.log('🚀 Running all data migrations...\n');
      
      await migrator.fixOrderNumbers();
      migrator.resetStats();
      
      await migrator.updateProductSKUs();
      migrator.resetStats();
      
      await migrator.cleanupInactiveProducts();
      migrator.resetStats();
      
      await migrator.recalculateOrderTotals();
      
      console.log('\n✅ All migrations completed!');
    }
    else {
      console.log(`
🛠️ Warehouse API Data Migrator

Usage:
  node scripts/migrateData.js --fix-order-numbers
  node scripts/migrateData.js --update-skus
  node scripts/migrateData.js --cleanup-inactive
  node scripts/migrateData.js --recalculate-totals
  node scripts/migrateData.js --run-all

Examples:
  node scripts/migrateData.js --fix-order-numbers
  node scripts/migrateData.js --run-all
      `);
    }

  } catch (error) {
    console.error('❌ Migration error:', error.message);
  } finally {
    await migrator.disconnect();
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = DataMigrator;