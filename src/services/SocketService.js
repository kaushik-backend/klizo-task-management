const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const User = require('../models/User');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket
    this.userSockets = new Map(); // socketId -> userId
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000", "http://localhost:3001"],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    logger.info('Socket.IO service initialized');
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.user = user;
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error.message);
        next(new Error('Authentication failed'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const userId = socket.user._id.toString();
      
      logger.info(`User ${userId} connected via Socket.IO`);
      
      // Store socket connection
      this.connectedUsers.set(userId, socket);
      this.userSockets.set(socket.id, userId);

      // Join user to their personal room
      socket.join(`user:${userId}`);
      
      // Join user to organization room
      if (socket.user.organization) {
        socket.join(`org:${socket.user.organization}`);
      }
      
      // Join user to team room if they have a team
      if (socket.user.team) {
        socket.join(`team:${socket.user.team}`);
      }

      // Handle user status updates
      socket.on('update_status', async (data) => {
        try {
          const { status, message } = data;
          await User.findByIdAndUpdate(userId, { 
            status, 
            lastActivity: new Date() 
          });
          
          // Broadcast status update to organization
          this.io.to(`org:${socket.user.organization}`).emit('user_status_changed', {
            userId,
            status,
            message,
            timestamp: new Date()
          });
          
          logger.info(`User ${userId} status updated to: ${status}`);
        } catch (error) {
          logger.error('Error updating user status:', error);
          socket.emit('error', { message: 'Failed to update status' });
        }
      });

      // Handle activity logging
      socket.on('log_activity', async (data) => {
        try {
          const { type, application, windowTitle, productivity } = data;
          
          // Here you would typically save to database
          // For now, just broadcast to organization
          this.io.to(`org:${socket.user.organization}`).emit('activity_logged', {
            userId,
            type,
            application,
            windowTitle,
            productivity,
            timestamp: new Date()
          });
          
          logger.info(`Activity logged for user ${userId}: ${type}`);
        } catch (error) {
          logger.error('Error logging activity:', error);
          socket.emit('error', { message: 'Failed to log activity' });
        }
      });

      // Handle screenshot upload notification
      socket.on('screenshot_uploaded', (data) => {
        const { filePath, fileName, fileSize } = data;
        
        this.io.to(`org:${socket.user.organization}`).emit('screenshot_uploaded', {
          userId,
          filePath,
          fileName,
          fileSize,
          timestamp: new Date()
        });
        
        logger.info(`Screenshot uploaded by user ${userId}: ${fileName}`);
      });

      // Handle recording upload notification
      socket.on('recording_uploaded', (data) => {
        const { filePath, fileName, fileSize, duration } = data;
        
        this.io.to(`org:${socket.user.organization}`).emit('recording_uploaded', {
          userId,
          filePath,
          fileName,
          fileSize,
          duration,
          timestamp: new Date()
        });
        
        logger.info(`Recording uploaded by user ${userId}: ${fileName}`);
      });

      // Handle typing indicators
      socket.on('typing_start', () => {
        socket.to(`org:${socket.user.organization}`).emit('user_typing', {
          userId,
          typing: true
        });
      });

      socket.on('typing_stop', () => {
        socket.to(`org:${socket.user.organization}`).emit('user_typing', {
          userId,
          typing: false
        });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info(`User ${userId} disconnected from Socket.IO`);
        
        // Remove from tracking maps
        this.connectedUsers.delete(userId);
        this.userSockets.delete(socket.id);
        
        // Broadcast user offline status
        this.io.to(`org:${socket.user.organization}`).emit('user_status_changed', {
          userId,
          status: 'offline',
          timestamp: new Date()
        });
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`Socket error for user ${userId}:`, error);
      });
    });
  }

  // Public methods for broadcasting events

  // Broadcast activity update to organization
  broadcastActivityUpdate(organizationId, activityData) {
    this.io.to(`org:${organizationId}`).emit('activity_update', activityData);
  }

  // Broadcast screenshot upload to organization
  broadcastScreenshotUpload(organizationId, screenshotData) {
    this.io.to(`org:${organizationId}`).emit('screenshot_uploaded', screenshotData);
  }

  // Broadcast recording upload to organization
  broadcastRecordingUpload(organizationId, recordingData) {
    this.io.to(`org:${organizationId}`).emit('recording_uploaded', recordingData);
  }

  // Broadcast user status change to organization
  broadcastUserStatusChange(organizationId, statusData) {
    this.io.to(`org:${organizationId}`).emit('user_status_changed', statusData);
  }

  // Send notification to specific user
  sendNotificationToUser(userId, notification) {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.emit('notification', notification);
    }
  }

  // Send notification to organization
  broadcastNotificationToOrganization(organizationId, notification) {
    this.io.to(`org:${organizationId}`).emit('notification', notification);
  }

  // Send system alert to all connected users
  broadcastSystemAlert(alert) {
    this.io.emit('system_alert', alert);
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get connected users for organization
  getConnectedUsersForOrganization(organizationId) {
    const users = [];
    for (const [userId, socket] of this.connectedUsers) {
      if (socket.user.organization?.toString() === organizationId) {
        users.push({
          userId,
          socketId: socket.id,
          status: socket.user.status
        });
      }
    }
    return users;
  }

  // Check if user is connected
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }

  // Get socket for user
  getUserSocket(userId) {
    return this.connectedUsers.get(userId);
  }

  // Disconnect user
  disconnectUser(userId) {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.disconnect();
    }
  }

  // Get server statistics
  getServerStats() {
    return {
      connectedUsers: this.getConnectedUsersCount(),
      totalSockets: this.io.engine.clientsCount,
      uptime: process.uptime()
    };
  }
}

// Create singleton instance
const socketService = new SocketService();

module.exports = socketService; 