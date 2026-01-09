import { ForexAnalysisResult } from './openai';

type OHLCV = { t: number; open: number; high: number; low: number; close: number; volume?: number };

function sma(values: number[], period: number) {
  const res: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i + 1 < period) {
      res.push(NaN);
      continue;
    }
    let sum = 0;
    for (let j = i + 1 - period; j <= i; j++) sum += values[j];
    res.push(sum / period);
  }
  return res;
}

export function computeRSI(closes: number[], period = 14) {
  const rsi: number[] = [];
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (i <= period) {
      if (diff > 0) gains += diff;
      else losses += Math.abs(diff);
      if (i === period) {
        let avgGain = gains / period;
        let avgLoss = losses / period;
        const first = 100 - 100 / (1 + avgGain / (avgLoss || 1e-9));
        rsi.push(first);
      } else {
        rsi.push(NaN);
      }
    } else {
      const change = closes[i] - closes[i - 1];
      const gain = Math.max(change, 0);
      const loss = Math.max(-change, 0);
      gains = (gains * (period - 1) + gain) / period;
      losses = (losses * (period - 1) + loss) / period;
      const value = 100 - 100 / (1 + gains / (losses || 1e-9));
      rsi.push(value);
    }
  }
  // align length with closes
  rsi.unshift(NaN);
  return rsi;
}

export function bollingerBands(closes: number[], period = 20, stdMult = 2) {
  const ma = sma(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i + 1 < period) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }
    let sumsq = 0;
    for (let j = i + 1 - period; j <= i; j++) {
      const d = closes[j] - ma[i];
      sumsq += d * d;
    }
    const variance = sumsq / period;
    const sd = Math.sqrt(variance);
    upper.push(ma[i] + stdMult * sd);
    lower.push(ma[i] - stdMult * sd);
  }
  return { middle: ma, upper, lower };
}

export function detectTrend(closes: number[]) {
  // simple: slope of 20-period SMA
  const ma = sma(closes, 20);
  const len = ma.length;
  const last = ma[len - 1];
  const prior = ma[len - 6] || ma[len - 2];
  if (!isFinite(last) || !isFinite(prior)) return 'neutral';
  const diff = last - prior;
  const pct = diff / prior;
  if (pct > 0.005) return 'bullish';
  if (pct < -0.005) return 'bearish';
  return 'neutral';
}

export function detectCandlestickPatterns(ohlcv: OHLCV[]) {
  const patterns: string[] = [];
  if (ohlcv.length < 2) return patterns;
  const last = ohlcv[ohlcv.length - 1];
  const prev = ohlcv[ohlcv.length - 2];
  // bullish engulfing
  if (prev.close < prev.open && last.close > last.open && last.close > prev.open && last.open < prev.close) {
    patterns.push('Bullish Engulfing');
  }
  // bearish engulfing
  if (prev.close > prev.open && last.close < last.open && last.open > prev.close && last.close < prev.open) {
    patterns.push('Bearish Engulfing');
  }
  // hammer / shooting star
  const body = Math.abs(last.close - last.open);
  const range = last.high - last.low || 1;
  const upperShadow = last.high - Math.max(last.close, last.open);
  const lowerShadow = Math.min(last.close, last.open) - last.low;
  if (lowerShadow > body * 2 && upperShadow < body) patterns.push('Hammer');
  if (upperShadow > body * 2 && lowerShadow < body) patterns.push('Shooting Star');
  return patterns;
}

export function analyzePriceSeries(ohlcv: OHLCV[], symbol = 'Unknown', timeframe = 'Unknown'): Partial<ForexAnalysisResult> & { qualityScore: number; patterns: string[] } {
  const closes = ohlcv.map(c => c.close);
  const highs = ohlcv.map(c => c.high);
  const lows = ohlcv.map(c => c.low);

  const trend = detectTrend(closes);
  const rsiSeries = computeRSI(closes);
  const lastRsi = rsiSeries[rsiSeries.length - 1] || NaN;
  const bb = bollingerBands(closes);
  const lastUpper = bb.upper[bb.upper.length - 1];
  const lastLower = bb.lower[bb.lower.length - 1];
  const lastMiddle = bb.middle[bb.middle.length - 1];

  const patterns = detectCandlestickPatterns(ohlcv);

  // Entry suggestion: near support/resistance defined by Bollinger bands and recent swings
  const recentHigh = Math.max(...highs.slice(-20));
  const recentLow = Math.min(...lows.slice(-20));
  let entry = (closes[closes.length - 1]).toFixed(5);
  let stopLoss = (recentLow - (recentHigh - recentLow) * 0.02).toFixed(5);
  let takeProfit = [((closes[closes.length - 1]) + (recentHigh - recentLow) * 0.5).toFixed(5)];

  if (trend === 'bullish') {
    entry = lastMiddle ? lastMiddle.toFixed(5) : entry;
    stopLoss = (recentLow - (recentHigh - recentLow) * 0.01).toFixed(5);
    takeProfit = [((closes[closes.length - 1]) + (recentHigh - closes[closes.length - 1]) * 0.6).toFixed(5)];
  } else if (trend === 'bearish') {
    entry = lastMiddle ? lastMiddle.toFixed(5) : entry;
    stopLoss = (recentHigh + (recentHigh - recentLow) * 0.01).toFixed(5);
    takeProfit = [((closes[closes.length - 1]) - (closes[closes.length - 1] - recentLow) * 0.6).toFixed(5)];
  }

  // Overbought / oversold
  const overbought = lastRsi >= 70;
  const oversold = lastRsi <= 30;

  // Quality score heuristic
  let quality = 50;
  if (patterns.length) quality += 10;
  if (trend === 'bullish' && lastRsi < 60) quality += 10;
  if (trend === 'bearish' && lastRsi > 40) quality += 10;
  if (overbought || oversold) quality += 5;
  quality = Math.max(0, Math.min(100, quality));

  return {
    symbol,
    timeframe,
    trend: (trend as 'bullish' | 'bearish' | 'neutral'),
    confidence: Math.round(quality),
    entry,
    stopLoss,
    takeProfit,
    support: recentLow.toFixed(5),
    resistance: recentHigh.toFixed(5),
    momentum: lastRsi && !isNaN(lastRsi) ? `${Math.round(lastRsi)} - ${overbought ? 'Overbought' : oversold ? 'Oversold' : 'Neutral'}` : 'Unknown',
    rsi: lastRsi && !isNaN(lastRsi) ? String(Math.round(lastRsi)) : 'N/A',
    volume: 'N/A',
    reasoning: [
      `Trend detected: ${trend}`,
      patterns.length ? `Candlestick: ${patterns.join(', ')}` : 'No clear candlestick confirmation',
      `RSI: ${lastRsi ? Math.round(lastRsi) : 'N/A'}`,
    ],
    qualityScore: quality,
    patterns,
  };
}

export default {
  analyzePriceSeries,
  computeRSI,
  bollingerBands,
  detectCandlestickPatterns,
  detectTrend,
};
