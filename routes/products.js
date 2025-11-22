const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/products');
const { protect, admin } = require('../middleware/auth'); // ADD THIS LINE

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management endpoints
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

// PUBLIC ROUTES - No authentication required
/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products with filtering and pagination
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [Electronics, Clothing, Home & Garden, Sports, Beauty, Toys, Other]
 *         description: Filter by category
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum price filter
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 *         description: Filter products in stock
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search products by name
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', getAllProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Valid MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid product ID
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id', getProductById);

// PROTECTED ROUTES - Require authentication
/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - category
 *               - price
 *               - cost
 *               - stockQuantity
 *               - supplier
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "Wireless Bluetooth Headphones"
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "Premium noise-cancelling wireless headphones with 30-hour battery life"
 *               category:
 *                 type: string
 *                 enum: [Electronics, Clothing, Home & Garden, Sports, Beauty, Toys, Other]
 *                 example: "Electronics"
 *               price:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 100000
 *                 example: 129.99
 *               cost:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 100000
 *                 example: 65.50
 *               stockQuantity:
 *                 type: integer
 *                 minimum: 0
 *                 example: 75
 *               supplier:
 *                 type: string
 *                 example: "TechCorp Inc"
 *               weight:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 1000
 *                 example: 0.5
 *               dimensions:
 *                 type: object
 *                 properties:
 *                   length:
 *                     type: number
 *                     format: float
 *                     minimum: 0
 *                     example: 20
 *                   width:
 *                     type: number
 *                     format: float
 *                     minimum: 0
 *                     example: 15
 *                   height:
 *                     type: number
 *                     format: float
 *                     minimum: 0
 *                     example: 8
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               missingFields:
 *                 value:
 *                   success: false
 *                   message: "Missing required fields"
 *                   errors: ["name is required", "price is required"]
 *               invalidCategory:
 *                 value:
 *                   success: false
 *                   message: "Invalid category"
 *                   errors: ["Category must be one of: Electronics, Clothing, Home & Garden, Sports, Beauty, Toys, Other"]
 *               negativePrice:
 *                 value:
 *                   success: false
 *                   message: "Validation error"
 *                   errors: ["price must be a positive number"]
 *       401:
 *         description: Not authorized - Authentication required
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', protect, admin, createProduct); // ADD protect, admin middleware

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Valid MongoDB ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               category:
 *                 type: string
 *                 enum: [Electronics, Clothing, Home & Garden, Sports, Beauty, Toys, Other]
 *               price:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 100000
 *               cost:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 100000
 *               stockQuantity:
 *                 type: integer
 *                 minimum: 0
 *               supplier:
 *                 type: string
 *               weight:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 1000
 *               dimensions:
 *                 type: object
 *                 properties:
 *                   length:
 *                     type: number
 *                     format: float
 *                     minimum: 0
 *                   width:
 *                     type: number
 *                     format: float
 *                     minimum: 0
 *                   height:
 *                     type: number
 *                     format: float
 *                     minimum: 0
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authorized - Authentication required
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/:id', protect, admin, updateProduct); // ADD protect, admin middleware

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Valid MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     sku:
 *                       type: string
 *       400:
 *         description: Invalid product ID
 *       401:
 *         description: Not authorized - Authentication required
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/:id', protect, admin, deleteProduct); // ADD protect, admin middleware

module.exports = router;