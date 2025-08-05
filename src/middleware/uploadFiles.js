const multer = require('multer');
const path = require('path');

// Set up multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Directory where files will be stored
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix); // Create a unique filename
  },
});

// Create multer upload middleware for multiple files
const uploadFiles = multer({ 
  storage: storage, 
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10MB
}).array('attachments', 10); 

// Export middleware
module.exports = uploadFiles;
