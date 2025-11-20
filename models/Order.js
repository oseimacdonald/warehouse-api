const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    max: [1000, 'Quantity cannot exceed 1000']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    max: [100000, 'Price cannot exceed 100,000']
  }
}, { _id: false });

const addressSchema = new mongoose.Schema({
  street: {
    type: String,
    required: [true, 'Street address is required'],
    trim: true,
    maxlength: [200, 'Street address cannot exceed 200 characters']
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    maxlength: [100, 'City cannot exceed 100 characters']
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
    maxlength: [100, 'State cannot exceed 100 characters']
  },
  zipCode: {
    type: String,
    required: [true, 'ZIP code is required'],
    trim: true,
    match: [/^[A-Z0-9\s-]{3,10}$/, 'Please enter a valid ZIP code']
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    maxlength: [100, 'Country cannot exceed 100 characters'],
    default: 'USA'
  }
}, { _id: false });

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Customer name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Customer email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    uppercase: true
  },
  customer: {
    type: customerSchema,
    required: [true, 'Customer information is required']
  },
  shippingAddress: {
    type: addressSchema,
    required: [true, 'Shipping address is required']
  },
  items: {
    type: [orderItemSchema],
    required: [true, 'Order items are required'],
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'Order must have at least one item'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      message: '{VALUE} is not a valid order status'
    },
    default: 'pending'
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative'],
    max: [1000000, 'Total amount cannot exceed 1,000,000']
  },
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  },
  shippingCost: {
    type: Number,
    required: [true, 'Shipping cost is required'],
    min: [0, 'Shipping cost cannot be negative'],
    max: [1000, 'Shipping cost cannot exceed 1,000'],
    default: 0
  },
  taxAmount: {
    type: Number,
    min: [0, 'Tax amount cannot be negative'],
    default: 0
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  estimatedDelivery: Date
}, {
  timestamps: true
});

// Pre-validate: Assign temporary order number
orderSchema.pre('validate', function(next) {
  if (this.isNew && !this.orderNumber) {
    this.orderNumber = `TEMP-${Date.now()}`;
  }
  next();
});

// Pre-save: Generate final unique order number
orderSchema.pre('save', async function(next) {
  if (this.isNew && this.orderNumber.startsWith('TEMP-')) {
    try {
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      
      // Check for uniqueness
      let isUnique = false;
      let attempts = 0;
      let finalOrderNumber;
      
      while (!isUnique && attempts < 5) {
        finalOrderNumber = `ORD-${timestamp}-${random}${attempts > 0 ? `-${attempts}` : ''}`;
        const existingOrder = await this.constructor.findOne({ orderNumber: finalOrderNumber });
        if (!existingOrder) {
          isUnique = true;
        }
        attempts++;
      }
      
      this.orderNumber = finalOrderNumber;
    } catch (error) {
      // Fallback order number
      this.orderNumber = `ORD-${Date.now()}`;
    }
  }
  next();
});

// Virtual for order summary
orderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for formatted total
orderSchema.virtual('formattedTotal').get(function() {
  return `$${this.totalAmount.toFixed(2)}`;
});

// Indexes for better performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'customer.email': 1, createdAt: -1 });

// Transform output
orderSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Order', orderSchema);