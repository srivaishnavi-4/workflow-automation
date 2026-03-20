const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const stepSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  workflow_id: { type: String, required: true, ref: 'Workflow' },
  name: { type: String, required: true, trim: true },
  step_type: { type: String, enum: ['task', 'approval', 'notification'], required: true },
  order: { type: Number, default: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  _id: false
});

module.exports = mongoose.model('Step', stepSchema);
