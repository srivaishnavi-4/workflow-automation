const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const stepLogSchema = new mongoose.Schema({
  step_id: String,
  step_name: String,
  step_type: String,
  evaluated_rules: [{ rule: String, result: Boolean }],
  selected_next_step: String,
  selected_next_step_id: String,
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped'], default: 'pending' },
  approver_id: String,
  error_message: String,
  started_at: Date,
  ended_at: Date,
}, { _id: false });

const executionSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  workflow_id: { type: String, required: true, ref: 'Workflow' },
  workflow_name: { type: String },
  workflow_version: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'canceled'],
    default: 'pending'
  },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  logs: [stepLogSchema],
  current_step_id: { type: String, default: null },
  retries: { type: Number, default: 0 },
  triggered_by: { type: String, default: 'system' },
  started_at: { type: Date, default: Date.now },
  ended_at: { type: Date, default: null },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  _id: false
});

module.exports = mongoose.model('Execution', executionSchema);
