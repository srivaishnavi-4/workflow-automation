/**
 * Rule Engine - Evaluates conditions against input data
 * Supports: ==, !=, <, >, <=, >=, &&, ||, contains(), startsWith(), endsWith(), DEFAULT
 */

function evaluateCondition(condition, data) {
  if (!condition || condition.trim().toUpperCase() === 'DEFAULT') return true;

  try {
    // Build a safe evaluation context
    let expr = condition;

    // Replace string functions with JS equivalents
    expr = expr.replace(/contains\((\w+),\s*['"](.+?)['"]\)/g, (_, field, val) => {
      const fieldVal = data[field];
      if (fieldVal === undefined) return 'false';
      return `"${String(fieldVal).toLowerCase()}".includes("${val.toLowerCase()}")`;
    });

    expr = expr.replace(/startsWith\((\w+),\s*['"](.+?)['"]\)/g, (_, field, val) => {
      const fieldVal = data[field];
      if (fieldVal === undefined) return 'false';
      return `"${String(fieldVal)}".startsWith("${val}")`;
    });

    expr = expr.replace(/endsWith\((\w+),\s*['"](.+?)['"]\)/g, (_, field, val) => {
      const fieldVal = data[field];
      if (fieldVal === undefined) return 'false';
      return `"${String(fieldVal)}".endsWith("${val}")`;
    });

    // Replace field references with actual values
    // Sort keys by length desc to avoid partial replacements
    const keys = Object.keys(data).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      const val = data[key];
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      if (typeof val === 'string') {
        expr = expr.replace(regex, `"${val}"`);
      } else {
        expr = expr.replace(regex, val);
      }
    }

    // Safe eval using Function constructor
    const result = new Function(`"use strict"; return (${expr});`)();
    return Boolean(result);
  } catch (err) {
    console.error('Rule evaluation error:', err.message, 'Condition:', condition);
    return false;
  }
}

/**
 * Find next step based on rules evaluated against input data
 * Returns { nextStepId, matchedRule, evaluatedRules }
 */
async function evaluateRules(rules, data) {
  const evaluatedRules = [];
  let matchedRule = null;

  // Sort by priority ascending (lower = higher priority)
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    const isDefault = rule.condition.trim().toUpperCase() === 'DEFAULT';
    let result = false;

    try {
      result = evaluateCondition(rule.condition, data);
    } catch (e) {
      result = false;
    }

    evaluatedRules.push({
      rule: rule.condition,
      result,
      priority: rule.priority,
      isDefault
    });

    if (result && !matchedRule) {
      matchedRule = rule;
    }
  }

  return {
    nextStepId: matchedRule ? matchedRule.next_step_id : null,
    matchedRule,
    evaluatedRules
  };
}

module.exports = { evaluateCondition, evaluateRules };
