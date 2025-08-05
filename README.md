# Klizo Task Management System - Backend API

A comprehensive Node.js/Express backend for project and task management

## Features

- **Authentication & Authorization**: JWT-based authentication and authorization from base project Attendance Software

- **Project Creation**: User can create project based on his access permission
- **Issue Creation**: User can create Issues of associated project
- **Sprint Creation**: User can create Sprint add issues time log tasks
- **Reporting**: User can get analytical view of efficiency and completion
- **API Documentation**: Complete Swagger/OpenAPI documentation

## Prerequisites

- Node.js 18+ 
- MongoDB 5.0+
- Redis 6.0+ (optional, for caching)
- multer

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the server**
   ```bash
   npm start
   ```

## Environment Variables

Create a `.env` file in the backend directory:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-here

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/task-management

# Redis Configuration (Optional)
REDIS_URL=redis://localhost:6379

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002

# File Upload Configuration
MAX_FILE_SIZE=50mb
MAX_FILE_COUNT=10
UPLOAD_PATH=./uploads
```

## API Documentation

### Swagger UI

The API documentation is available through Swagger UI at:

```
http://localhost:8080/api-docs
```

**Features:**
- Interactive API documentation
- Try out endpoints directly from the browser
- Authentication support from Attednace Software and REST api communication
- Request/response examples
- Schema definitions for all data models

### API Endpoints

The API is organized into the following categories:

#### PROJECT (`/api/projects`)
- `POST /` - Create a new project
- `GET /{id}` - Get specific project by id
- `PUT /{id}` - Update project by id
- `DELETE /{id}` - Soft delete project by id
- `PATCH /{id}` - Add/Remove members from the project
- `GET /{id}` - Get project analytics

#### Issues (`/api/issues`)
- `POST /` - Create a new Issue(task,story,epic,subtask,bug)
- `POST /bulk-create` - Create a new Issue(task,story,epic,subtask,bug)
- `GET /{projectId}` - Get all issues for a specific project
- `PUT /{issueId}` - Update an issue's details
- `DELETE /{issueId}` - Soft delete an issue
- `PUT /{issueId}/status` - Update the status of an issue 

#### Sprints (`/api/sprints`)
- `POST /` - Create a new sprint for a project
- `PUT /add-to-sprint/{issueId}` - Add an issue to a sprint and update its status to to_do
- `PUT /start-sprint/{sprintId}` - Start a sprint
- `POST /end-sprint/{sprintId}` - End a sprint and mark associated issues
- `POST /time-log/stop` - Stop time logging on an issue
- `GET /{sprintId}/issues` - Get isssues of a specific sprint
- `GET /{sprintId}/time-logs` - Get time logs of a specific sprint
- `POST /{sprintId}/time-log/start` - Start time loggin on an issue

## Users (`/api/user`)
- `GET /search-employees` - Search employees by name or email


1. **Login** to get a token: -- fetch access token from attendance software
   ```bash
   POST /api/auth/login
   {
     "email": "kaushik@klizos.com",
     "password": "password123"
   }
   ```

2. **Use the token** in  fetchEmployee service
   ```

## Role-Based Access Control -- will be managed from attendance software

The system supports three user roles:

- **user**: Can view own data and analytics
- **admin**: Can view team and organization data
- **super_admin**: Full system access

## Data Models


## File Upload

The system handles file uploads for issue attachments:

## Analytics

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access**: Granular permissions
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Configurable cross-origin policies
- **Helmet Security**: HTTP security headers
- **File Upload Security**: Type and size validation

## Performance

- **Database Indexing**: Optimized queries
- **Redis Caching**: Optional caching layer
- **Background Processing**: Non-blocking operations
- **Pagination**: Efficient data retrieval

## Development

### Project Structure
```
src/
├── config/          # Configuration files
├── middleware/      # Express middleware
├── models/          # MongoDB models
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Utility functions
└── app.js          # Main application
```

### Available Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run tests
npm run lint       # Run ESLint
```

### Testing
```bash
npm test           # Run all tests
npm run test:unit  # Run unit tests
npm run test:api   # Run API tests
```

## Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure secure JWT secret
- [ ] Set up MongoDB connection string
- [ ] Configure Redis (optional)
- [ ] Set up proper CORS origins
- [ ] Install and configure FFmpeg
- [ ] Set up file storage (local or cloud)
- [ ] Configure logging
- [ ] Set up monitoring and alerts

### Docker Deployment
```bash
# Build image
docker build -t klizo-backend .

# Run container
docker run -p 3000:3000 --env-file .env klizo-backend
```



## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

**Note**: This is a monitoring system. Ensure compliance with local privacy laws and obtain proper consent from users before deployment. 