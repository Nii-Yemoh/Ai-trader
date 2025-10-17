/*
  # Trading System Database Schema

  1. New Tables
    - `strategies`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text)
      - `description` (text)
      - `asset_type` (text) - stock, crypto, forex, commodity
      - `symbols` (text array) - trading symbols
      - `risk_level` (text) - low, medium, high
      - `max_position_size` (numeric)
      - `stop_loss_percentage` (numeric)
      - `take_profit_percentage` (numeric)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `ai_feedback`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `strategy_id` (uuid, foreign key to strategies)
      - `feedback_type` (text) - signal, analysis, alert, execution
      - `action` (text) - BUY, SELL, HOLD
      - `symbol` (text)
      - `confidence` (numeric)
      - `price_target` (numeric)
      - `stop_loss` (numeric)
      - `rationale` (text)
      - `technical_indicators` (jsonb)
      - `sentiment_analysis` (jsonb)
      - `created_at` (timestamptz)
    
    - `trades`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `strategy_id` (uuid, foreign key to strategies)
      - `feedback_id` (uuid, foreign key to ai_feedback)
      - `symbol` (text)
      - `action` (text) - BUY, SELL
      - `quantity` (numeric)
      - `entry_price` (numeric)
      - `exit_price` (numeric)
      - `profit_loss` (numeric)
      - `status` (text) - pending, executed, closed
      - `executed_at` (timestamptz)
      - `closed_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `api_connections`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `provider` (text) - alpaca, binance, coinbase, etc
      - `api_key` (text, encrypted)
      - `api_secret` (text, encrypted)
      - `is_active` (boolean)
      - `last_connected` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create strategies table
CREATE TABLE IF NOT EXISTS strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  asset_type text NOT NULL DEFAULT 'stock',
  symbols text[] NOT NULL DEFAULT '{}',
  risk_level text NOT NULL DEFAULT 'medium',
  max_position_size numeric NOT NULL DEFAULT 1000,
  stop_loss_percentage numeric NOT NULL DEFAULT 2.0,
  take_profit_percentage numeric NOT NULL DEFAULT 5.0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own strategies"
  ON strategies FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strategies"
  ON strategies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strategies"
  ON strategies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own strategies"
  ON strategies FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create ai_feedback table
CREATE TABLE IF NOT EXISTS ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  strategy_id uuid REFERENCES strategies(id) ON DELETE CASCADE,
  feedback_type text NOT NULL DEFAULT 'signal',
  action text NOT NULL,
  symbol text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0.5,
  price_target numeric,
  stop_loss numeric,
  rationale text DEFAULT '',
  technical_indicators jsonb DEFAULT '{}',
  sentiment_analysis jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI feedback"
  ON ai_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI feedback"
  ON ai_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI feedback"
  ON ai_feedback FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  strategy_id uuid REFERENCES strategies(id) ON DELETE CASCADE,
  feedback_id uuid REFERENCES ai_feedback(id) ON DELETE SET NULL,
  symbol text NOT NULL,
  action text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  entry_price numeric NOT NULL DEFAULT 0,
  exit_price numeric,
  profit_loss numeric,
  status text NOT NULL DEFAULT 'pending',
  executed_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades"
  ON trades FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades"
  ON trades FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades"
  ON trades FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades"
  ON trades FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create api_connections table
CREATE TABLE IF NOT EXISTS api_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  api_key text NOT NULL,
  api_secret text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_connected timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE api_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own API connections"
  ON api_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API connections"
  ON api_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API connections"
  ON api_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own API connections"
  ON api_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_strategies_is_active ON strategies(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id ON ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_strategy_id ON ai_feedback(strategy_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created_at ON ai_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_strategy_id ON trades(strategy_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_api_connections_user_id ON api_connections(user_id);