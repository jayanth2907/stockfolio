const mongoose = require('mongoose');

const HoldingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  symbol: String,
  name: String,
  shares: Number,
  avgPrice: Number,
  currentPrice: Number,
  totalValue: Number,
  dayChange: Number,
  totalReturn: Number,
  percentReturn: Number
});

module.exports = mongoose.model('Holding', HoldingSchema);