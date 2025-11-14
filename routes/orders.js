const express = require('express');
const router = express.Router();
const {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder
} = require('../controllers/orders');

// GET /api/orders - Get all orders
router.get('/', getAllOrders);

// GET /api/orders/:id - Get single order
router.get('/:id', getOrderById);

// POST /api/orders - Create new order
router.post('/', createOrder);

// PUT /api/orders/:id - Update order status
router.put('/:id', updateOrderStatus);

// DELETE /api/orders/:id - Delete order
router.delete('/:id', deleteOrder);

module.exports = router;