const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/Product');
const Order = require('./models/Order');

const connectDB = require('./config/database');
connectDB();

const sampleProducts = [
  {
    name: "Wireless Bluetooth Headphones",
    description: "Premium noise-cancelling wireless headphones with 30hr battery life",
    sku: "WH-001",
    category: "Electronics",
    price: 129.99,
    cost: 65.00,
    stockQuantity: 50,
    supplier: "TechGadgets Inc",
    weight: 0.3,
    dimensions: {
      length: 18,
      width: 15,
      height: 8
    },
    images: ["headphone1.jpg", "headphone2.jpg"]
  },
  {
    name: "Smart Fitness Watch",
    description: "Waterproof fitness tracker with heart rate monitor and GPS",
    sku: "SFW-002",
    category: "Electronics",
    price: 199.99,
    cost: 95.00,
    stockQuantity: 30,
    supplier: "FitTech Co",
    weight: 0.1,
    dimensions: {
      length: 4,
      width: 4,
      height: 1
    },
    images: ["watch1.jpg", "watch2.jpg"]
  },
  {
    name: "Organic Cotton T-Shirt",
    description: "100% organic cotton t-shirt, available in multiple colors",
    sku: "TS-003",
    category: "Clothing",
    price: 24.99,
    cost: 8.50,
    stockQuantity: 100,
    supplier: "EcoWear Ltd",
    weight: 0.2,
    dimensions: {
      length: 30,
      width: 20,
      height: 2
    },
    images: ["tshirt1.jpg"]
  },
  {
    name: "Stainless Steel Water Bottle",
    description: "Insulated 1L stainless steel water bottle, keeps drinks cold for 24hrs",
    sku: "WB-004",
    category: "Sports",
    price: 34.99,
    cost: 12.00,
    stockQuantity: 75,
    supplier: "Outdoor Gear Co",
    weight: 0.4,
    dimensions: {
      length: 25,
      width: 8,
      height: 8
    }
  },
  {
    name: "LED Desk Lamp",
    description: "Adjustable LED desk lamp with multiple brightness settings",
    sku: "LED-005",
    category: "Home & Garden",
    price: 45.99,
    cost: 18.00,
    stockQuantity: 40,
    supplier: "HomeEssentials Inc",
    weight: 1.2,
    dimensions: {
      length: 35,
      width: 15,
      height: 15
    }
  }
];

const seedDatabase = async () => {
  try {
    // Clear existing data
    await Product.deleteMany({});
    await Order.deleteMany({});
    
    console.log('Cleared existing data...');
    
    // Insert sample products
    const products = await Product.insertMany(sampleProducts);
    console.log(`Inserted ${products.length} products`);
    
    // Create sample orders with manual order numbers
    const sampleOrders = [
      {
        orderNumber: "ORD-000001", // Manually set order numbers
        customer: {
          name: "Alice Johnson",
          email: "alice@example.com",
          phone: "+1234567890",
          address: {
            street: "123 Main Street",
            city: "New York",
            state: "NY",
            zipCode: "10001",
            country: "USA"
          }
        },
        items: [
          {
            product: products[0]._id,
            quantity: 2,
            price: products[0].price
          },
          {
            product: products[2]._id,
            quantity: 1,
            price: products[2].price
          }
        ],
        shippingCost: 5.99,
        status: "confirmed"
      },
      {
        orderNumber: "ORD-000002",
        customer: {
          name: "Bob Smith",
          email: "bob@example.com",
          phone: "+0987654321",
          address: {
            street: "456 Oak Avenue",
            city: "Los Angeles",
            state: "CA",
            zipCode: "90210",
            country: "USA"
          }
        },
        items: [
          {
            product: products[1]._id,
            quantity: 1,
            price: products[1].price
          }
        ],
        shippingCost: 4.99,
        status: "shipped"
      }
    ];
    
    // Calculate total amounts
    sampleOrders.forEach(order => {
      order.totalAmount = order.items.reduce((total, item) => total + (item.price * item.quantity), 0) + order.shippingCost;
    });
    
    const orders = await Order.insertMany(sampleOrders);
    console.log(`Inserted ${orders.length} orders`);
    
    console.log('Database seeded successfully!');
    
    // Display created data
    console.log('\n📦 Sample Products Created:');
    products.forEach(p => {
      console.log(`- ${p.name} (${p.sku}): $${p.price} - Stock: ${p.stockQuantity}`);
    });
    
    console.log('\n📋 Sample Orders Created:');
    orders.forEach(o => {
      console.log(`- ${o.orderNumber}: ${o.customer.name} - Total: $${o.totalAmount} - Status: ${o.status}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error.message);
    if (error.errors) {
      Object.values(error.errors).forEach(err => {
        console.error(`  - ${err.path}: ${err.message}`);
      });
    }
    process.exit(1);
  }
};

seedDatabase();