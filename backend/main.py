import os
import warnings
import logging
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Tuple, Optional
import pandas as pd
import numpy as np
import torch
from transformers import AutoModel, pipeline
from huggingface_hub import login
from dotenv import load_dotenv
import safetensors

warnings.filterwarnings("ignore")

# ======= ENUMS AND DATA STRUCTURES =======

class AssetType(Enum):
    STOCK = "stock"
    CRYPTO = "crypto"
    FOREX = "forex"
    COMMODITY = "commodity"

@dataclass
class TradingSignal:
    symbol: str
    action: str  # BUY, SELL, HOLD
    confidence: float
    price_target: float
    stop_loss: float
    timestamp: pd.Timestamp
    rationale: str

# ======= MAIN TRADING SYSTEM CLASS =======

class AITradingSystem:
    def __init__(self, config: Dict):
        # Load environment variables (Hugging Face token)
        load_dotenv()
        hf_token = os.getenv("HF_TOKEN")
        if not hf_token:
            raise ValueError("❌ Hugging Face token not found. Please create a .env file with HF_TOKEN='your_token_here'")
        
        # Login to Hugging Face
        login(token=hf_token)
        
        self.config = config
        self.device = torch.device("cpu")  # Explicitly set to CPU for compatibility
        self.models = {}
        self._setup_logging()
        self._load_models()

    def _setup_logging(self):
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            handlers=[
                logging.StreamHandler(),
                logging.FileHandler("trading_system.log")
            ]
        )
        self.logger = logging.getLogger(__name__)

    def _load_models(self):
        """Load all required AI models."""
        try:
            self.logger.info(f"PyTorch version: {torch.__version__}")
            self.logger.info("Loading Hugging Face models...")
            
            # 1️⃣ Financial Sentiment Model (Primary - more reliable)
            self.models["sentiment"] = pipeline(
                "sentiment-analysis",
                model="mrm8488/distilroberta-finetuned-financial-news-sentiment-analysis",
                device="cpu"
            )
            self.logger.info("✅ Primary sentiment model loaded")
            
            # 2️⃣ FinBERT News Model - NEW APPROACH with AutoModelForSequenceClassification
            try:
                from transformers import AutoModelForSequenceClassification, AutoTokenizer
                
                self.logger.info("🔄 Loading FinBERT with safetensors...")
                
                # Load model with safetensors explicitly
                finbert_model = AutoModelForSequenceClassification.from_pretrained(
                    "ProsusAI/finbert",
                    use_safetensors=True,
                    trust_remote_code=True
                )
                
                # Load tokenizer
                finbert_tokenizer = AutoTokenizer.from_pretrained(
                    "ProsusAI/finbert",
                    use_safetensors=True
                )
                
                # Create pipeline with loaded model and tokenizer
                self.models["news_analyzer"] = pipeline(
                    "text-classification",
                    model=finbert_model,
                    tokenizer=finbert_tokenizer,
                    device="cpu"
                )
                
                self.logger.info("✅ FinBERT model loaded successfully with safetensors!")
                
            except Exception as e:
                self.logger.warning(f"⚠️ Could not load FinBERT with AutoModel: {e}. Trying direct pipeline approach...")
                
                # Fallback: Try direct pipeline approach
                try:
                    self.models["news_analyzer"] = pipeline(
                        "text-classification",
                        model="ProsusAI/finbert",
                        device="cpu",
                        use_safetensors=True,
                        trust_remote_code=True
                    )
                    self.logger.info("✅ FinBERT loaded via direct pipeline with safetensors")
                    
                except Exception as pipeline_error:
                    self.logger.warning(f"⚠️ Direct pipeline also failed: {pipeline_error}. Using primary sentiment model as fallback.")
                    self.models["news_analyzer"] = self.models["sentiment"]
            
            self.logger.info("✅ All models loaded successfully")
        except Exception as e:
            self.logger.error(f"Error loading models: {e}")
            raise

    def preprocess_market_data(self, data: pd.DataFrame) -> pd.DataFrame:
        """Add technical indicators and clean the data with robust handling for short datasets."""
        try:
            if data.empty:
                raise ValueError("Input market data is empty")
            if not {"close", "volume"}.issubset(data.columns):
                raise ValueError("Market data must contain 'close' and 'volume' columns")
            
            df = data.copy()
            
            # Calculate indicators with minimum data requirements
            if len(df) >= 20:
                df["SMA_20"] = df["close"].rolling(window=20, min_periods=1).mean()
                df["volume_sma"] = df["volume"].rolling(window=20, min_periods=1).mean()
            else:
                df["SMA_20"] = df["close"].expanding().mean()  # Use expanding mean for short data
                df["volume_sma"] = df["volume"].expanding().mean()
                
            if len(df) >= 50:
                df["SMA_50"] = df["close"].rolling(window=50, min_periods=1).mean()
            else:
                df["SMA_50"] = df["close"].expanding().mean()
            
            # RSI with minimum periods
            df["RSI"] = self._calculate_rsi(df["close"])
            
            # MACD can work with any length
            df["MACD"] = self._calculate_macd(df["close"])
            
            # Bollinger Bands with minimum data
            if len(df) >= 20:
                bb_upper, bb_lower = self._calculate_bollinger_bands(df["close"])
                df["Bollinger_Upper"] = bb_upper
                df["Bollinger_Lower"] = bb_lower
            else:
                # Use simple bands for short data
                df["Bollinger_Upper"] = df["close"] * 1.02
                df["Bollinger_Lower"] = df["close"] * 0.98
            
            # Other indicators
            df["price_change"] = df["close"].pct_change()
            
            if len(df) >= 20:
                df["volatility"] = df["price_change"].rolling(window=20, min_periods=1).std()
            else:
                df["volatility"] = df["price_change"].expanding().std()
                
            df["volume_ratio"] = df["volume"] / df["volume_sma"].replace(0, 1)  # Avoid division by zero
            
            # Fill NaN values that can't be dropped
            df = df.fillna(method='bfill').fillna(method='ffill')
            
            self.logger.info(f"Preprocessed data shape: {df.shape}")
            return df
            
        except Exception as e:
            self.logger.error(f"Error preprocessing data: {e}")
            # Return original data with basic calculations as fallback
            df = data.copy()
            df["price_change"] = df["close"].pct_change()
            df["SMA_20"] = df["close"].expanding().mean()
            df["SMA_50"] = df["close"].expanding().mean()
            return df.fillna(0)

    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> pd.Series:
        delta = prices.diff()
        gain = delta.where(delta > 0, 0)
        loss = -delta.where(delta < 0, 0)
        
        # Use expanding window for short data, rolling for sufficient data
        if len(prices) > period:
            avg_gain = gain.rolling(window=period, min_periods=1).mean()
            avg_loss = loss.rolling(window=period, min_periods=1).mean()
        else:
            avg_gain = gain.expanding().mean()
            avg_loss = loss.expanding().mean()
        
        rs = avg_gain / avg_loss.replace(0, np.nan)
        rsi = 100 - (100 / (1 + rs))
        return rsi.fillna(50)  # Fill NaN with neutral RSI value

    def _calculate_macd(self, prices: pd.Series, fast: int = 12, slow: int = 26) -> pd.Series:
        exp1 = prices.ewm(span=fast, adjust=False).mean()
        exp2 = prices.ewm(span=slow, adjust=False).mean()
        return exp1 - exp2

    def _calculate_bollinger_bands(
        self, prices: pd.Series, period: int = 20, std_dev: int = 2
    ) -> Tuple[pd.Series, pd.Series]:
        sma = prices.rolling(window=period).mean()
        std = prices.rolling(window=period).std()
        return sma + std_dev * std, sma - std_dev * std

    def analyze_sentiment(self, news_texts: List[str]) -> Dict:
        """Run financial sentiment model."""
        try:
            # Ensure we have valid text inputs
            valid_texts = [text for text in news_texts if text and isinstance(text, str)]
            if not valid_texts:
                return {"overall_sentiment": "neutral", "confidence": 0.5, "sentiment_distribution": {"positive": 0.33, "negative": 0.33, "neutral": 0.34}}
            
            # Process in batches to avoid tokenizer issues
            results = []
            for text in valid_texts:
                try:
                    result = self.models["sentiment"](text[:512])  # Limit text length
                    results.extend(result if isinstance(result, list) else [result])
                except Exception as e:
                    self.logger.warning(f"Failed to analyze text: {e}")
                    continue
            
            if not results:
                return {"overall_sentiment": "neutral", "confidence": 0.5, "sentiment_distribution": {"positive": 0.33, "negative": 0.33, "neutral": 0.34}}
            
            sentiment_scores = {"positive": 0, "negative": 0, "neutral": 0}
            for res in results:
                label = res["label"].strip().lower()
                score = res["score"]
                
                # Map different label formats to our standard ones
                if "positive" in label:
                    sentiment_scores["positive"] += score
                elif "negative" in label:
                    sentiment_scores["negative"] += score
                else:
                    sentiment_scores["neutral"] += score
            
            # Normalize scores
            total = sum(sentiment_scores.values())
            if total > 0:
                sentiment_scores = {k: v / total for k, v in sentiment_scores.items()}
            
            dominant = max(sentiment_scores, key=sentiment_scores.get)
            return {
                "sentiment_distribution": sentiment_scores,
                "overall_sentiment": dominant,
                "confidence": sentiment_scores[dominant],
            }
        except Exception as e:
            self.logger.error(f"Sentiment analysis error: {e}")
            return {"overall_sentiment": "neutral", "confidence": 0.5, "sentiment_distribution": {"positive": 0.33, "negative": 0.33, "neutral": 0.34}}

    def generate_trading_signals(
        self, market_data: pd.DataFrame, news_data: Optional[List[str]] = None, asset_type: AssetType = AssetType.STOCK
    ) -> List[TradingSignal]:
        try:
            if market_data.empty:
                raise ValueError("Empty market data.")
            
            processed = self.preprocess_market_data(market_data)
            if processed.empty:
                raise ValueError("Processed market data is empty after indicators.")
            
            latest = processed.iloc[-1]
            tech_signals = self._technical_analysis(processed)
            sentiment_analysis = None
            if news_data:
                sentiment_analysis = self.analyze_sentiment(news_data)
            
            final_signal = self._combine_signals(tech_signals, sentiment_analysis)
            symbol = self.config.get("symbol", "UNKNOWN")
            
            signal = TradingSignal(
                symbol=symbol,
                action=final_signal["action"],
                confidence=final_signal["confidence"],
                price_target=self._calculate_price_target(processed),
                stop_loss=self._calculate_stop_loss(processed, final_signal["action"]),
                timestamp=pd.Timestamp.now(),
                rationale=final_signal["rationale"],
            )
            
            return [signal]
        except Exception as e:
            self.logger.error(f"Signal generation error: {e}")
            return []

    def _technical_analysis(self, data: pd.DataFrame) -> Dict:
        if len(data) < 2:
            return {k: "HOLD" for k in ["rsi_signal", "macd_signal", "trend_signal", "bollinger_signal"]}
        
        latest, prev = data.iloc[-1], data.iloc[-2]
        signals = {"rsi_signal": "HOLD", "macd_signal": "HOLD", "trend_signal": "HOLD", "bollinger_signal": "HOLD"}
        
        if latest["RSI"] < 30:
            signals["rsi_signal"] = "BUY"
        elif latest["RSI"] > 70:
            signals["rsi_signal"] = "SELL"
        
        if latest["MACD"] > 0 and prev["MACD"] <= 0:
            signals["macd_signal"] = "BUY"
        elif latest["MACD"] < 0 and prev["MACD"] >= 0:
            signals["macd_signal"] = "SELL"
        
        signals["trend_signal"] = "BUY" if latest["SMA_20"] > latest["SMA_50"] else "SELL"
        
        if latest["close"] <= latest["Bollinger_Lower"]:
            signals["bollinger_signal"] = "BUY"
        elif latest["close"] >= latest["Bollinger_Upper"]:
            signals["bollinger_signal"] = "SELL"
        
        return signals

    def _combine_signals(self, tech: Dict, sentiment: Optional[Dict]) -> Dict:
        buy = sum(1 for v in tech.values() if v == "BUY")
        sell = sum(1 for v in tech.values() if v == "SELL")
        
        if sentiment and "overall_sentiment" in sentiment:
            if sentiment["overall_sentiment"] == "positive":
                buy += 2
            elif sentiment["overall_sentiment"] == "negative":
                sell += 2
        
        total = buy + sell
        if total == 0:
            return {"action": "HOLD", "confidence": 0.5, "rationale": "No clear signal"}
        
        action = "BUY" if buy > sell else "SELL"
        conf = min(0.95, max(buy, sell) / total)
        return {"action": action, "confidence": conf, "rationale": f"Tech: {tech}, Sentiment: {sentiment}"}

    def _calculate_price_target(self, data: pd.DataFrame) -> float:
        latest_close = data["close"].iloc[-1]
        vol = data["volatility"].iloc[-1]
        if data["SMA_20"].iloc[-1] > data["SMA_50"].iloc[-1]:
            target = latest_close * (1 + vol * 2)
        else:
            target = latest_close * (1 - vol * 2)
        return round(target, 2)

    def _calculate_stop_loss(self, data: pd.DataFrame, action: str) -> float:
        latest_close = data["close"].iloc[-1]
        vol = data["volatility"].iloc[-1]
        if action == "BUY":
            sl = latest_close * (1 - vol * 1.5)
        elif action == "SELL":
            sl = latest_close * (1 + vol * 1.5)
        else:
            sl = latest_close
        return round(sl, 2)