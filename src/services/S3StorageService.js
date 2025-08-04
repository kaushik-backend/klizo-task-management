const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const fs = require('fs');
const { 
  s3Client, 
  s3Config, 
  generateS3Key, 
  generateS3Url,
  uploadToS3,
  deleteFromS3,
  fileExistsInS3,
  getFileMetadata,
  generatePresignedUrl
} = require('../config/s3');
const logger = require('../utils/logger');

class S3StorageService {
  constructor() {
    this.isS3Available = s3Config.bucketName && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
    
    // Debug logging
    logger.info(`S3StorageService Debug - s3Config.bucketName: ${s3Config.bucketName}`);
    logger.info(`S3StorageService Debug - AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Not set'}`);
    logger.info(`S3StorageService Debug - AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Not set'}`);
    logger.info(`S3StorageService Debug - isS3Available: ${this.isS3Available}`);
  }

  // Create multer S3 storage for file uploads
  createS3Storage(folder) {
    if (!this.isS3Available) {
      logger.warn('⚠️ S3 not available, falling back to local storage');
      return this.createLocalStorage(folder);
    }

    return multerS3({
      s3: s3Client,
      bucket: s3Config.bucketName,
      acl: s3Config.acl,
      cacheControl: s3Config.cacheControl,
      contentType: (req, file, cb) => {
        cb(null, s3Config.contentTypes[file.mimetype] || file.mimetype);
      },
      key: (req, file, cb) => {
        const userId = req.user?.userId || req.query.userId || 'unknown';
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        const fileName = `${name}_${timestamp}${ext}`;
        
        const s3Key = generateS3Key(folder, userId, fileName);
        cb(null, s3Key);
      },
      metadata: (req, file, cb) => {
        cb(null, {
          'uploaded-by': 'klizo-system',
          'upload-timestamp': new Date().toISOString(),
          'original-name': file.originalname,
          'user-id': req.user?.userId || req.query.userId || 'unknown'
        });
      }
    });
  }

