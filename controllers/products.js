const Product = require('../models/Product');
const mongoose = require('mongoose');

// Get all products with filtering and pagination
const getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    
    // Category filter
    if (req.query.category) {
      const validCategories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Beauty', 'Toys', 'Other'];
      if (validCategories.includes(req.query.category)) {
        filter.category = req.query.category;
      }
    }
    
    // Active status filter
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    // Price range filter
    if (req.query.minPrice) {
      filter.price = { $gte: parseFloat(req.query.minPrice) };
    }
    if (req.query.maxPrice) {
      filter.price = { ...filter.price, $lte: parseFloat(req.query.maxPrice) };
    }
    
    // Search by name
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' };
    }

    // In stock filter
    if (req.query.inStock === 'true') {
      filter.stockQuantity = { $gt: 0 };
    }

    const products = await Product.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get product by ID
const getProductById = async (req, res) => {
  try {
    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with id: ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create new product
const createProduct = async (req, res) => {
  try {
    // Validate required fields
    const requiredFields = ['name', 'description', 'category', 'price', 'cost', 'stockQuantity', 'supplier'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        errors: missingFields.map(field => `${field} is required`)
      });
    }

    // Validate category
    const validCategories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Beauty', 'Toys', 'Other'];
    if (!validCategories.includes(req.body.category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category',
        errors: [`Category must be one of: ${validCategories.join(', ')}`]
      });
    }

    // Validate numeric fields
    const numericFields = ['price', 'cost', 'stockQuantity', 'weight'];
    const numericErrors = [];
    
    numericFields.forEach(field => {
      if (req.body[field] !== undefined && (isNaN(req.body[field]) || req.body[field] < 0)) {
        numericErrors.push(`${field} must be a positive number`);
      }
    });
    
    if (numericErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: numericErrors
      });
    }

    // Validate dimensions if provided
    if (req.body.dimensions) {
      const dimensionFields = ['length', 'width', 'height'];
      dimensionFields.forEach(dim => {
        if (req.body.dimensions[dim] !== undefined && req.body.dimensions[dim] < 0) {
          numericErrors.push(`dimensions.${dim} cannot be negative`);
        }
      });
    }

    if (numericErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: numericErrors
      });
    }

    const productData = {
      ...req.body,
      // Ensure SKU is not provided by client - it will be auto-generated
      sku: undefined
    };

    const product = new Product(productData);
    await product.save();
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Error creating product:', error);
    
    // MongoDB duplicate key error (SKU)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists',
        errors: ['A product with this SKU already exists']
      });
    }
    
    // Mongoose validation error
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    // Prevent SKU updates
    if (req.body.sku) {
      return res.status(400).json({
        success: false,
        message: 'SKU cannot be updated',
        errors: ['SKU is auto-generated and cannot be modified']
      });
    }

    // Validate category if provided
    if (req.body.category) {
      const validCategories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Beauty', 'Toys', 'Other'];
      if (!validCategories.includes(req.body.category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category',
          errors: [`Category must be one of: ${validCategories.join(', ')}`]
        });
      }
    }

    // Validate numeric fields
    const numericFields = ['price', 'cost', 'stockQuantity', 'weight'];
    const numericErrors = [];
    
    numericFields.forEach(field => {
      if (req.body[field] !== undefined && (isNaN(req.body[field]) || req.body[field] < 0)) {
        numericErrors.push(`${field} must be a positive number`);
      }
    });
    
    if (numericErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: numericErrors
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with id: ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Error updating product:', error);
    
    // Mongoose validation error
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate SKU',
        errors: ['SKU already exists']
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with id: ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: {
        id: product._id,
        name: product.name,
        sku: product.sku
      }
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};