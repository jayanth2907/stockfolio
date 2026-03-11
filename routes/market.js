const router = require('express').Router();
const auth = require('../middleware/auth');
const marketData = require('../services/marketData');
const Holding = require('../models/Holding');

router.get('/quote/:symbol', auth, async (req, res) => {
  try {
    const quote = await marketData.getQuote(req.params.symbol);
    res.json(quote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/quotes', auth, async (req, res) => {
  try {
    const { symbols } = req.body;
    const quotes = await marketData.getBatchQuotes(symbols);
    res.json(quotes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/historical/:symbol', auth, async (req, res) => {
  try {
    const { interval, outputSize } = req.query;
    const historical = await marketData.getHistorical(
      req.params.symbol,
      interval || 'daily',
      outputSize || 'compact'
    );
    res.json(historical);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/refresh-holdings', auth, async (req, res) => {
  try {
    const holdings = await Holding.find({ user: req.userId });
    const symbols = holdings.map(h => h.symbol);
    const quotes = await marketData.getBatchQuotes(symbols);

    const updates = holdings.map(holding => {
      const quote = quotes.find(q => q.symbol === holding.symbol);
      if (quote) {
        holding.currentPrice = quote.price;
        holding.dayChange = quote.changePercent;
        holding.totalValue = holding.shares * quote.price;
        holding.totalReturn = holding.totalValue - (holding.shares * holding.avgPrice);
        holding.percentReturn = (holding.totalReturn / (holding.shares * holding.avgPrice)) * 100;
        return holding.save();
      }
    });

    await Promise.all(updates);

    const Portfolio = require('../models/Portfolio');
    const portfolio = await Portfolio.findOne({ user: req.userId });
    if (portfolio) {
      const totalValue = holdings.reduce((sum, h) => sum + h.totalValue, 0);
      portfolio.totalValue = totalValue + portfolio.cash;
      portfolio.totalChange = totalValue - (holdings.reduce((sum, h) => sum + (h.shares * h.avgPrice), 0));
      portfolio.percentChange = (portfolio.totalChange / (portfolio.totalValue - portfolio.totalChange)) * 100;
      portfolio.dailyChange = holdings.reduce((sum, h) => sum + (h.dayChange * h.totalValue / 100), 0);
      await portfolio.save();
    }

    res.json({ success: true, message: 'Holdings refreshed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;