  // Fallback to local storage
  createLocalStorage(folder) {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        const userId = req.user?.userId || req.query.userId || 'unknown';
        const uploadPath = path.join(__dirname, `../../uploads/${folder}`, userId);
        
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}_${timestamp}${ext}`);
      }
    });
  }

  // Upload file buffer to S3
  async uploadBuffer(buffer, folder, userId, fileName, contentType) {
    if (!this.isS3Available) {
      throw new Error('S3 is not available');
    }

    const s3Key = generateS3Key(folder, userId, fileName);
    await uploadToS3(buffer, s3Key, contentType);
    
    return {
      key: s3Key,
      url: generateS3Url(s3Key),
      size: buffer.length
    };
  }

  // Upload file from local path to S3
  async uploadFile(localPath, folder, userId, fileName) {
    if (!this.isS3Available) {
      throw new Error('S3 is not available');
    }

    const fileBuffer = fs.readFileSync(localPath);
    const contentType = this.getContentType(fileName);
    
    return await this.uploadBuffer(fileBuffer, folder, userId, fileName, contentType);
  }

  // Download file from S3 to local path
  async downloadFile(s3Key, localPath) {
    if (!this.isS3Available) {
      logger.error(`S3 not available. Cannot download file: ${s3Key}`);
      throw new Error('S3 is not available');
    }

    try {
      logger.info(`Attempting to download S3 file: ${s3Key} to ${localPath}`);
      logger.info(`S3 Bucket: ${s3Config.bucketName}`);
      logger.info(`S3 Region: ${s3Config.region}`);
      
      const { GetObjectCommand } = require('@aws-sdk/client-s3');
      
      const command = new GetObjectCommand({
        Bucket: s3Config.bucketName,
        Key: s3Key,
      });
      
      const response = await s3Client.send(command);
      const fileStream = response.Body;
      
      // Ensure directory exists
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
      }
      
      // Write file to local path
      const writeStream = fs.createWriteStream(localPath);
      fileStream.pipe(writeStream);
      
      return new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
          logger.info(`✅ File downloaded from S3: ${s3Key} -> ${localPath}`);
          resolve(localPath);
        });
        writeStream.on('error', (error) => {
          logger.error(`Write stream error: ${error.message}`);
          reject(error);
        });
      });
    } catch (error) {
      logger.error(`❌ Error downloading from S3: ${error.message}`);
      logger.error(`S3 Key: ${s3Key}`);
      logger.error(`Local Path: ${localPath}`);
      logger.error(`Bucket: ${s3Config.bucketName}`);
      throw error;
    }
  }

  // Delete file from S3
  async deleteFile(s3Key) {
    if (!this.isS3Available) {
      throw new Error('S3 is not available');
    }

    await deleteFromS3(s3Key);
  }

  // Check if file exists in S3
  async fileExists(s3Key) {
    if (!this.isS3Available) {
      return false;
    }

    return await fileExistsInS3(s3Key);
  }

  // Get file metadata from S3
  async getFileMetadata(s3Key) {
    if (!this.isS3Available) {
      throw new Error('S3 is not available');
    }

    return await getFileMetadata(s3Key);
  }

  // Generate presigned URL for file access
  async generatePresignedUrl(s3Key, expiresIn = 3600) {
    if (!this.isS3Available) {
      throw new Error('S3 is not available');
    }

    return await generatePresignedUrl(s3Key, expiresIn);
  }

  // Get content type from file extension
  getContentType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.avi': 'video/avi',
      '.mov': 'video/quicktime',
      '.pdf': 'application/pdf'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }

  // Convert local file path to S3 key
  convertLocalPathToS3Key(localPath, folder, userId) {
    const fileName = path.basename(localPath);
    return generateS3Key(folder, userId, fileName);
  }

  // Convert S3 key to local file path
  convertS3KeyToLocalPath(s3Key, baseUploadDir = 'uploads') {
    return path.join(__dirname, `../../${baseUploadDir}`, s3Key);
  }

  // Migrate local files to S3
  async migrateLocalToS3(localPath, folder, userId) {
    if (!this.isS3Available) {
      throw new Error('S3 is not available');
    }

    const fileName = path.basename(localPath);
    const s3Key = generateS3Key(folder, userId, fileName);
    
    // Check if file already exists in S3
    if (await this.fileExists(s3Key)) {
      logger.info(`File already exists in S3: ${s3Key}`);
      return { key: s3Key, url: generateS3Url(s3Key) };
    }
    
    // Upload file to S3
    const result = await this.uploadFile(localPath, folder, userId, fileName);
    
    // Delete local file after successful upload
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      logger.info(`Deleted local file after S3 migration: ${localPath}`);
    }
    
    return result;
  }

  // Get storage statistics
  async getStorageStats() {
    if (!this.isS3Available) {
      return { s3Available: false };
    }

    try {
      const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
      
      const command = new ListObjectsV2Command({
        Bucket: s3Config.bucketName,
        MaxKeys: 1000
      });
      
      const response = await s3Client.send(command);
      
      const stats = {
        s3Available: true,
        totalFiles: response.Contents?.length || 0,
        totalSize: 0,
        folders: {}
      };
      
      if (response.Contents) {
        response.Contents.forEach(obj => {
          stats.totalSize += obj.Size || 0;
          
          const folder = obj.Key.split('/')[0];
          if (!stats.folders[folder]) {
            stats.folders[folder] = { count: 0, size: 0 };
          }
          stats.folders[folder].count++;
          stats.folders[folder].size += obj.Size || 0;
        });
      }
      
      return stats;
    } catch (error) {
      logger.error('Error getting S3 storage stats:', error);
      return { s3Available: false, error: error.message };
    }
  }
}

module.exports = new S3StorageService(); 