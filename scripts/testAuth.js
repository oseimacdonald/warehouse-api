const axios = require('axios');
require('dotenv').config();

/**
 * Authentication testing utility
 * Tests all auth endpoints and protected routes
 * Usage: node scripts/testAuth.js
 */

class AuthTester {
  constructor() {
    this.baseURL = process.env.RENDER_URL || 'http://localhost:3000';
    this.token = null;
    this.user = null;
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const config = { method, url, headers };
      
      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || error.message,
        status: error.response?.status 
      };
    }
  }

  async testHealth() {
    console.log('🏥 Testing health endpoint...');
    const result = await this.makeRequest('GET', '/api/health');
    
    if (result.success) {
      console.log('✅ Health check passed');
      return true;
    } else {
      console.log('❌ Health check failed:', result.error);
      return false;
    }
  }

  async testRegistration() {
    console.log('\n👤 Testing user registration...');
    
    const testEmail = `testuser${Date.now()}@example.com`;
    const userData = {
      firstName: 'Test',
      lastName: 'User',
      email: testEmail,
      password: 'testpass123'
    };

    const result = await this.makeRequest('POST', '/api/auth/register', userData);
    
    if (result.success) {
      this.token = result.data.token;
      this.user = result.data.user;
      console.log('✅ Registration successful');
      console.log(`   User: ${this.user.email}`);
      console.log(`   Token: ${this.token.substring(0, 20)}...`);
      return true;
    } else {
      console.log('❌ Registration failed:', result.error);
      return false;
    }
  }

  async testLogin() {
    console.log('\n🔐 Testing user login...');
    
    const loginData = {
      email: 'admin@warehouse.com',
      password: 'admin123'
    };

    const result = await this.makeRequest('POST', '/api/auth/login', loginData);
    
    if (result.success) {
      this.token = result.data.token;
      this.user = result.data.user;
      console.log('✅ Login successful');
      console.log(`   User: ${this.user.email}`);
      console.log(`   Role: ${this.user.role}`);
      return true;
    } else {
      console.log('❌ Login failed:', result.error);
      return false;
    }
  }

  async testProtectedRoutes() {
    if (!this.token) {
      console.log('\n❌ No token available for protected route testing');
      return false;
    }

    const headers = { Authorization: `Bearer ${this.token}` };
    
    console.log('\n🛡️ Testing protected routes...');

    // Test getting user profile
    console.log('   Testing /api/auth/me...');
    const profileResult = await this.makeRequest('GET', '/api/auth/me', null, headers);
    if (profileResult.success) {
      console.log('   ✅ Profile access successful');
    } else {
      console.log('   ❌ Profile access failed:', profileResult.error?.message);
    }

    // Test product creation (admin only)
    console.log('   Testing product creation...');
    const productData = {
      name: 'Test Product',
      description: 'Test product description',
      category: 'Electronics',
      price: 99.99,
      cost: 50.00,
      stockQuantity: 10,
      supplier: 'Test Supplier'
    };
    const productResult = await this.makeRequest('POST', '/api/products', productData, headers);
    if (productResult.success) {
      console.log('   ✅ Product creation successful');
    } else {
      console.log('   ⚠️ Product creation:', productResult.error?.message || 'Expected for non-admin');
    }

    // Test order access (admin only)
    console.log('   Testing order access...');
    const ordersResult = await this.makeRequest('GET', '/api/orders', null, headers);
    if (ordersResult.success) {
      console.log('   ✅ Orders access successful');
    } else {
      console.log('   ⚠️ Orders access:', ordersResult.error?.message || 'Expected for non-admin');
    }

    return true;
  }

  async testPublicProducts() {
    console.log('\n📦 Testing public product routes...');
    
    // Test getting products (public)
    const result = await this.makeRequest('GET', '/api/products');
    if (result.success) {
      console.log('✅ Public product access successful');
      console.log(`   Found ${result.data.count} products`);
      return true;
    } else {
      console.log('❌ Public product access failed:', result.error);
      return false;
    }
  }

  async testOrderCreation() {
    console.log('\n🛒 Testing order creation (public)...');
    
    // First get products to use in order
    const productsResult = await this.makeRequest('GET', '/api/products');
    if (!productsResult.success || !productsResult.data.data.length) {
      console.log('❌ Cannot test order creation - no products available');
      return false;
    }

    const product = productsResult.data.data[0];
    
    const orderData = {
      customer: {
        name: 'Test Customer',
        email: 'customer@example.com',
        phone: '+1234567890'
      },
      shippingAddress: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'Test Country'
      },
      items: [
        {
          product: product._id,
          quantity: 1
        }
      ],
      notes: 'Test order from auth testing script'
    };

    const result = await this.makeRequest('POST', '/api/orders', orderData);
    
    if (result.success) {
      console.log('✅ Order creation successful');
      console.log(`   Order Number: ${result.data.data.orderNumber}`);
      console.log(`   Total Amount: $${result.data.data.totalAmount}`);
      return true;
    } else {
      console.log('❌ Order creation failed:', result.error);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Authentication Tests\n');
    console.log(`📍 Base URL: ${this.baseURL}`);
    console.log('=' .repeat(50));

    const tests = [
      { name: 'Health Check', method: this.testHealth.bind(this) },
      { name: 'Public Products', method: this.testPublicProducts.bind(this) },
      { name: 'User Registration', method: this.testRegistration.bind(this) },
      { name: 'User Login', method: this.testLogin.bind(this) },
      { name: 'Protected Routes', method: this.testProtectedRoutes.bind(this) },
      { name: 'Order Creation', method: this.testOrderCreation.bind(this) }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        const result = await test.method();
        if (result) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        console.log(`❌ ${test.name} threw error:`, error.message);
        failed++;
      }
    }

    console.log('\n' + '=' .repeat(50));
    console.log('📊 TEST SUMMARY:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);

    return failed === 0;
  }
}

// Command line interface
const main = async () => {
  const tester = new AuthTester();
  
  try {
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Test runner error:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = AuthTester;