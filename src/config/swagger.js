const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Task management System API',
      version: '1.0.0',
      description: 'Comprehensive API for Task Management',
      contact: {
        name: 'Klizo Team',
        email: 'support@klizo.com',
        url: 'https://klizo.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:8080/api',
        description: 'Development server'
      },
      {
        url: 'http://localhost:5000',
        description: 'Local development server'
      },
      // {
      //   url: 'https://api.klizo.com/api',
      //   description: 'Production server'
      // }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from login endpoint'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          }
        },
       Project: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            ownerId: { type: 'string' },
            members: { type: 'array', items: { type: 'string' } },
            status: { type: 'string', enum: ['active', 'completed', 'archived'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Task: {
          type: 'object',
          properties: {
            projectId: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: ['task', 'story', 'epic', 'subtask'] },
            parentTaskId: { type: 'string' },
            epicId: { type: 'string' },
            status: { type: 'string', enum: ['backlog', 'to_do', 'in_progress', 'done'] },
            assigneeId: { type: 'string' },
            reporterId: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Sprint: {
          type: 'object',
          properties: {
            projectId: { type: 'string' },
            name: { type: 'string' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['planned', 'active', 'completed'] },
            tasks: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Bug: {
          type: 'object',
          properties: {
            projectId: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['new', 'in_progress', 'resolved'] },
            assigneeId: { type: 'string' },
            reporterId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Backlog: {
          type: 'object',
          properties: {
            projectId: { type: 'string' },
            tasks: { type: 'array', items: { type: 'string' } },
            bugs: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Release: {
          type: 'object',
          properties: {
            projectId: { type: 'string' },
            name: { type: 'string' },
            version: { type: 'string' },
            releaseDate: { type: 'string', format: 'date' },
            tasks: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    tags: [
      { name: 'Projects', description: 'Project management' },
      { name: 'Issues', description: 'Epics, Stories, Tasks, Subtasks' },
      { name: 'Sprints', description: 'Sprint planning and task assignment' },
      { name: 'Bugs', description: 'Bug tracking and resolution' },
      { name: 'Backlogs', description: 'Unassigned and pending work' },
      { name: 'Releases', description: 'Software releases and versions' }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/models/*.js',
    './src/app.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs; 