const express = require('express');
const router = express.Router();
const Rule = require('../models/Rule');

// PUT /api/rules/:id
router.put('/:id', async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    const { condition, next_step_id, priority } = req.body;
    if (condition !== undefined) rule.condition = condition;
    if (next_step_id !== undefined) rule.next_step_id = next_step_id || null;
    if (priority !== undefined) rule.priority = priority;

    await rule.save();
    res.json({ success: true, data: rule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/rules/:id
router.delete('/:id', async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    await Rule.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Rule deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
