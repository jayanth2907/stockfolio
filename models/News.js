const mongoose = require('mongoose');

const NewsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  source: { type: String, required: true },
  publishedAt: { type: Date, required: true },
  url: { type: String },
  sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] }
});

module.exports = mongoose.model('News', NewsSchema);