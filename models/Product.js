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
    unique: true,
    uppercase: true,
    sparse: true, // Allow null/undefined for unique constraint
    match: [/^[A-Z0-9-]+$/, 'SKU can only contain letters, numbers, and hyphens']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Beauty', 'Toys', 'Other'],
      message: '{VALUE} is not a valid category'
    }
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
    min: [0, 'Cost cannot be negative'],
    max: [100000, 'Cost cannot exceed 100,000']
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
    trim: true,
    maxlength: [100, 'Supplier name cannot exceed 100 characters']
  },
  weight: {
    type: Number,
    min: [0, 'Weight cannot be negative'],
    max: [1000, 'Weight cannot exceed 1000 kg']
  },
  dimensions: {
    length: {
      type: Number,
      min: [0, 'Length cannot be negative']
    },
    width: {
      type: Number,
      min: [0, 'Width cannot be negative']
    },
    height: {
      type: Number,
      min: [0, 'Height cannot be negative']
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  images: [{
    type: String,
    validate: {
      validator: function(url) {
        // Basic URL validation
        return url && url.length > 0;
      },
      message: 'Image URL cannot be empty'
    }
  }]
}, {
  timestamps: true
});

// Auto-generate SKU before saving
productSchema.pre('save', async function(next) {
  if (this.isNew && (!this.sku || this.sku === 'TEMP-SKU')) {
    try {
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
        { sort: { createdAt: -1 } }
      );
      
      let sequence = 1;
      if (latestProduct && latestProduct.sku) {
        const match = latestProduct.sku.match(new RegExp(`${prefix}-(\\d+)`));
        if (match) {
          sequence = parseInt(match[1]) + 1;
        }
      }
      
      this.sku = `${prefix}-${sequence.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating SKU:', error);
      // Fallback: use timestamp
      const timestamp = Date.now().toString().slice(-6);
      this.sku = `${categoryPrefixes[this.category] || 'OTH'}-${timestamp}`;
    }
  }
  next();
});

// Virtual for profit margin
productSchema.virtual('profitMargin').get(function() {
  if (this.price && this.cost) {
    return ((this.price - this.cost) / this.cost * 100).toFixed(2);
  }
  return 0;
});

// Indexes for better query performance
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ price: 1 });
productSchema.index({ stockQuantity: 1 });

// Transform output to include virtuals and remove version key
productSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Product', productSchema);