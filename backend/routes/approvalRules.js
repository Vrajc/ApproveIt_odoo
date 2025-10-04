const express = require('express');
const { requireRole } = require('../middleware/roleAuth');
const ApprovalRule = require('../models/ApprovalRule');

const router = express.Router();

// Admin: Create approval rule
router.post('/', requireRole(['admin']), async (req, res) => {
  try {
    const rule = new ApprovalRule({
      ...req.body,
      companyId: req.user.companyId
    });
    await rule.save();
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all approval rules
router.get('/', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const rules = await ApprovalRule.find({ companyId: req.user.companyId });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update approval rule
router.put('/:ruleId', requireRole(['admin']), async (req, res) => {
  try {
    const rule = await ApprovalRule.findByIdAndUpdate(
      req.params.ruleId,
      req.body,
      { new: true }
    );
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Delete approval rule
router.delete('/:ruleId', requireRole(['admin']), async (req, res) => {
  try {
    await ApprovalRule.findByIdAndDelete(req.params.ruleId);
    res.json({ message: 'Approval rule deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
