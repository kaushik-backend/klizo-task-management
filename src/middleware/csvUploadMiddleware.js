const multer = require("multer");
const csvParser = require("csv-parser");
const fs = require("fs");
const path = require("path");

const upload = multer({ dest: "uploads/" }).single("file"); 

const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const issues = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (data) => {
        issues.push(data);
      })
      .on("end", () => {
        fs.unlinkSync(filePath); 
        resolve(issues);
      })
      .on("error", (err) => reject(err));
  });
};

module.exports = { upload, parseCSV };
