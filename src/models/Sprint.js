const mongoose = require('mongoose');

const sprintSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['planned', 'active', 'completed'],
    default: 'planned',
  },
  issues: [  
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  timeLogs: [
  {
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    timeSpent: { type: Number, default:0 }, 
  }
]

});

module.exports = mongoose.model('Sprint', sprintSchema);
