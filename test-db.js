require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('🔗 Testing MongoDB connection...');
    console.log('Connection string:', process.env.MONGODB_URI ? 'Found' : 'Missing');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected!');
    console.log('Database:', mongoose.connection.name);
    console.log('Host:', mongoose.connection.host);
    
    // Check if we can see our collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📁 Collections found:');
    collections.forEach(col => {
      console.log(`- ${col.name}`);
    });
    
    // Try to insert a test document
    const testDoc = { 
      name: 'Test Product', 
      sku: 'TEST-999',
      price: 9.99,
      timestamp: new Date() 
    };
    
    const result = await mongoose.connection.db.collection('products').insertOne(testDoc);
    console.log('\n✅ Test document inserted with ID:', result.insertedId);
    
    // Count documents
    const count = await mongoose.connection.db.collection('products').countDocuments();
    console.log(`📊 Total products in collection: ${count}`);
    
    await mongoose.connection.close();
    console.log('\n🎉 Connection test successful!');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Check your MONGODB_URI in .env file');
    console.log('2. Make sure your IP is whitelisted in MongoDB Atlas');
    console.log('3. Verify your username/password in the connection string');
  }
}

testConnection();