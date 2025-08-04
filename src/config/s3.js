const { S3Client } = require('@aws-sdk/client-s3');
const logger = require('../utils/logger');

// S3 Client configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// S3 Configuration
const s3Config = {
  bucketName: process.env.AWS_S3_BUCKET_NAME,
  region: process.env.AWS_REGION || 'us-east-1',
  baseUrl: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`,
  
  // Folder structure
  folders: {
    screenshots: 'screenshots',
    recordings: 'recordings',
    thumbnails: 'thumbnails',
    compressed: 'compressed'
  },
  
  // File access settings
  acl: 'private', // or 'public-read' for public access
  
  // Cache control
  cacheControl: 'max-age=31536000', // 1 year
  
  // Content types
  contentTypes: {
    'image/png': 'image/png',
    'image/jpeg': 'image/jpeg',
    'image/jpg': 'image/jpeg',
    'video/mp4': 'video/mp4',
    'video/webm': 'video/webm',
    'video/avi': 'video/avi',
    'video/mov': 'video/quicktime'
  }
};

// Validate S3 configuration
const validateS3Config = () => {
  const requiredEnvVars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_BUCKET_NAME'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.warn(`⚠️ Missing AWS S3 environment variables: ${missingVars.join(', ')}`);
    logger.warn('📁 File uploads will fall back to local storage');
    return false;
  }
  
  logger.info('✅ AWS S3 configuration validated');
  return true;
};

// Generate S3 key for file
const generateS3Key = (folder, userId, fileName, subfolder = null) => {
  const parts = [folder, userId];
  
  if (subfolder) {
    parts.push(subfolder);
  }
  
  parts.push(fileName);
  
  return parts.join('/');
};

// Generate S3 URL
const generateS3Url = (key) => {
  return `${s3Config.baseUrl}/${key}`;
};

// Generate presigned URL for file access
const generatePresignedUrl = async (key, expiresIn = 3600) => {
  try {
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    
    const command = new GetObjectCommand({
      Bucket: s3Config.bucketName,
      Key: key,
    });
    
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return presignedUrl;
  } catch (error) {
    logger.error('Error generating presigned URL:', error);
    throw error;
  }
};

// Upload file to S3
const uploadToS3 = async (fileBuffer, key, contentType) => {
  try {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    
    const command = new PutObjectCommand({
      Bucket: s3Config.bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      ACL: s3Config.acl,
      CacheControl: s3Config.cacheControl,
      Metadata: {
        'uploaded-by': 'klizo-system',
        'upload-timestamp': new Date().toISOString()
      }
    });
    
    const result = await s3Client.send(command);
    logger.info(`✅ File uploaded to S3: ${key}`);
    return result;
  } catch (error) {
    logger.error(`❌ Error uploading to S3: ${error.message}`);
    throw error;
  }
};

// Delete file from S3
const deleteFromS3 = async (key) => {
  try {
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    
    const command = new DeleteObjectCommand({
      Bucket: s3Config.bucketName,
      Key: key,
    });
    
    const result = await s3Client.send(command);
    logger.info(`✅ File deleted from S3: ${key}`);
    return result;
  } catch (error) {
    logger.error(`❌ Error deleting from S3: ${error.message}`);
    throw error;
  }
};

// Check if file exists in S3
const fileExistsInS3 = async (key) => {
  try {
    const { HeadObjectCommand } = require('@aws-sdk/client-s3');
    
    const command = new HeadObjectCommand({
      Bucket: s3Config.bucketName,
      Key: key,
    });
    
    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
};

// Get file metadata from S3
const getFileMetadata = async (key) => {
  try {
    const { HeadObjectCommand } = require('@aws-sdk/client-s3');
    
    const command = new HeadObjectCommand({
      Bucket: s3Config.bucketName,
      Key: key,
    });
    
    const result = await s3Client.send(command);
    return {
      size: result.ContentLength,
      contentType: result.ContentType,
      lastModified: result.LastModified,
      etag: result.ETag
    };
  } catch (error) {
    logger.error(`❌ Error getting file metadata: ${error.message}`);
    throw error;
  }
};

module.exports = {
  s3Client,
  s3Config,
  validateS3Config,
  generateS3Key,
  generateS3Url,
  generatePresignedUrl,
  uploadToS3,
  deleteFromS3,
  fileExistsInS3,
  getFileMetadata
}; 