import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Agent Minder API',
      version: '1.0.0',
      description: 'API documentation for Agent Minder system',
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
      contact: {
        name: 'API Support',
        email: 'support@agentminder.com',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'Default API server',
      },
      {
        url: '/api/v1',
        description: 'Version 1 API server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Agent: {
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'phoneNumber', 'commissionRate'],
          properties: {
            _id: {
              type: 'string',
              description: 'Agent ID',
              example: '60d21b4667d0d8992e610c85',
            },
            firstName: {
              type: 'string',
              description: 'First name of the agent',
              example: 'John',
            },
            lastName: {
              type: 'string',
              description: 'Last name of the agent',
              example: 'Doe',
            },
            email: {
              type: 'string',
              description: 'Email address of the agent',
              example: 'john.doe@example.com',
            },
            phoneNumber: {
              type: 'string',
              description: 'Phone number of the agent',
              example: '+12345678901',
            },
            status: {
              type: 'string',
              description: 'Current status of the agent',
              enum: ['active', 'inactive', 'suspended', 'pending'],
              example: 'active',
            },
            joinDate: {
              type: 'string',
              format: 'date-time',
              description: 'Date when the agent joined',
            },
            commissionRate: {
              type: 'number',
              description: 'Base commission rate percentage',
              example: 10,
            },
            supervisor: {
              type: 'string',
              description: 'Reference to the agent\'s supervisor',
              example: '60d21b4667d0d8992e610c85',
            },
            team: {
              type: 'array',
              description: 'Team members (agents) under this agent',
              items: {
                type: 'string',
              },
            },
            specializations: {
              type: 'array',
              description: 'Areas of specialization',
              items: {
                type: 'string',
              },
              example: ['Residential', 'Commercial'],
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Unauthorized - JWT token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Unauthorized - Invalid token',
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Resource not found',
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation Error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false,
                  },
                  message: {
                    type: 'string',
                    example: 'Validation failed',
                  },
                  errors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: {
                          type: 'string',
                        },
                        message: {
                          type: 'string',
                        },
                      },
                    },
                  },
                },
              },
              example: {
                success: false,
                message: 'Validation failed',
                errors: [
                  {
                    field: 'email',
                    message: 'Email is required',
                  },
                ],
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec; 