const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Workflow = require('../models/Workflow');
const Step = require('../models/Step');
const Rule = require('../models/Rule');

// POST /api/workflows - Create workflow
router.post('/', async (req, res) => {
  try {
    const { name, description, input_schema } = req.body;
    if (!name) return res.status(400).json({ error: 'Workflow name is required' });

    const workflow = new Workflow({
      _id: uuidv4(),
      name,
      description: description || '',
      input_schema: input_schema || {},
      version: 1,
      is_active: true
    });
    await workflow.save();
    res.status(201).json({ success: true, data: workflow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workflows - List all workflows with pagination & search
router.get('/', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10, status } = req.query;
    const query = {};
    if (search) query.name = { $regex: search, $options: 'i' };
    if (status === 'active') query.is_active = true;
    if (status === 'inactive') query.is_active = false;

    const total = await Workflow.countDocuments(query);
    const workflows = await Workflow.find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Attach step count
    const result = await Promise.all(workflows.map(async (wf) => {
      const stepCount = await Step.countDocuments({ workflow_id: wf._id });
      return { ...wf.toObject(), step_count: stepCount };
    }));

    res.json({ success: true, data: result, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workflows/:id - Get workflow with steps & rules
router.get('/:id', async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const steps = await Step.find({ workflow_id: workflow._id }).sort({ order: 1 });
    const stepsWithRules = await Promise.all(steps.map(async (step) => {
      const rules = await Rule.find({ step_id: step._id }).sort({ priority: 1 });
      return { ...step.toObject(), rules };
    }));

    res.json({ success: true, data: { ...workflow.toObject(), steps: stepsWithRules } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/workflows/:id - Update workflow (increments version)
router.put('/:id', async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const { name, description, input_schema, is_active, start_step_id } = req.body;
    if (name) workflow.name = name;
    if (description !== undefined) workflow.description = description;
    if (input_schema !== undefined) workflow.input_schema = input_schema;
    if (is_active !== undefined) workflow.is_active = is_active;
    if (start_step_id !== undefined) workflow.start_step_id = start_step_id;
    workflow.version += 1;

    await workflow.save();
    res.json({ success: true, data: workflow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/workflows/:id
router.delete('/:id', async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const steps = await Step.find({ workflow_id: req.params.id });
    for (const step of steps) {
      await Rule.deleteMany({ step_id: step._id });
    }
    await Step.deleteMany({ workflow_id: req.params.id });
    await Workflow.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Workflow deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workflows/:workflow_id/steps - Add step
router.post('/:workflow_id/steps', async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.workflow_id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const { name, step_type, order, metadata } = req.body;
    if (!name || !step_type) return res.status(400).json({ error: 'name and step_type are required' });

    const stepCount = await Step.countDocuments({ workflow_id: workflow._id });
    const step = new Step({
      _id: uuidv4(),
      workflow_id: workflow._id,
      name,
      step_type,
      order: order !== undefined ? order : stepCount + 1,
      metadata: metadata || {}
    });
    await step.save();

    // Set start_step_id if first step
    if (!workflow.start_step_id || stepCount === 0) {
      workflow.start_step_id = step._id;
      await workflow.save();
    }

    res.status(201).json({ success: true, data: step });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workflows/:workflow_id/steps
router.get('/:workflow_id/steps', async (req, res) => {
  try {
    const steps = await Step.find({ workflow_id: req.params.workflow_id }).sort({ order: 1 });
    const stepsWithRules = await Promise.all(steps.map(async (step) => {
      const rules = await Rule.find({ step_id: step._id }).sort({ priority: 1 });
      return { ...step.toObject(), rules };
    }));
    res.json({ success: true, data: stepsWithRules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workflows/:workflow_id/execute - Execute workflow
router.post('/:workflow_id/execute', async (req, res) => {
  try {
    const Execution = require('../models/Execution');
    const { evaluateRules } = require('../middleware/ruleEngine');

    const workflow = await Workflow.findById(req.params.workflow_id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    if (!workflow.is_active) return res.status(400).json({ error: 'Workflow is not active' });
    if (!workflow.start_step_id) return res.status(400).json({ error: 'Workflow has no steps defined' });

    const { data = {}, triggered_by = 'user' } = req.body;

    // Validate input schema
    const schema = workflow.input_schema || {};
    for (const [field, config] of Object.entries(schema)) {
      if (config.required && (data[field] === undefined || data[field] === '')) {
        return res.status(400).json({ error: `Field '${field}' is required` });
      }
      if (config.allowed_values && data[field] && !config.allowed_values.includes(data[field])) {
        return res.status(400).json({ error: `Field '${field}' must be one of: ${config.allowed_values.join(', ')}` });
      }
    }

    const execution = new Execution({
      _id: uuidv4(),
      workflow_id: workflow._id,
      workflow_name: workflow.name,
      workflow_version: workflow.version,
      status: 'in_progress',
      data,
      triggered_by,
      logs: [],
      current_step_id: workflow.start_step_id,
      started_at: new Date()
    });

    await execution.save();

    // Run execution asynchronously
    runExecution(execution._id, workflow, data).catch(console.error);

    res.status(201).json({ success: true, data: execution, message: 'Execution started' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function runExecution(executionId, workflow, inputData) {
  const Execution = require('../models/Execution');
  const { evaluateRules } = require('../middleware/ruleEngine');

  const MAX_ITERATIONS = 20;
  let iterations = 0;
  let currentStepId = workflow.start_step_id;

  while (currentStepId && iterations < MAX_ITERATIONS) {
    iterations++;
    const execution = await Execution.findById(executionId);
    if (!execution || execution.status === 'canceled') break;

    const step = await Step.findById(currentStepId);
    if (!step) {
      await Execution.findByIdAndUpdate(executionId, {
        status: 'failed',
        ended_at: new Date(),
        $push: { logs: { step_name: 'Unknown', status: 'failed', error_message: `Step ${currentStepId} not found`, started_at: new Date(), ended_at: new Date() } }
      });
      break;
    }

    const stepStarted = new Date();
    const rules = await Rule.find({ step_id: step._id }).sort({ priority: 1 });

    let evalResult = { nextStepId: null, evaluatedRules: [], matchedRule: null };
    let stepStatus = 'completed';
    let errorMsg = null;

    try {
      if (rules.length > 0) {
        evalResult = await evaluateRules(rules, inputData);
        if (!evalResult.matchedRule) {
          stepStatus = 'failed';
          errorMsg = 'No rule matched and no DEFAULT rule defined';
        }
      }
    } catch (e) {
      stepStatus = 'failed';
      errorMsg = e.message;
    }

    const stepEnded = new Date();
    const logEntry = {
      step_id: step._id,
      step_name: step.name,
      step_type: step.step_type,
      evaluated_rules: evalResult.evaluatedRules.map(r => ({ rule: r.rule, result: r.result })),
      selected_next_step: evalResult.matchedRule ? (evalResult.nextStepId ? '→ Next Step' : 'END') : null,
      selected_next_step_id: evalResult.nextStepId,
      status: stepStatus,
      error_message: errorMsg,
      started_at: stepStarted,
      ended_at: stepEnded
    };

    // Try to get next step name
    if (evalResult.nextStepId) {
      const nextStep = await Step.findById(evalResult.nextStepId);
      if (nextStep) logEntry.selected_next_step = nextStep.name;
    } else if (rules.length > 0 && !errorMsg) {
      logEntry.selected_next_step = 'Workflow End';
    }

    currentStepId = evalResult.nextStepId;

    const finalStatus = !currentStepId && stepStatus === 'completed' ? 'completed' :
      stepStatus === 'failed' ? 'failed' : 'in_progress';

    await Execution.findByIdAndUpdate(executionId, {
      $push: { logs: logEntry },
      current_step_id: currentStepId,
      status: finalStatus,
      ...(finalStatus !== 'in_progress' ? { ended_at: new Date() } : {})
    });

    if (stepStatus === 'failed') break;
    if (!currentStepId) break;

    // Small delay to simulate processing
    await new Promise(r => setTimeout(r, 500));
  }

  if (iterations >= MAX_ITERATIONS) {
    await Execution.findByIdAndUpdate(executionId, {
      status: 'failed',
      ended_at: new Date(),
      $push: { logs: { step_name: 'System', status: 'failed', error_message: 'Max iterations reached - possible loop detected', started_at: new Date(), ended_at: new Date() } }
    });
  }
}

module.exports = router;
