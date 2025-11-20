const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Warehouse Management API',
      version: '1.0.0',
      description: 'A comprehensive API for managing warehouse products and orders for dropshipping business',
      contact: {
        name: 'API Support',
        email: 'support@warehouse.com',
      },
      license: {
        name: 'MIT',
        url: 'https://spdx.org/licenses/MIT.html',
      },
    },
    servers: [
      {
        url: 'https://warehouse-api-bq02.onrender.com/',
        description: 'Production server',
      },
      {
        url: 'http://localhost:3000/',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        Product: {
          type: 'object',
          required: ['name', 'price', 'category', 'stockQuantity'],
          properties: {
            _id: {
              type: 'string',
              description: 'Auto-generated product ID',
              example: '507f1f77bcf86cd799439011'
            },
            name: {
              type: 'string',
              description: 'Product name',
              example: 'Wireless Bluetooth Headphones'
            },
            description: {
              type: 'string',
              description: 'Product description',
              example: 'Premium noise-cancelling wireless headphones with 30-hour battery life'
            },
            category: {
              type: 'string',
              enum: ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports', 'Toys', 'Health & Beauty'],
              description: 'Product category',
              example: 'Electronics'
            },
            price: {
              type: 'number',
              format: 'float',
              minimum: 0,
              description: 'Product price',
              example: 129.99
            },
            cost: {
              type: 'number',
              format: 'float',
              minimum: 0,
              description: 'Product cost',
              example: 65.50
            },
            stockQuantity: {
              type: 'integer',
              minimum: 0,
              description: 'Available stock quantity',
              example: 75
            },
            sku: {
              type: 'string',
              description: 'Stock Keeping Unit',
              example: 'WBH-2024-PRO'
            },
            supplier: {
              type: 'string',
              description: 'Product supplier',
              example: 'TechCorp Inc'
            },
            weight: {
              type: 'number',
              format: 'float',
              minimum: 0,
              description: 'Product weight in kg',
              example: 0.5
            },
            dimensions: {
              type: 'object',
              properties: {
                length: { type: 'number', minimum: 0 },
                width: { type: 'number', minimum: 0 },
                height: { type: 'number', minimum: 0 }
              }
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the product is active',
              default: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Order: {
          type: 'object',
          required: ['customer', 'items', 'totalAmount', 'status'],
          properties: {
            _id: {
              type: 'string',
              description: 'Auto-generated order ID',
              example: '507f1f77bcf86cd799439012'
            },
            orderNumber: {
              type: 'string',
              description: 'Auto-generated order number',
              example: 'ORD-2024-001'
            },
            customer: {
              type: 'object',
              required: ['name', 'email'],
              properties: {
                name: { type: 'string', example: 'John Doe' },
                email: { type: 'string', format: 'email', example: 'john@example.com' },
                phone: { type: 'string', example: '+1234567890' }
              }
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['product', 'quantity'],
                properties: {
                  product: { 
                    type: 'string', 
                    description: 'Product ID',
                    example: '507f1f77bcf86cd799439011' 
                  },
                  name: { 
                    type: 'string', 
                    description: 'Product name',
                    example: 'Wireless Bluetooth Headphones' 
                  },
                  quantity: { 
                    type: 'integer', 
                    minimum: 1, 
                    example: 2 
                  },
                  price: { 
                    type: 'number', 
                    format: 'float', 
                    minimum: 0, 
                    example: 129.99 
                  }
                }
              }
            },
            totalAmount: {
              type: 'number',
              format: 'float',
              minimum: 0,
              example: 259.98
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
              default: 'pending'
            },
            shippingAddress: {
              type: 'object',
              required: ['street', 'city', 'state', 'zipCode', 'country'],
              properties: {
                street: { type: 'string', example: '123 Main St' },
                city: { type: 'string', example: 'New York' },
                state: { type: 'string', example: 'NY' },
                zipCode: { type: 'string', example: '10001' },
                country: { type: 'string', example: 'USA' }
              }
            },
            notes: {
              type: 'string',
              description: 'Order notes'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message description'
            },
            errors: {
              type: 'array',
              items: {
                type: 'string'
              }
            }
          }
        }
      },
      responses: {
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Product not found'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Validation failed',
                errors: ['Name is required', 'Price must be positive']
              }
            }
          }
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Internal server error'
              }
            }
          }
        }
      }
    }
  },
  apis: ['./routes/*.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

// Add a JSON endpoint for Swagger spec
module.exports = (app) => {
  // Serve Swagger JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "Warehouse API Documentation",
    swaggerOptions: {
      urls: [
        {
          url: '/api-docs.json',
          name: 'Warehouse API v1'
        }
      ]
    }
  }));
};