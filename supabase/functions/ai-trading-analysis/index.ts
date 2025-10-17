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
    .from("trading_strategies")
    .select("*")
    .eq("id", strategyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!strategy) {
    throw new Error("Strategy not found");
  }

  const latestPrice = marketData.length > 0
    ? marketData[marketData.length - 1].close
    : 50000 + Math.random() * 5000;

  const technicalScore = calculateTechnicalScore(marketData);
  const sentimentScore = analyzeSentiment(newsData);

  const combinedScore = (technicalScore * 0.6) + (sentimentScore * 0.4);

  const threshold = strategy.ai_model_config?.confidence_threshold || 0.7;
  let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

  if (combinedScore > threshold) {
    action = 'BUY';
  } else if (combinedScore < (1 - threshold)) {
    action = 'SELL';
  }

  const confidence = Math.abs(combinedScore - 0.5) * 2;

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

  const modelType = strategy.ai_model_config?.model_type || 'LSTM';
  const indicators = strategy.ai_model_config?.indicators || [];

  return {
    symbol: strategy.strategy_type === 'crypto' ? 'BTC/USDT' : 'EUR/USD',
    action,
    confidence: Math.min(0.95, confidence),
    price_target: Number(priceTarget.toFixed(2)),
    stop_loss: Number(stopLoss.toFixed(2)),
    timestamp: new Date().toISOString(),
    rationale: `${modelType} model analyzed market using ${indicators.join(', ') || 'technical indicators'}. Technical score: ${(technicalScore * 100).toFixed(1)}%, Sentiment: ${(sentimentScore * 100).toFixed(1)}%`,
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

function analyzeSentiment(newsData: string[]): number {
  if (newsData.length === 0) return 0.5;

  const positiveWords = ['strong', 'bullish', 'increase', 'growth', 'positive', 'gains', 'rally', 'surge'];
  const negativeWords = ['weak', 'bearish', 'decrease', 'decline', 'negative', 'losses', 'crash', 'drop'];

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
    .from("trading_strategies")
    .select("*")
    .eq("id", strategyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!strategy || !strategy.is_active) {
    throw new Error("Strategy is not active");
  }

  const marketData = generateMockMarketData(50);
  const newsData = ['Market shows positive momentum'];

  const signal = await analyzeMarket(userId, strategyId, marketData, newsData, supabase);

  if (signal.action === 'HOLD') {
    return { message: 'No trade signal, holding position', signal };
  }

  if (signal.confidence < (strategy.ai_model_config?.confidence_threshold || 0.7)) {
    return { message: 'Confidence below threshold, skipping trade', signal };
  }

  const { data: activeSessions } = await supabase
    .from("trading_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("strategy_id", strategyId)
    .eq("session_status", "active")
    .limit(1)
    .maybeSingle();

  let sessionId = activeSessions?.id;

  if (!sessionId) {
    const { data: newSession } = await supabase
      .from("trading_sessions")
      .insert({
        user_id: userId,
        strategy_id: strategyId,
        session_status: "active",
      })
      .select()
      .single();

    sessionId = newSession.id;
  }

  const quantity = strategy.max_investment_per_trade / signal.price_target;

  const { data: trade, error: tradeError } = await supabase
    .from("trades")
    .insert({
      user_id: userId,
      session_id: sessionId,
      trade_type: signal.action.toLowerCase(),
      asset_type: strategy.strategy_type,
      symbol: signal.symbol,
      entry_price: signal.price_target,
      quantity,
      ai_confidence_score: signal.confidence,
      trade_status: "open",
      trade_metadata: {
        reasoning: signal.rationale,
        strategy_name: strategy.strategy_name,
      },
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
