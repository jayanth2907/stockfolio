const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('./models/User');
const Portfolio = require('./models/Portfolio');
const Holding = require('./models/Holding');
const News = require('./models/News');

const seedData = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await User.deleteMany();
  await Portfolio.deleteMany();
  await Holding.deleteMany();
  await News.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await User.create({
    name: 'Test User',
    email: 'test@example.com',
    password: hashedPassword
  });

  await Portfolio.create({
    user: user._id,
    totalValue: 124567.89,
    totalChange: 2345.67,
    percentChange: 1.92,
    dailyChange: 123.45,
    holdingsCount: 12,
    cash: 25000
  });

  await Holding.insertMany([
    { user: user._id, symbol: 'AAPL', name: 'Apple Inc.', shares: 50, avgPrice: 145.30, currentPrice: 175.20, totalValue: 8760, dayChange: 1.2, totalReturn: 1495, percentReturn: 20.6 },
    { user: user._id, symbol: 'MSFT', name: 'Microsoft', shares: 30, avgPrice: 280.50, currentPrice: 330.10, totalValue: 9903, dayChange: 0.8, totalReturn: 1488, percentReturn: 17.7 },
    { user: user._id, symbol: 'GOOGL', name: 'Alphabet', shares: 20, avgPrice: 2500, currentPrice: 2750, totalValue: 55000, dayChange: -0.3, totalReturn: 5000, percentReturn: 10 },
    { user: user._id, symbol: 'TSLA', name: 'Tesla', shares: 15, avgPrice: 800, currentPrice: 950, totalValue: 14250, dayChange: 3.5, totalReturn: 2250, percentReturn: 18.75 },
    { user: user._id, symbol: 'AMZN', name: 'Amazon', shares: 10, avgPrice: 3200, currentPrice: 3450, totalValue: 34500, dayChange: 1.1, totalReturn: 2500, percentReturn: 7.8 }
  ]);

  await News.insertMany([
    { title: 'Fed signals rate cuts ahead', source: 'Bloomberg', publishedAt: new Date(), sentiment: 'positive' },
    { title: 'Tech stocks rally on AI optimism', source: 'Reuters', publishedAt: new Date(), sentiment: 'positive' },
    { title: 'Inflation data beats expectations', source: 'WSJ', publishedAt: new Date(), sentiment: 'neutral' }
  ]);

  console.log('Data seeded successfully');
  mongoose.connection.close();
};

seedData();