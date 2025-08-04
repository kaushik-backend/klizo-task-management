const mongoose = require('mongoose');

const releaseSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  name: { type: String, required: true },
  version: { type: String, required: true },
  releaseDate: { type: Date, required: true },
  // tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Release', releaseSchema);
