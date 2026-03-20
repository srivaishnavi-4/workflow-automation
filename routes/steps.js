const express = require('express');
const router = express.Router();
const Step = require('../models/Step');
const Rule = require('../models/Rule');

// PUT /api/steps/:id - Update step
router.put('/:id', async (req, res) => {
  try {
    const { name, step_type, order, metadata } = req.body;
    const step = await Step.findById(req.params.id);
    if (!step) return res.status(404).json({ error: 'Step not found' });

    if (name) step.name = name;
    if (step_type) step.step_type = step_type;
    if (order !== undefined) step.order = order;
    if (metadata !== undefined) step.metadata = metadata;

    await step.save();
    res.json({ success: true, data: step });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/steps/:id
router.delete('/:id', async (req, res) => {
  try {
    const step = await Step.findById(req.params.id);
    if (!step) return res.status(404).json({ error: 'Step not found' });

    await Rule.deleteMany({ step_id: step._id });
    await Step.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Step deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/steps/:step_id/rules - Add rule to step
router.post('/:step_id/rules', async (req, res) => {
  try {
    const { v4: uuidv4 } = require('uuid');
    const Rule = require('../models/Rule');
    const step = await Step.findById(req.params.step_id);
    if (!step) return res.status(404).json({ error: 'Step not found' });

    const { condition, next_step_id, priority } = req.body;
    if (!condition) return res.status(400).json({ error: 'condition is required' });

    const ruleCount = await Rule.countDocuments({ step_id: step._id });
    const rule = new Rule({
      _id: uuidv4(),
      step_id: step._id,
      condition,
      next_step_id: next_step_id || null,
      priority: priority !== undefined ? priority : ruleCount + 1
    });
    await rule.save();
    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/steps/:step_id/rules
router.get('/:step_id/rules', async (req, res) => {
  try {
    const Rule = require('../models/Rule');
    const rules = await Rule.find({ step_id: req.params.step_id }).sort({ priority: 1 });
    res.json({ success: true, data: rules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
