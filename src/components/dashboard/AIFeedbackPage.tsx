import { useState, useEffect } from 'react';
import { Brain, TrendingUp, TrendingDown, Minus, Activity, AlertCircle, BarChart3, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';
import { analyzeTrading } from '../../lib/aiService';

type AIFeedback = Database['public']['Tables']['ai_feedback']['Row'];
type Strategy = Database['public']['Tables']['strategies']['Row'];

export default function AIFeedbackPage() {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<AIFeedback[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedStrategy] = useState<string>('all');
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, selectedStrategy]);

  const fetchData = async () => {
    try {
      setLoading(true);

      let feedbackQuery = supabase
        .from('ai_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (selectedStrategy !== 'all') {
        feedbackQuery = feedbackQuery.eq('strategy_id', selectedStrategy);
      }

      const [feedbackResult, strategiesResult] = await Promise.all([
        feedbackQuery,
        supabase
          .from('strategies')
          .select('*')
          .eq('is_active', true)
      ]);

      if (feedbackResult.error) throw feedbackResult.error;
      if (strategiesResult.error) throw strategiesResult.error;

      setFeedback(feedbackResult.data || []);
      setStrategies(strategiesResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (strategy: Strategy) => {
    if (!user) return;

    setAnalyzing(true);
    try {
      const result = await analyzeTrading(strategy.symbols[0], strategy.id);

      if (result) {
        const { error: insertError } = await supabase.from('ai_feedback').insert({
          user_id: user.id,
          strategy_id: strategy.id,
          feedback_type: 'signal',
          action: result.action,
          symbol: strategy.symbols[0],
          confidence: result.confidence,
          price_target: result.price_target,
          stop_loss: result.stop_loss,
          rationale: result.rationale,
          technical_indicators: result.technical_indicators || {},
          sentiment_analysis: result.sentiment_analysis || {},
        } as any);

        if (!insertError) {
          fetchData();
        }
      }
    } catch (error) {
      console.error('Error analyzing:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toUpperCase()) {
      case 'BUY': return <TrendingUp className="text-green-600" size={20} />;
      case 'SELL': return <TrendingDown className="text-red-600" size={20} />;
      case 'HOLD': return <Minus className="text-gray-600" size={20} />;
      default: return <Activity className="text-blue-600" size={20} />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'BUY': return 'bg-green-50 text-green-700 border-green-200';
      case 'SELL': return 'bg-red-50 text-red-700 border-red-200';
      case 'HOLD': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-600';
    if (confidence >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredFeedback = feedback.filter(item => {
    if (filter === 'all') return true;
    return item.action.toUpperCase() === filter.toUpperCase();
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Trading Insights</h1>
          <p className="text-gray-600 mt-1">Real-time analysis and recommendations from your AI trader</p>
        </div>
        <button
          onClick={() => fetchData()}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={20} className={analyzing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {strategies.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Brain size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Strategies</h3>
          <p className="text-gray-600 mb-6">Create and activate a trading strategy to start receiving AI insights</p>
          <a
            href="#strategies"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Strategy
          </a>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {strategies.slice(0, 3).map((strategy) => (
              <div key={strategy.id} className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{strategy.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {strategy.symbols.slice(0, 2).join(', ')}
                      {strategy.symbols.length > 2 && ` +${strategy.symbols.length - 2}`}
                    </p>
                  </div>
                  <BarChart3 className="text-blue-600" size={24} />
                </div>
                <button
                  onClick={() => handleAnalyze(strategy)}
                  disabled={analyzing}
                  className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  {analyzing ? 'Analyzing...' : 'Run Analysis'}
                </button>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-xl font-semibold text-gray-900">Recent Insights</h2>
                <div className="flex gap-2">
                  {['all', 'buy', 'sell', 'hold'].map((filterOption) => (
                    <button
                      key={filterOption}
                      onClick={() => setFilter(filterOption)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filter === filterOption
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {filteredFeedback.length === 0 ? (
                <div className="p-12 text-center">
                  <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Insights Yet</h3>
                  <p className="text-gray-600">Run an analysis to get AI-powered trading recommendations</p>
                </div>
              ) : (
                filteredFeedback.map((item) => {
                  const strategy = strategies.find(s => s.id === item.strategy_id);
                  const technicalData = item.technical_indicators as any;
                  const sentimentData = item.sentiment_analysis as any;

                  return (
                    <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`p-3 rounded-lg border ${getActionColor(item.action)}`}>
                            {getActionIcon(item.action)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{item.action.toUpperCase()} {item.symbol}</h3>
                              <span className={`text-sm font-medium ${getConfidenceColor(item.confidence)}`}>
                                {(item.confidence * 100).toFixed(0)}% confidence
                              </span>
                            </div>
                            {strategy && (
                              <p className="text-sm text-gray-600 mb-2">Strategy: {strategy.name}</p>
                            )}
                            <p className="text-gray-700">{item.rationale}</p>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
                        {item.price_target && (
                          <div>
                            <p className="text-sm text-gray-600">Price Target</p>
                            <p className="text-lg font-semibold text-gray-900">${item.price_target.toFixed(2)}</p>
                          </div>
                        )}
                        {item.stop_loss && (
                          <div>
                            <p className="text-sm text-gray-600">Stop Loss</p>
                            <p className="text-lg font-semibold text-gray-900">${item.stop_loss.toFixed(2)}</p>
                          </div>
                        )}
                        {technicalData && technicalData.rsi && (
                          <div>
                            <p className="text-sm text-gray-600">RSI</p>
                            <p className="text-lg font-semibold text-gray-900">{technicalData.rsi.toFixed(1)}</p>
                          </div>
                        )}
                        {sentimentData && sentimentData.overall_sentiment && (
                          <div>
                            <p className="text-sm text-gray-600">Sentiment</p>
                            <p className={`text-lg font-semibold capitalize ${
                              sentimentData.overall_sentiment === 'positive' ? 'text-green-600' :
                              sentimentData.overall_sentiment === 'negative' ? 'text-red-600' :
                              'text-gray-600'
                            }`}>
                              {sentimentData.overall_sentiment}
                            </p>
                          </div>
                        )}
                      </div>

                      {technicalData && Object.keys(technicalData).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <details className="cursor-pointer">
                            <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
                              View Technical Analysis
                            </summary>
                            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              {Object.entries(technicalData).map(([key, value]) => (
                                <div key={key} className="bg-gray-50 p-2 rounded">
                                  <p className="text-gray-600 text-xs uppercase">{key.replace('_', ' ')}</p>
                                  <p className="font-medium text-gray-900">
                                    {typeof value === 'number' ? value.toFixed(2) : String(value)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
