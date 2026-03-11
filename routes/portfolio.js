const router = require('express').Router();
const Portfolio = require('../models/Portfolio');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const summary = await Portfolio.findOne({ user: req.userId }).sort({ updatedAt: -1 });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;