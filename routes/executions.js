const express = require('express');
const router = express.Router();
const Execution = require('../models/Execution');

// GET /api/executions - List all executions (audit log)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, workflow_id } = req.query;
    const query = {};
    if (status) query.status = status;
    if (workflow_id) query.workflow_id = workflow_id;

    const total = await Execution.countDocuments(query);
    const executions = await Execution.find(query)
      .sort({ started_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, data: executions, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/executions/:id
router.get('/:id', async (req, res) => {
  try {
    const execution = await Execution.findById(req.params.id);
    if (!execution) return res.status(404).json({ error: 'Execution not found' });
    res.json({ success: true, data: execution });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/executions/:id/cancel
router.post('/:id/cancel', async (req, res) => {
  try {
    const execution = await Execution.findById(req.params.id);
    if (!execution) return res.status(404).json({ error: 'Execution not found' });
    if (['completed', 'failed', 'canceled'].includes(execution.status)) {
      return res.status(400).json({ error: 'Cannot cancel a finished execution' });
    }
    execution.status = 'canceled';
    execution.ended_at = new Date();
    await execution.save();
    res.json({ success: true, data: execution });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/executions/:id/retry - Retry failed execution
router.post('/:id/retry', async (req, res) => {
  try {
    const Workflow = require('../models/Workflow');
    const Step = require('../models/Step');
    const Rule = require('../models/Rule');
    const { evaluateRules } = require('../middleware/ruleEngine');

    const execution = await Execution.findById(req.params.id);
    if (!execution) return res.status(404).json({ error: 'Execution not found' });
    if (execution.status !== 'failed') return res.status(400).json({ error: 'Only failed executions can be retried' });

    // Find the failed step
    const failedLog = execution.logs.filter(l => l.status === 'failed').pop();
    const retryStepId = failedLog ? failedLog.step_id : execution.current_step_id;

    execution.status = 'in_progress';
    execution.retries += 1;
    execution.ended_at = null;
    execution.current_step_id = retryStepId;
    await execution.save();

    const workflow = await Workflow.findById(execution.workflow_id);

    // Re-run from failed step
    retryFromStep(execution._id, retryStepId, execution.data, workflow).catch(console.error);

    res.json({ success: true, data: execution, message: 'Retry started from failed step' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function retryFromStep(executionId, startStepId, inputData, workflow) {
  const Step = require('../models/Step');
  const Rule = require('../models/Rule');
  const { evaluateRules } = require('../middleware/ruleEngine');

  const MAX_ITERATIONS = 20;
  let iterations = 0;
  let currentStepId = startStepId;

  while (currentStepId && iterations < MAX_ITERATIONS) {
    iterations++;
    const execution = await Execution.findById(executionId);
    if (!execution || execution.status === 'canceled') break;

    const step = await Step.findById(currentStepId);
    if (!step) break;

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
      selected_next_step: evalResult.nextStepId ? 'Next Step' : 'Workflow End',
      selected_next_step_id: evalResult.nextStepId,
      status: stepStatus,
      error_message: errorMsg,
      started_at: stepStarted,
      ended_at: stepEnded
    };

    if (evalResult.nextStepId) {
      const nextStep = await Step.findById(evalResult.nextStepId);
      if (nextStep) logEntry.selected_next_step = nextStep.name;
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
    await new Promise(r => setTimeout(r, 500));
  }
}

module.exports = router;
