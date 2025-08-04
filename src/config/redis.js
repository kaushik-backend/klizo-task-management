const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

const connectToRedis = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = redis.createClient({
      url: redisUrl,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          logger.error('Redis server refused connection');
          return new Error('Redis server refused connection');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          logger.error('Redis retry time exhausted');
          return new Error('Redis retry time exhausted');
        }
        if (options.attempt > 10) {
          logger.error('Redis max retry attempts reached');
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis successfully');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('end', () => {
      logger.warn('Redis connection ended');
    });

    await redisClient.connect();
    
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    // Don't exit process, Redis is optional for caching
  }
};

const getRedisClient = () => {
  return redisClient;
};

const disconnectFromRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Disconnected from Redis');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }
};

module.exports = {
  connectToRedis,
  getRedisClient,
  disconnectFromRedis
}; 