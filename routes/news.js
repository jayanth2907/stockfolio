const router = require('express').Router();
const News = require('../models/News');

router.get('/', async (req, res) => {
  try {
    const news = await News.find().sort({ publishedAt: -1 }).limit(5);
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;