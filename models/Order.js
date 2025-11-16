const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
  },
  customer: {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Customer email is required'],
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },
  items: [orderItemSchema],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative']
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: [0, 'Shipping cost cannot be negative']
  },
  notes: String
}, {
  timestamps: true
});

// Pre-validate: Assign temporary order number
orderSchema.pre('validate', function(next) {
  if (this.isNew && !this.orderNumber) {
    // Simple temporary ID - will be replaced in pre-save
    this.orderNumber = `TEMP-${Date.now()}`;
  }
  next();
});

// Pre-save: Generate final unique order number using timestamp
orderSchema.pre('save', async function(next) {
  if (this.isNew && this.orderNumber.startsWith('TEMP-')) {
    try {
      // Generate unique order number using timestamp and random component
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      this.orderNumber = `ORD-${timestamp}-${random}`;
    } catch (error) {
      // Fallback: simple timestamp if anything fails
      this.orderNumber = `ORD-${Date.now()}`;
    }
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);