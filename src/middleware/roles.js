const User = require('../models/User');
const logger = require('../utils/logger');

// Check if user has specific role
const checkRole = (...roles) => {
  return async (req, res, next) => {
    try {
      // Try different ways to get userId
      const userId = req.user?.userId || req.user?._id || req.user?.id;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID not found in token'
        });
      }
      
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!roles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }

      req.currentUser = user;
      next();
    } catch (error) {
      logger.error('Role check error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error in role verification'
      });
    }
  };
};

// Check if user has specific permission
const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.hasPermission(permission)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }

      req.currentUser = user;
      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error in permission verification'
      });
    }
  };
};

// Check if user can access specific organization
const checkOrganizationAccess = () => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const organizationId = req.params.organizationId || req.body.organizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID is required'
        });
      }

      // Super admin can access all organizations
      if (user.role === 'super_admin') {
        req.currentUser = user;
        return next();
      }

      // Check if user belongs to the organization
      if (user.organization.toString() !== organizationId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own organization.'
        });
      }

      req.currentUser = user;
      next();
    } catch (error) {
      logger.error('Organization access check error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error in organization access verification'
      });
    }
  };
};

// Check if user can access specific user data
const checkUserAccess = () => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const targetUserId = req.params.userId || req.body.userId;
      
      if (!targetUserId) {
        return res.status(400).json({
          success: false,
          message: 'Target user ID is required'
        });
      }

      // Super admin can access all users
      if (user.role === 'super_admin') {
        req.currentUser = user;
        return next();
      }

      // Check if user can access the target user
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'Target user not found'
        });
      }

      if (!user.canAccessUser(targetUser)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You cannot access this user\'s data.'
        });
      }

      req.currentUser = user;
      req.targetUser = targetUser;
      next();
    } catch (error) {
      logger.error('User access check error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error in user access verification'
      });
    }
  };
};

// Check if user can access team data

module.exports = {
  checkRole,
  checkPermission,
  checkOrganizationAccess,
  checkUserAccess,
}; 