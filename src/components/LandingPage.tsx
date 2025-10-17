import { Bot, Brain, TrendingUp, Shield, Zap, LineChart } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Trading',
      description: 'Advanced machine learning models analyze markets 24/7 to identify profitable opportunities',
    },
    {
      icon: Zap,
      title: 'Automated Execution',
      description: 'Let AI handle all trading decisions while you focus on what matters most',
    },
    {
      icon: Shield,
      title: 'Risk Management',
      description: 'Built-in stop-loss and take-profit mechanisms to protect your capital',
    },
    {
      icon: LineChart,
      title: 'Multi-Asset Support',
      description: 'Trade crypto, forex, and stocks from a single unified platform',
    },
  ];

  const stats = [
    { value: '95%+', label: 'AI Accuracy' },
    { value: '24/7', label: 'Market Monitoring' },
    { value: '<100ms', label: 'Execution Speed' },
    { value: '10+', label: 'Trading Pairs' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <nav className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-2 rounded-lg">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">AI TradePro</span>
          </div>
          <button
            onClick={onGetStarted}
            className="px-6 py-2 bg-white text-blue-900 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Sign In
          </button>
        </div>
      </nav>

      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            AI-Powered Trading
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              On Autopilot
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Connect your wallet and let our advanced AI handle all trading decisions. Sit back while
            machine learning models work 24/7 to maximize your returns.
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-600 text-white text-lg font-semibold rounded-lg hover:from-blue-600 hover:to-cyan-700 transition shadow-xl"
          >
            <span>Start Trading Now</span>
            <TrendingUp className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
              <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
              <div className="text-gray-300 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-xl text-gray-300">Three simple steps to automated trading</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 text-center">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">1</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Connect</h3>
            <p className="text-gray-300">
              Link your crypto wallet and exchange API keys securely to the platform
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 text-center">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">2</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Configure</h3>
            <p className="text-gray-300">
              Set your risk level and trading preferences. AI handles the rest
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 text-center">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">3</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Profit</h3>
            <p className="text-gray-300">
              Watch as AI executes trades automatically based on real-time market analysis
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">Powerful Features</h2>
          <p className="text-xl text-gray-300">Everything you need for automated trading</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="bg-white/10 backdrop-blur-lg rounded-xl p-8">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-12">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Start?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of traders already using AI to maximize their profits
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-blue-900 text-lg font-semibold rounded-lg hover:bg-gray-100 transition shadow-xl"
          >
            <span>Get Started Free</span>
            <TrendingUp className="w-5 h-5" />
          </button>
        </div>
      </section>

      <footer className="container mx-auto px-6 py-8 border-t border-white/10">
        <div className="text-center text-gray-400">
          <p>&copy; 2024 AI TradePro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
