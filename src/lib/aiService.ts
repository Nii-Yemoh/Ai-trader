import { supabase } from './supabase';

export interface MarketData {
  date: string;
  close: number;
  volume: number;
  high: number;
  low: number;
  open: number;
}

export interface AISignal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price_target: number;
  stop_loss: number;
  timestamp: string;
  rationale: string;
}

export async function analyzeMarketWithAI(
  strategyId: string,
  marketData: MarketData[],
  newsData?: string[]
): Promise<AISignal> {
  const { data, error } = await supabase.functions.invoke('ai-trading-analysis', {
    body: {
      strategyId,
      marketData,
      newsData: newsData || [],
    },
  });

  if (error) throw error;
  return data.signal;
}

export async function executeTrade(strategyId: string): Promise<any> {
  const { data, error } = await supabase.functions.invoke('ai-trading-analysis', {
    body: {
      action: 'execute_trade',
      strategyId,
    },
  });

  if (error) throw error;
  return data;
}

export function generateMockMarketData(days: number = 50): MarketData[] {
  const data: MarketData[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let basePrice = 50000;

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const trend = (i / days) * 5000;
    const noise = (Math.random() - 0.5) * 2000;
    const close = basePrice + trend + noise;

    const high = close + Math.random() * 500;
    const low = close - Math.random() * 500;
    const open = close + (Math.random() - 0.5) * 200;
    const volume = Math.floor(800000 + Math.random() * 1200000);

    data.push({
      date: date.toISOString().split('T')[0],
      close: Number(close.toFixed(2)),
      volume,
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      open: Number(open.toFixed(2)),
    });
  }

  return data;
}

export const sampleNewsData = [
  'Bitcoin shows strong momentum as institutional adoption increases',
  'Federal Reserve hints at potential interest rate adjustments',
  'Crypto market sentiment remains bullish amid regulatory clarity',
  'Major exchanges report record trading volumes',
];
