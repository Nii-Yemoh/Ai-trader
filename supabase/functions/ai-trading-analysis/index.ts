import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MarketData {
  date: string;
  close: number;
  volume: number;
  high: number;
  low: number;
  open: number;
}

interface AISignal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price_target: number;
  stop_loss: number;
  timestamp: string;
  rationale: string;
  technical_indicators?: any;
  sentiment_analysis?: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const requestBody = await req.json();
    const { action, strategyId, marketData, newsData } = requestBody;

    if (action === "execute_trade") {
      const result = await executeTrade(user.id, strategyId, supabase);
      return new Response(
        JSON.stringify({ success: true, result }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const signal = await analyzeMarket(
      user.id,
      strategyId,
      marketData || [],
      newsData || [],
      supabase
    );

    return new Response(
      JSON.stringify({ success: true, signal }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

async function analyzeMarket(
  userId: string,
  strategyId: string,
  marketData: MarketData[],
  newsData: string[],
  supabase: any
): Promise<AISignal> {
  const { data: strategy } = await supabase
    .from("strategies")
    .select("*")
    .eq("id", strategyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!strategy) {
    throw new Error("Strategy not found");
  }

  const symbol = strategy.symbols && strategy.symbols.length > 0
    ? strategy.symbols[0]
    : 'BTC/USDT';

  const latestPrice = marketData.length > 0
    ? marketData[marketData.length - 1].close
    : 50000 + Math.random() * 5000;

  const technicalScore = calculateTechnicalScore(marketData);
  const sentimentScore = analyzeSentiment(newsData);

  const combinedScore = (technicalScore * 0.6) + (sentimentScore * 0.4);

  const threshold = 0.6;
  let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

  if (combinedScore > threshold) {
    action = 'BUY';
  } else if (combinedScore < (1 - threshold)) {
    action = 'SELL';
  }

  const confidence = Math.min(0.95, Math.abs(combinedScore - 0.5) * 2);

  const volatility = calculateVolatility(marketData);
  const priceTarget = action === 'BUY'
    ? latestPrice * (1 + volatility * 2)
    : action === 'SELL'
    ? latestPrice * (1 - volatility * 2)
    : latestPrice;

  const stopLoss = action === 'BUY'
    ? latestPrice * (1 - strategy.stop_loss_percentage / 100)
    : action === 'SELL'
    ? latestPrice * (1 + strategy.stop_loss_percentage / 100)
    : latestPrice;

  const technicalIndicators = calculateTechnicalIndicators(marketData);
  const sentimentAnalysis = {
    overall_sentiment: combinedScore > 0.6 ? 'positive' : combinedScore < 0.4 ? 'negative' : 'neutral',
    confidence: sentimentScore,
    sources_analyzed: newsData.length
  };

  return {
    symbol,
    action,
    confidence,
    price_target: Number(priceTarget.toFixed(2)),
    stop_loss: Number(stopLoss.toFixed(2)),
    timestamp: new Date().toISOString(),
    rationale: `AI analysis using technical indicators and sentiment. Technical score: ${(technicalScore * 100).toFixed(1)}%, Sentiment: ${sentimentAnalysis.overall_sentiment}. Risk level: ${strategy.risk_level}`,
    technical_indicators: technicalIndicators,
    sentiment_analysis: sentimentAnalysis,
  };
}

function calculateTechnicalScore(marketData: MarketData[]): number {
  if (marketData.length < 2) return 0.5;

  const latestClose = marketData[marketData.length - 1].close;
  const previousClose = marketData[marketData.length - 2].close;

  const priceChange = (latestClose - previousClose) / previousClose;

  const recentPrices = marketData.slice(-20).map(d => d.close);
  const sma = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;

  const trendScore = latestClose > sma ? 0.6 : 0.4;
  const momentumScore = priceChange > 0 ? 0.6 : 0.4;

  return (trendScore + momentumScore) / 2;
}

function calculateTechnicalIndicators(marketData: MarketData[]) {
  if (marketData.length < 14) {
    return {
      rsi: 50,
      sma_20: marketData[marketData.length - 1]?.close || 50000,
      sma_50: marketData[marketData.length - 1]?.close || 50000,
      macd: 0,
      volume_trend: 'neutral'
    };
  }

  const closes = marketData.map(d => d.close);
  const volumes = marketData.map(d => d.volume);

  const rsi = calculateRSI(closes, 14);
  const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const sma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, closes.length);

  const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const latestVolume = volumes[volumes.length - 1];
  const volumeTrend = latestVolume > avgVolume ? 'increasing' : 'decreasing';

  return {
    rsi: Number(rsi.toFixed(2)),
    sma_20: Number(sma20.toFixed(2)),
    sma_50: Number(sma50.toFixed(2)),
    macd: Number(((sma20 - sma50) / sma50 * 100).toFixed(2)),
    volume_trend: volumeTrend
  };
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return rsi;
}

function analyzeSentiment(newsData: string[]): number {
  if (newsData.length === 0) return 0.5;

  const positiveWords = ['strong', 'bullish', 'increase', 'growth', 'positive', 'gains', 'rally', 'surge', 'adoption'];
  const negativeWords = ['weak', 'bearish', 'decrease', 'decline', 'negative', 'losses', 'crash', 'drop', 'fear'];

  let positiveCount = 0;
  let negativeCount = 0;

  newsData.forEach(news => {
    const lowerNews = news.toLowerCase();
    positiveWords.forEach(word => {
      if (lowerNews.includes(word)) positiveCount++;
    });
    negativeWords.forEach(word => {
      if (lowerNews.includes(word)) negativeCount++;
    });
  });

  const total = positiveCount + negativeCount;
  if (total === 0) return 0.5;

  return positiveCount / total;
}

function calculateVolatility(marketData: MarketData[]): number {
  if (marketData.length < 2) return 0.02;

  const returns = [];
  for (let i = 1; i < marketData.length; i++) {
    const ret = (marketData[i].close - marketData[i - 1].close) / marketData[i - 1].close;
    returns.push(ret);
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
}

async function executeTrade(
  userId: string,
  strategyId: string,
  supabase: any
) {
  const { data: strategy } = await supabase
    .from("strategies")
    .select("*")
    .eq("id", strategyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!strategy || !strategy.is_active) {
    throw new Error("Strategy is not active");
  }

  const marketData = generateMockMarketData(50);
  const newsData = ['Market shows positive momentum', 'Institutional adoption increasing'];

  const signal = await analyzeMarket(userId, strategyId, marketData, newsData, supabase);

  if (signal.action === 'HOLD') {
    return { message: 'No trade signal, holding position', signal };
  }

  if (signal.confidence < 0.6) {
    return { message: 'Confidence below threshold, skipping trade', signal };
  }

  const quantity = strategy.max_position_size / signal.price_target;

  const { data: trade, error: tradeError } = await supabase
    .from("trades")
    .insert({
      user_id: userId,
      strategy_id: strategyId,
      symbol: signal.symbol,
      action: signal.action,
      quantity: Number(quantity.toFixed(6)),
      entry_price: signal.price_target,
      status: "pending",
    })
    .select()
    .single();

  if (tradeError) {
    throw tradeError;
  }

  return {
    message: "Trade executed successfully",
    trade,
    signal,
  };
}

function generateMockMarketData(days: number): MarketData[] {
  const data: MarketData[] = [];
  let basePrice = 50000;

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));

    const trend = (i / days) * 5000;
    const noise = (Math.random() - 0.5) * 2000;
    const close = basePrice + trend + noise;

    data.push({
      date: date.toISOString().split('T')[0],
      close: Number(close.toFixed(2)),
      volume: Math.floor(800000 + Math.random() * 1200000),
      high: Number((close + Math.random() * 500).toFixed(2)),
      low: Number((close - Math.random() * 500).toFixed(2)),
      open: Number((close + (Math.random() - 0.5) * 200).toFixed(2)),
    });
  }

  return data;
}
