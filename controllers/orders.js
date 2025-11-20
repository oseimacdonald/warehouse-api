const Order = require('../models/Order');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Get all orders with filtering and pagination
const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    
    // Status filter
    if (req.query.status) {
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (validStatuses.includes(req.query.status)) {
        filter.status = req.query.status;
      }
    }
    
    // Customer email filter
    if (req.query.customerEmail) {
      filter['customer.email'] = { $regex: req.query.customerEmail, $options: 'i' };
    }
    
    // Date range filters
    if (req.query.startDate) {
      filter.createdAt = { ...filter.createdAt, $gte: new Date(req.query.startDate) };
    }
    if (req.query.endDate) {
      filter.createdAt = { ...filter.createdAt, $lte: new Date(req.query.endDate) };
    }

    const orders = await Order.find(filter)
      .populate('items.product', 'name sku price images stockQuantity')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
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
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name sku price images stockQuantity category');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order not found with id: ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create new order
const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customer, shippingAddress, items, shippingCost = 0, taxAmount = 0, notes } = req.body;

    // Validate required fields
    const requiredFields = ['customer', 'shippingAddress', 'items'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        errors: missingFields.map(field => `${field} is required`)
      });
    }

    // Validate customer fields
    const customerRequired = ['name', 'email'];
    const customerMissing = customerRequired.filter(field => !customer[field]);
    
    if (customerMissing.length > 0) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'Missing customer information',
        errors: customerMissing.map(field => `customer.${field} is required`)
      });
    }

    // Validate shipping address fields
    const addressRequired = ['street', 'city', 'state', 'zipCode', 'country'];
    const addressMissing = addressRequired.filter(field => !shippingAddress[field]);
    
    if (addressMissing.length > 0) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'Missing shipping address information',
        errors: addressMissing.map(field => `shippingAddress.${field} is required`)
      });
    }

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item',
        errors: ['items array cannot be empty']
      });
    }

    // Process items and calculate totals
    let subtotal = 0;
    const orderItems = [];
    const stockUpdates = [];

    for (const item of items) {
      // Validate item structure
      if (!item.product || !item.quantity) {
        await session.abortTransaction();
        session.endSession();
        
        return res.status(400).json({
          success: false,
          message: 'Invalid item format',
          errors: ['Each item must have product and quantity']
        });
      }

      // Validate MongoDB ID
      if (!mongoose.Types.ObjectId.isValid(item.product)) {
        await session.abortTransaction();
        session.endSession();
        
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID format',
          errors: [`Invalid product ID: ${item.product}`]
        });
      }

      // Check product existence and availability
      const product = await Product.findById(item.product).session(session);
      
      if (!product) {
        await session.abortTransaction();
        session.endSession();
        
        return res.status(400).json({
          success: false,
          message: 'Product not found',
          errors: [`Product with ID ${item.product} not found`]
        });
      }

      if (!product.isActive) {
        await session.abortTransaction();
        session.endSession();
        
        return res.status(400).json({
          success: false,
          message: 'Product not available',
          errors: [`Product "${product.name}" is not active`]
        });
      }

      if (product.stockQuantity < item.quantity) {
        await session.abortTransaction();
        session.endSession();
        
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock',
          errors: [
            `Insufficient stock for "${product.name}". Available: ${product.stockQuantity}, Requested: ${item.quantity}`
          ]
        });
      }

      if (item.quantity < 1) {
        await session.abortTransaction();
        session.endSession();
        
        return res.status(400).json({
          success: false,
          message: 'Invalid quantity',
          errors: [`Quantity for "${product.name}" must be at least 1`]
        });
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: item.product,
        quantity: item.quantity,
        price: product.price
      });

      // Prepare stock update
      stockUpdates.push({
        productId: item.product,
        quantity: -item.quantity
      });
    }

    // Validate numeric fields
    if (shippingCost < 0 || taxAmount < 0) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'Invalid amount',
        errors: ['Shipping cost and tax amount cannot be negative']
      });
    }

    const totalAmount = subtotal + shippingCost + taxAmount;

    // Create order
    const order = new Order({
      customer,
      shippingAddress,
      items: orderItems,
      shippingCost,
      taxAmount,
      subtotal,
      totalAmount,
      notes,
      status: 'pending'
    });

    const savedOrder = await order.save({ session });

    // Update product stock quantities
    for (const update of stockUpdates) {
      await Product.findByIdAndUpdate(
        update.productId,
        { $inc: { stockQuantity: update.quantity } },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    // Populate and return the created order
    const populatedOrder = await Order.findById(savedOrder._id)
      .populate('items.product', 'name sku price images category');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: populatedOrder
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error creating order:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate order number',
        errors: ['Order number already exists']
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
        errors: ['status field is required']
      });
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
        errors: [`Status must be one of: ${validStatuses.join(', ')}`]
      });
    }

    const updateData = { status };
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Add estimated delivery for shipped orders
    if (status === 'shipped') {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 7); // 7 days from now
      updateData.estimatedDelivery = deliveryDate;
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('items.product', 'name sku price');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order not found with id: ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order
    });
  } catch (error) {
    console.error('Error updating order:', error);
    
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
      message: 'Server error while updating order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete order
const deleteOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const order = await Order.findById(req.params.id).session(session);

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(404).json({
        success: false,
        message: `Order not found with id: ${req.params.id}`
      });
    }

    // Only allow deletion of pending or cancelled orders
    if (!['pending', 'cancelled'].includes(order.status)) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'Cannot delete order',
        errors: [`Only pending or cancelled orders can be deleted. Current status: ${order.status}`]
      });
    }

    // Restore product stock quantities
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stockQuantity: item.quantity } },
        { session }
      );
    }

    // Delete the order
    await Order.findByIdAndDelete(req.params.id).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully and stock restored',
      data: {
        id: order._id,
        orderNumber: order.orderNumber,
        customer: order.customer.name,
        totalAmount: order.totalAmount,
        itemsRestored: order.items.length
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder
};