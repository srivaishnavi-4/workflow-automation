/**
 * seed.js - Populates MongoDB with 2 sample workflows:
 *   1. Expense Approval
 *   2. Employee Onboarding
 *
 * Run: node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow_automation';

// -------- Inline Models (same as app) --------
const workflowSchema = new mongoose.Schema({
  _id: { type: String }, name: String, description: String,
  version: { type: Number, default: 1 }, is_active: { type: Boolean, default: true },
  input_schema: mongoose.Schema.Types.Mixed, start_step_id: { type: String, default: null }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, _id: false });

const stepSchema = new mongoose.Schema({
  _id: { type: String }, workflow_id: String, name: String,
  step_type: String, order: Number, metadata: mongoose.Schema.Types.Mixed
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, _id: false });

const ruleSchema = new mongoose.Schema({
  _id: { type: String }, step_id: String, condition: String,
  next_step_id: { type: String, default: null }, priority: Number
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, _id: false });

const Workflow = mongoose.model('Workflow', workflowSchema);
const Step     = mongoose.model('Step',     stepSchema);
const Rule     = mongoose.model('Rule',     ruleSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Clear existing data
  await Promise.all([Workflow.deleteMany({}), Step.deleteMany({}), Rule.deleteMany({})]);
  console.log('🗑  Cleared existing data');

  // ================================================================
  // WORKFLOW 1: Expense Approval
  // ================================================================
  const wf1Id = uuidv4();

  const s1Id = uuidv4(); // Manager Approval
  const s2Id = uuidv4(); // Finance Notification
  const s3Id = uuidv4(); // CEO Approval
  const s4Id = uuidv4(); // Task Rejection (terminal)

  await Workflow.create({
    _id: wf1Id,
    name: 'Expense Approval',
    description: 'Multi-level expense approval workflow with manager, finance, and CEO approval steps.',
    version: 1,
    is_active: true,
    start_step_id: s1Id,
    input_schema: {
      amount:     { type: 'number', required: true },
      country:    { type: 'string', required: true },
      department: { type: 'string', required: false },
      priority:   { type: 'string', required: true, allowed_values: ['High', 'Medium', 'Low'] }
    }
  });

  await Step.create([
    { _id: s1Id, workflow_id: wf1Id, name: 'Manager Approval',      step_type: 'approval',      order: 1, metadata: { assignee_email: 'manager@example.com',  instructions: 'Review and approve expense request' } },
    { _id: s2Id, workflow_id: wf1Id, name: 'Finance Notification',   step_type: 'notification',  order: 2, metadata: { assignee_email: 'finance@example.com',   notification_channel: 'email' } },
    { _id: s3Id, workflow_id: wf1Id, name: 'CEO Approval',           step_type: 'approval',      order: 3, metadata: { assignee_email: 'ceo@example.com',       instructions: 'Final approval for high-value expenses' } },
    { _id: s4Id, workflow_id: wf1Id, name: 'Task Rejection',         step_type: 'task',          order: 4, metadata: { instructions: 'Notify requester of rejection and close the task' } }
  ]);

  // Rules for Manager Approval (s1)
  await Rule.create([
    { _id: uuidv4(), step_id: s1Id, condition: "amount > 100 && country == 'US' && priority == 'High'", next_step_id: s2Id, priority: 1 },
    { _id: uuidv4(), step_id: s1Id, condition: "amount <= 100 || department == 'HR'",                    next_step_id: s3Id, priority: 2 },
    { _id: uuidv4(), step_id: s1Id, condition: "priority == 'Low' && country != 'US'",                   next_step_id: s4Id, priority: 3 },
    { _id: uuidv4(), step_id: s1Id, condition: 'DEFAULT',                                                next_step_id: s4Id, priority: 4 }
  ]);

  // Rules for Finance Notification (s2)
  await Rule.create([
    { _id: uuidv4(), step_id: s2Id, condition: "amount > 500 && priority == 'High'", next_step_id: s3Id,  priority: 1 },
    { _id: uuidv4(), step_id: s2Id, condition: 'DEFAULT',                             next_step_id: null,  priority: 2 }
  ]);

  // Rules for CEO Approval (s3)
  await Rule.create([
    { _id: uuidv4(), step_id: s3Id, condition: 'DEFAULT', next_step_id: null, priority: 1 }
  ]);

  // Task Rejection has no rules (terminal)
  console.log('✅ Workflow 1: Expense Approval created');

  // ================================================================
  // WORKFLOW 2: Employee Onboarding
  // ================================================================
  const wf2Id = uuidv4();

  const e1Id = uuidv4(); // HR Notification
  const e2Id = uuidv4(); // IT Setup Task
  const e3Id = uuidv4(); // Manager Welcome
  const e4Id = uuidv4(); // Compliance Training

  await Workflow.create({
    _id: wf2Id,
    name: 'Employee Onboarding',
    description: 'New employee onboarding process covering IT setup, HR notification, and compliance training.',
    version: 1,
    is_active: true,
    start_step_id: e1Id,
    input_schema: {
      employee_name: { type: 'string',  required: true },
      department:    { type: 'string',  required: true, allowed_values: ['Engineering', 'Marketing', 'HR', 'Finance', 'Sales'] },
      role:          { type: 'string',  required: true },
      start_date:    { type: 'string',  required: true },
      is_remote:     { type: 'string',  required: true, allowed_values: ['Yes', 'No'] }
    }
  });

  await Step.create([
    { _id: e1Id, workflow_id: wf2Id, name: 'HR Notification',     step_type: 'notification', order: 1, metadata: { assignee_email: 'hr@company.com',      instructions: 'Notify HR team about new employee' } },
    { _id: e2Id, workflow_id: wf2Id, name: 'IT Setup',            step_type: 'task',         order: 2, metadata: { assignee_email: 'it@company.com',      instructions: 'Setup laptop, email, and system access' } },
    { _id: e3Id, workflow_id: wf2Id, name: 'Manager Welcome',     step_type: 'approval',     order: 3, metadata: { assignee_email: 'manager@company.com', instructions: 'Send welcome email and confirm onboarding' } },
    { _id: e4Id, workflow_id: wf2Id, name: 'Compliance Training', step_type: 'task',         order: 4, metadata: { instructions: 'Assign compliance and security training modules' } }
  ]);

  // Rules for HR Notification (e1)
  await Rule.create([
    { _id: uuidv4(), step_id: e1Id, condition: 'DEFAULT', next_step_id: e2Id, priority: 1 }
  ]);

  // Rules for IT Setup (e2)
  await Rule.create([
    { _id: uuidv4(), step_id: e2Id, condition: "is_remote == 'Yes'",  next_step_id: e3Id, priority: 1 },
    { _id: uuidv4(), step_id: e2Id, condition: "department == 'Engineering'", next_step_id: e3Id, priority: 2 },
    { _id: uuidv4(), step_id: e2Id, condition: 'DEFAULT',              next_step_id: e3Id, priority: 3 }
  ]);

  // Rules for Manager Welcome (e3)
  await Rule.create([
    { _id: uuidv4(), step_id: e3Id, condition: "department == 'Engineering' || department == 'Finance'", next_step_id: e4Id, priority: 1 },
    { _id: uuidv4(), step_id: e3Id, condition: 'DEFAULT', next_step_id: null, priority: 2 }
  ]);

  // e4 Compliance Training is terminal
  console.log('✅ Workflow 2: Employee Onboarding created');

  console.log('\n🎉 Seed complete! Sample workflows:');
  console.log('  1. Expense Approval  - 4 steps, 8 rules');
  console.log('  2. Employee Onboarding - 4 steps, 6 rules');
  console.log('\nSample execution input for Expense Approval:');
  console.log(JSON.stringify({ amount: 250, country: 'US', department: 'Finance', priority: 'High' }, null, 2));

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
