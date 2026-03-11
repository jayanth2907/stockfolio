const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300 });

class MarketDataService {
  constructor() {
    this.provider = process.env.MARKET_PROVIDER || 'alphavantage';
    this.alphaVantageKey = process.env.ALPHA_VANTAGE_KEY;
    this.marketstackKey = process.env.MARKETSTACK_KEY;
  }

  async getQuote(symbol) {
    const cacheKey = `quote_${symbol}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      if (this.provider === 'alphavantage') {
        return await this._alphaVantageQuote(symbol);
      } else {
        return await this._marketstackQuote(symbol);
      }
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error.message);
      return this._getMockQuote(symbol);
    }
  }

  async getHistorical(symbol, interval = 'daily', outputSize = 'compact') {
    const cacheKey = `hist_${symbol}_${interval}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      if (this.provider === 'alphavantage') {
        return await this._alphaVantageHistorical(symbol, interval, outputSize);
      } else {
        return await this._marketstackHistorical(symbol);
      }
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error.message);
      return this._getMockHistorical(symbol);
    }
  }

  async getBatchQuotes(symbols) {
    if (!symbols || symbols.length === 0) return [];
    try {
      if (this.provider === 'alphavantage') {
        const promises = symbols.map(sym => this.getQuote(sym));
        return await Promise.all(promises);
      } else {
        return await this._marketstackBatchQuote(symbols);
      }
    } catch (error) {
      console.error('Error fetching batch quotes:', error);
      return symbols.map(sym => this._getMockQuote(sym));
    }
  }

  // Alpha Vantage
  async _alphaVantageQuote(symbol) {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.alphaVantageKey}`;
    const response = await axios.get(url);
    const data = response.data['Global Quote'];
    if (!data || Object.keys(data).length === 0) throw new Error('No data returned');

    const quote = {
      symbol: data['01. symbol'],
      price: parseFloat(data['05. price']),
      change: parseFloat(data['09. change']),
      changePercent: parseFloat(data['10. change percent'].replace('%', '')),
      volume: parseInt(data['06. volume']),
      latestTradingDay: data['07. latest trading day'],
      previousClose: parseFloat(data['08. previous close'])
    };
    cache.set(`quote_${symbol}`, quote);
    return quote;
  }

  async _alphaVantageHistorical(symbol, interval, outputSize) {
    const function_map = {
      '1min': 'TIME_SERIES_INTRADAY',
      '5min': 'TIME_SERIES_INTRADAY',
      '15min': 'TIME_SERIES_INTRADAY',
      '30min': 'TIME_SERIES_INTRADAY',
      '60min': 'TIME_SERIES_INTRADAY',
      'daily': 'TIME_SERIES_DAILY',
      'weekly': 'TIME_SERIES_WEEKLY',
      'monthly': 'TIME_SERIES_MONTHLY'
    };
    const function_name = function_map[interval] || 'TIME_SERIES_DAILY';
    let url = `https://www.alphavantage.co/query?function=${function_name}&symbol=${symbol}&apikey=${this.alphaVantageKey}&outputsize=${outputSize}`;
    if (interval.includes('min')) url += `&interval=${interval}`;

    const response = await axios.get(url);
    const timeSeriesKey = Object.keys(response.data).find(key => key.includes('Time Series'));
    if (!timeSeriesKey) throw new Error('No historical data');

    const timeSeries = response.data[timeSeriesKey];
    const historical = Object.keys(timeSeries).map(date => ({
      date,
      open: parseFloat(timeSeries[date]['1. open']),
      high: parseFloat(timeSeries[date]['2. high']),
      low: parseFloat(timeSeries[date]['3. low']),
      close: parseFloat(timeSeries[date]['4. close']),
      volume: parseInt(timeSeries[date]['5. volume'])
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    cache.set(`hist_${symbol}_${interval}`, historical);
    return historical;
  }

  // Marketstack
  async _marketstackQuote(symbol) {
    const url = `http://api.marketstack.com/v2/eod/latest?access_key=${this.marketstackKey}&symbols=${symbol}`;
    const response = await axios.get(url);
    if (!response.data.data || response.data.data.length === 0) throw new Error('No data');
    const data = response.data.data[0];
    const quote = {
      symbol: data.symbol,
      price: data.close,
      change: data.close - data.open,
      changePercent: ((data.close - data.open) / data.open) * 100,
      volume: data.volume,
      latestTradingDay: data.date,
      previousClose: data.close
    };
    cache.set(`quote_${symbol}`, quote);
    return quote;
  }

  async _marketstackBatchQuote(symbols) {
    const symbolsStr = symbols.join(',');
    const url = `http://api.marketstack.com/v2/eod/latest?access_key=${this.marketstackKey}&symbols=${symbolsStr}`;
    const response = await axios.get(url);
    return response.data.data.map(data => ({
      symbol: data.symbol,
      price: data.close,
      change: data.close - data.open,
      changePercent: ((data.close - data.open) / data.open) * 100,
      volume: data.volume,
      latestTradingDay: data.date
    }));
  }

  async _marketstackHistorical(symbol) {
    const url = `http://api.marketstack.com/v2/eod?access_key=${this.marketstackKey}&symbols=${symbol}&limit=30`;
    const response = await axios.get(url);
    const historical = response.data.data.map(item => ({
      date: item.date,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
    cache.set(`hist_${symbol}_daily`, historical);
    return historical;
  }

  // Mock fallbacks
  _getMockQuote(symbol) {
    const basePrice = this._getBasePrice(symbol);
    const change = (Math.random() * 4) - 2;
    return {
      symbol,
      price: basePrice + change,
      change,
      changePercent: (change / basePrice) * 100,
      volume: Math.floor(Math.random() * 10000000) + 1000000,
      latestTradingDay: new Date().toISOString().split('T')[0],
      previousClose: basePrice
    };
  }

  _getBasePrice(symbol) {
    const prices = {
      'AAPL': 175.20, 'MSFT': 330.10, 'GOOGL': 2750,
      'TSLA': 950, 'AMZN': 3450, 'META': 485,
      'NVDA': 890, 'JPM': 185, 'V': 275, 'WMT': 168
    };
    return prices[symbol] || 100;
  }

  _getMockHistorical(symbol) {
    const basePrice = this._getBasePrice(symbol);
    const historical = [];
    const today = new Date();
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const randomFactor = 1 + (Math.random() * 0.1) - 0.05;
      const price = basePrice * randomFactor;
      historical.push({
        date: date.toISOString().split('T')[0],
        open: price * 0.99,
        high: price * 1.02,
        low: price * 0.98,
        close: price,
        volume: Math.floor(Math.random() * 10000000) + 1000000
      });
    }
    return historical;
  }
}

module.exports = new MarketDataService();