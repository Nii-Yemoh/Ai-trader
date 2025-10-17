from main import AITradingSystem
import pandas as pd
import numpy as np

if __name__ == "__main__":
    config = {'symbol': 'AAPL'}
    
    try:
        ai = AITradingSystem(config)
        print("✅ AI Trading System initialized successfully!")

        # Generate sufficient market data (50+ points for proper indicators)
        np.random.seed(42)  # For reproducible results
        dates = pd.date_range(start='2024-01-01', periods=50, freq='D')
        
        # Create realistic price data with some trend and noise
        base_price = 150
        trend = np.linspace(0, 10, 50)  # Upward trend
        noise = np.random.normal(0, 2, 50)  # Random noise
        
        prices = base_price + trend + noise
        volumes = np.random.randint(800000, 2000000, 50)
        
        data = pd.DataFrame({
            "date": dates,
            "close": prices,
            "volume": volumes,
            "high": prices + np.random.uniform(1, 3, 50),  # High is close + small random
            "low": prices - np.random.uniform(1, 3, 50),   # Low is close - small random
            "open": prices - np.random.uniform(-1, 1, 50)  # Open near close
        })
        
        print(f"📊 Generated market data with {len(data)} points")
        print(f"Latest close: ${data['close'].iloc[-1]:.2f}")

        # Realistic financial news
        news = [
            "Apple reports strong Q4 earnings with iPhone sales beating expectations",
            "Federal Reserve indicates potential rate cuts in upcoming meeting",
            "Tech sector shows resilience amid market volatility",
            "AAPL announces new AI features in upcoming iOS update"
        ]

        print("📰 Analyzing market sentiment...")
        sentiment_result = ai.analyze_sentiment(news)
        print(f"Sentiment Analysis: {sentiment_result}")

        print("📈 Generating trading signals...")
        signals = ai.generate_trading_signals(data, news)
        
        if signals:
            print("\n🎯 TRADING SIGNALS GENERATED:")
            for i, signal in enumerate(signals, 1):
                print(f"\nSignal #{i}:")
                print(f"  Symbol: {signal.symbol}")
                print(f"  Action: {signal.action}")
                print(f"  Confidence: {signal.confidence:.2%}")
                print(f"  Price Target: ${signal.price_target:.2f}")
                print(f"  Stop Loss: ${signal.stop_loss:.2f}")
                print(f"  Timestamp: {signal.timestamp}")
                print(f"  Rationale: {signal.rationale}")
        else:
            print("❌ No signals generated - check data quality")
            
    except Exception as e:
        print(f"❌ Error: {e}")