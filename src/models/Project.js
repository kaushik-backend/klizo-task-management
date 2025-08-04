const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active',
  },
  backlog: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Backlog',
  }],
  isDeleted:{
    type:Boolean,
    default:false
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// adding indexes
projectSchema.index({status:1});
projectSchema.index({isDeleted:1});
projectSchema.index({ownerId:1});
projectSchema.index({createdAt:1});
projectSchema.index({updatedAt:1});

module.exports = mongoose.model('Project', projectSchema);
