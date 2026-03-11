const router = require('express').Router();
const Holding = require('../models/Holding');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const holdings = await Holding.find({ user: req.userId });
    res.json(holdings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { symbol, name, shares, avgPrice, currentPrice } = req.body;
    const totalValue = shares * currentPrice;
    const totalReturn = totalValue - (shares * avgPrice);
    const percentReturn = (totalReturn / (shares * avgPrice)) * 100;
    const dayChange = 0;

    const newHolding = new Holding({
      user: req.userId,
      symbol,
      name,
      shares,
      avgPrice,
      currentPrice,
      totalValue,
      dayChange,
      totalReturn,
      percentReturn
    });

    await newHolding.save();

    const Portfolio = require('../models/Portfolio');
    const portfolio = await Portfolio.findOne({ user: req.userId });
    if (portfolio) {
      portfolio.holdingsCount += 1;
      portfolio.totalValue += totalValue;
      await portfolio.save();
    }

    res.status(201).json(newHolding);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { shares, avgPrice, currentPrice } = req.body;
    const holding = await Holding.findOne({ _id: req.params.id, user: req.userId });
    if (!holding) return res.status(404).json({ msg: 'Holding not found' });

    const oldTotalValue = holding.totalValue;
    holding.shares = shares || holding.shares;
    holding.avgPrice = avgPrice || holding.avgPrice;
    holding.currentPrice = currentPrice || holding.currentPrice;
    holding.totalValue = holding.shares * holding.currentPrice;
    holding.totalReturn = holding.totalValue - (holding.shares * holding.avgPrice);
    holding.percentReturn = (holding.totalReturn / (holding.shares * holding.avgPrice)) * 100;

    await holding.save();

    const Portfolio = require('../models/Portfolio');
    const portfolio = await Portfolio.findOne({ user: req.userId });
    if (portfolio) {
      portfolio.totalValue = portfolio.totalValue - oldTotalValue + holding.totalValue;
      await portfolio.save();
    }

    res.json(holding);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const holding = await Holding.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!holding) return res.status(404).json({ msg: 'Holding not found' });

    const Portfolio = require('../models/Portfolio');
    const portfolio = await Portfolio.findOne({ user: req.userId });
    if (portfolio) {
      portfolio.holdingsCount -= 1;
      portfolio.totalValue -= holding.totalValue;
      await portfolio.save();
    }

    res.json({ msg: 'Holding deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;