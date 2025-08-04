# Klizo Attendance Monitoring System - Backend API

A comprehensive Node.js/Express backend for employee attendance monitoring, productivity tracking, and analytics.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Activity Monitoring**: Track user activity, applications, and window titles
- **Screenshot Capture**: Automated screenshot capture with privacy controls
- **Screen Recording**: Video recording with compression and thumbnail generation
- **Analytics**: Comprehensive productivity analytics and reporting
- **Multi-tenant**: Organization-based data isolation
- **Real-time Processing**: Background video compression and analytics
- **API Documentation**: Complete Swagger/OpenAPI documentation

## Prerequisites

- Node.js 18+ 
- MongoDB 5.0+
- Redis 6.0+ (optional, for caching)
- FFmpeg (for video compression)

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

4. **Install FFmpeg** (for video compression)
   - **Windows**: Download from https://ffmpeg.org/download.html
   - **macOS**: `brew install ffmpeg`
   - **Linux**: `sudo apt install ffmpeg`

5. **Start the server**
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
MONGODB_URI=mongodb://localhost:27017/klizo_monitor

# Redis Configuration (Optional)
REDIS_URL=redis://localhost:6379

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002

# File Upload Configuration
MAX_FILE_SIZE=50mb
UPLOAD_PATH=./uploads
```

## API Documentation

### Swagger UI

The API documentation is available through Swagger UI at:

```
http://localhost:3000/api-docs
```

**Features:**
- Interactive API documentation
- Try out endpoints directly from the browser
- Authentication support (JWT Bearer token)
- Request/response examples
- Schema definitions for all data models

### API Endpoints

The API is organized into the following categories:

#### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `POST /refresh` - Refresh JWT token
- `POST /logout` - User logout
- `GET /profile` - Get user profile
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password

#### Monitoring (`/api/monitoring`)
- `POST /activity-logs` - Create activity log
- `GET /activity-logs` - Get activity logs
- `POST /screenshots` - Upload screenshot
- `GET /screenshots` - Get screenshots
- `POST /recordings` - Upload recording
- `GET /recordings` - Get recordings
- `POST /idle-status` - Update idle status

#### Analytics (`/api/analytics`)
- `GET /productivity` - Get productivity analytics
- `GET /trends` - Get productivity trends
- `GET /applications` - Get application usage
- `GET /time-tracking` - Get time tracking data
- `GET /reports` - Generate comprehensive reports

#### Compression (`/api/compression`)
- `GET /status` - Get compression worker status
- `POST /start` - Start compression worker
- `POST /stop` - Stop compression worker
- `POST /retry` - Retry failed compressions
- `POST /cleanup` - Clean up old files

## Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. **Login** to get a token:
   ```bash
   POST /api/auth/login
   {
     "email": "user@example.com",
     "password": "password123"
   }
   ```

2. **Use the token** in subsequent requests:
   ```bash
   Authorization: Bearer <your-jwt-token>
   ```

## Role-Based Access Control

The system supports three user roles:

- **user**: Can view own data and analytics
- **admin**: Can view team and organization data
- **super_admin**: Full system access

## Data Models

### User
- Personal information (name, email, etc.)
- Role and permissions
- Organization association
- Activity tracking

### Organization
- Company information
- Settings and features
- User limits and configurations

### ActivityLog
- Application usage
- Window titles
- Time tracking
- Productivity scoring

### Screenshot
- Image files
- Metadata (application, window title)
- Privacy controls
- Organization isolation

### Recording
- Video files
- Compression status
- Thumbnails
- Quality settings

## File Upload

The system handles file uploads for screenshots and recordings:

- **Screenshots**: JPEG/PNG images (max 50MB)
- **Recordings**: Video files (max 50MB)
- **Automatic compression**: Videos are compressed in the background
- **Organization isolation**: Files are stored per organization

## Analytics

### Productivity Metrics
- Active time vs idle time
- Application usage patterns
- Productivity scoring algorithm
- Trend analysis

### Reporting
- Daily/weekly/monthly reports
- Team and organization analytics
- Export capabilities (JSON, CSV, PDF)
- Real-time dashboards

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
- **File Compression**: Automatic video optimization
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
npm run migrate    # Run database migrations
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

## Monitoring & Logging

The system uses Winston for logging with configurable levels:
- **Error**: Application errors and exceptions
- **Warn**: Warning messages
- **Info**: General information
- **Debug**: Detailed debugging information

## Support

For support and questions:
- **Documentation**: Check the Swagger UI at `/api-docs`
- **Issues**: Create an issue in the repository
- **Email**: support@klizo.com

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

**Note**: This is a monitoring system. Ensure compliance with local privacy laws and obtain proper consent from users before deployment. 