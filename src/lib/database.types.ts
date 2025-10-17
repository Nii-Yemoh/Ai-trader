export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; full_name: string | null; created_at: string; updated_at: string }
        Insert: { id: string; email: string; full_name?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; email?: string; full_name?: string | null; created_at?: string; updated_at?: string }
      }
      strategies: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string
          asset_type: string
          symbols: string[]
          risk_level: string
          max_position_size: number
          stop_loss_percentage: number
          take_profit_percentage: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string
          asset_type?: string
          symbols?: string[]
          risk_level?: string
          max_position_size?: number
          stop_loss_percentage?: number
          take_profit_percentage?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string
          asset_type?: string
          symbols?: string[]
          risk_level?: string
          max_position_size?: number
          stop_loss_percentage?: number
          take_profit_percentage?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      ai_feedback: {
        Row: {
          id: string
          user_id: string
          strategy_id: string | null
          feedback_type: string
          action: string
          symbol: string
          confidence: number
          price_target: number | null
          stop_loss: number | null
          rationale: string
          technical_indicators: Json
          sentiment_analysis: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          strategy_id?: string | null
          feedback_type?: string
          action: string
          symbol: string
          confidence?: number
          price_target?: number | null
          stop_loss?: number | null
          rationale?: string
          technical_indicators?: Json
          sentiment_analysis?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          strategy_id?: string | null
          feedback_type?: string
          action?: string
          symbol?: string
          confidence?: number
          price_target?: number | null
          stop_loss?: number | null
          rationale?: string
          technical_indicators?: Json
          sentiment_analysis?: Json
          created_at?: string
        }
      }
      trades: {
        Row: {
          id: string
          user_id: string
          strategy_id: string | null
          feedback_id: string | null
          symbol: string
          action: string
          quantity: number
          entry_price: number
          exit_price: number | null
          profit_loss: number | null
          status: string
          executed_at: string | null
          closed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          strategy_id?: string | null
          feedback_id?: string | null
          symbol: string
          action: string
          quantity?: number
          entry_price?: number
          exit_price?: number | null
          profit_loss?: number | null
          status?: string
          executed_at?: string | null
          closed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          strategy_id?: string | null
          feedback_id?: string | null
          symbol?: string
          action?: string
          quantity?: number
          entry_price?: number
          exit_price?: number | null
          profit_loss?: number | null
          status?: string
          executed_at?: string | null
          closed_at?: string | null
          created_at?: string
        }
      }
      api_connections: {
        Row: {
          id: string
          user_id: string
          provider: string
          api_key: string
          api_secret: string
          is_active: boolean
          last_connected: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          api_key: string
          api_secret: string
          is_active?: boolean
          last_connected?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          api_key?: string
          api_secret?: string
          is_active?: boolean
          last_connected?: string | null
          created_at?: string
        }
      }
    }
  }
}
