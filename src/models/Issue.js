const { required } = require("joi");
const mongoose= require("mongoose");

const IssueSchema = new mongoose.Schema({
 key: {
    type: String,
    unique: true,
    required: true,
  },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, required: true }, // example values ['task', 'story', 'epic', 'subtask', 'bug','feedback'] dynamic for now
  parentTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required:false,default:null },
  epicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue',required:false,default:null },
  status: { type: String, enum: ['backlog', 'to_do', 'in_progress','in_review','in_testing','done'], default: 'backlog' },
  assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  dueDate: { type: Date, required: false },
  labels: [{ type: String }],
  storyPoints: { type: Number, required: false },
  attachments: [{ type: String }],
  votes: { type: Number, default: 0 },
  watchers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  sprintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint' },
  resolution: { type: String, enum: ['Fixed', 'Won\'t Fix', 'Duplicate', 'Incomplete'], required: false },
  resolutionDate: { type: Date, required: false },
  commentCount: { type: Number, default: 0 },
  timeSpent: { type: Number, default: 0 },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: false },
  priorityLevel: { type: String, enum: ['Critical', 'Major', 'Minor']},
  progress: { type: Number, min: 0, max: 100, default: 0 },
   issueNumber: { type: Number, default: 1 },
  isDeleted:{type:Boolean,default:false},
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Issue', IssueSchema);
