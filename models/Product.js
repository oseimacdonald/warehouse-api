const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  sku: {
    type: String,
    // REMOVED: required: true - because it will be auto-generated
    unique: true,
    uppercase: true,
    match: [/^[A-Z0-9-]+$/, 'SKU can only contain letters, numbers, and hyphens']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Beauty', 'Toys', 'Other']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    max: [100000, 'Price cannot exceed 100,000']
  },
  cost: {
    type: Number,
    required: [true, 'Cost is required'],
    min: [0, 'Cost cannot be negative']
  },
  stockQuantity: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock quantity cannot be negative'],
    default: 0
  },
  supplier: {
    type: String,
    required: [true, 'Supplier is required'],
    trim: true
  },
  weight: {
    type: Number,
    min: [0, 'Weight cannot be negative']
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  },
  isActive: {
    type: Boolean,
    default: true
  },
  images: [String]
}, {
  timestamps: true
});

// Auto-generate SKU before saving
productSchema.pre('save', async function(next) {
  if (this.isNew && (!this.sku || this.sku === 'TEMP-SKU')) {
    try {
      // Define category prefixes based on your existing data
      const categoryPrefixes = {
        'Electronics': 'ELE',
        'Clothing': 'CLO', 
        'Sports': 'SPO',
        'Home & Garden': 'HOM',
        'Beauty': 'BEA',
        'Toys': 'TOY',
        'Other': 'OTH'
      };
      
      const prefix = categoryPrefixes[this.category] || 'OTH';
      
      // Find the highest SKU number in this category
      const latestProduct = await this.constructor.findOne(
        { 
          category: this.category,
          sku: { $regex: `^${prefix}-\\d+$` }
        },
        {},
        { sort: { sku: -1 } }
      );
      
      let sequence = 1;
      if (latestProduct && latestProduct.sku) {
        const match = latestProduct.sku.match(new RegExp(`${prefix}-(\\d+)`));
        if (match) {
          sequence = parseInt(match[1]) + 1;
        }
      }
      
      this.sku = `${prefix}-${sequence.toString().padStart(3, '0')}`;
    } catch (error) {
      // Fallback: use timestamp
      const timestamp = Date.now().toString().slice(-6);
      this.sku = `${categoryPrefixes[this.category] || 'OTH'}-${timestamp}`;
    }
  }
  next();
});

// Add pre-validate hook to ensure SKU exists before validation
productSchema.pre('validate', function(next) {
  if (this.isNew && !this.sku) {
    // Set a temporary SKU for validation
    // The real one will be set in pre('save')
    this.sku = 'TEMP-SKU';
  }
  next();
});

// Remove duplicate index definitions - keep only schema indexes
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });

module.exports = mongoose.model('Product', productSchema);