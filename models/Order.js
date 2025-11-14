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
    required: true
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

// Generate order number before saving - FIXED VERSION
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    try {
      // Find the latest order to get a sequence number
      const latestOrder = await this.constructor.findOne(
        {}, 
        {}, 
        { sort: { createdAt: -1 } }
      );
      
      let sequence = 1;
      if (latestOrder && latestOrder.orderNumber) {
        const match = latestOrder.orderNumber.match(/ORD-(\d+)/);
        if (match) {
          sequence = parseInt(match[1]) + 1;
        }
      }
      
      this.orderNumber = `ORD-${sequence.toString().padStart(6, '0')}`;
    } catch (error) {
      // Fallback: use timestamp if sequence fails
      const timestamp = Date.now();
      this.orderNumber = `ORD-${timestamp}`;
    }
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);