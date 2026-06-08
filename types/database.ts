export type GenerationMode = 'pre_generated' | 'on_demand'
export type PhaseType = 'immersion' | 'comprehension' | 'expression'
export type ScenarioStatus = 'locked' | 'in_progress' | 'completed'
export type VocabularyStatus = 'new' | 'learning' | 'mastered'

export interface Database {
  public: {
    Tables: {
      levels: {
        Row: {
          id: string
          code: string
          name: string
          order_index: number
        }
        Insert: Omit<Database['public']['Tables']['levels']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['levels']['Insert']>
      }
      users: {
        Row: {
          id: string
          full_name: string
          email: string | null
          level_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      scenarios: {
        Row: {
          id: string
          level_id: string
          title: string
          context: string
          order_index: number
          generation_mode: GenerationMode
          is_published: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['scenarios']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['scenarios']['Insert']>
      }
      vocabulary: {
        Row: {
          id: string
          scenario_id: string
          word: string
          definition: string
          example_sentence: string
          order_index: number
        }
        Insert: Omit<Database['public']['Tables']['vocabulary']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['vocabulary']['Insert']>
      }
      scenario_phases: {
        Row: {
          id: string
          scenario_id: string
          phase_type: PhaseType
          content: ImmersionContent | ComprehensionContent | ExpressionContent
          order_index: number
        }
        Insert: Omit<Database['public']['Tables']['scenario_phases']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['scenario_phases']['Insert']>
      }
      user_progress: {
        Row: {
          id: string
          user_id: string
          scenario_id: string
          status: ScenarioStatus
          score_vocabulary: number | null
          score_clarity: number | null
          score_naturalness: number | null
          completed_at: string | null
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_progress']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_progress']['Insert']>
      }
      user_responses: {
        Row: {
          id: string
          user_id: string
          phase_id: string
          response_text: string
          ai_feedback: AIFeedback | null
          score_vocabulary: number | null
          score_clarity: number | null
          score_naturalness: number | null
          attempt_number: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_responses']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['user_responses']['Insert']>
      }
      user_vocabulary: {
        Row: {
          id: string
          user_id: string
          vocabulary_id: string
          status: VocabularyStatus
          exposure_count: number
          last_seen_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_vocabulary']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['user_vocabulary']['Insert']>
      }
    }
  }
}

// Phase content shapes
export interface ImmersionContent {
  text: string
  source: string
  highlighted_words: string[]
}

export interface ComprehensionContent {
  questions: {
    question: string
    expected_keywords: string[]
  }[]
}

export interface ExpressionContent {
  prompt: string
  evaluation_criteria: string[]
}

// AI feedback shape
export interface AIFeedback {
  summary: string
  vocabulary: string
  clarity: string
  naturalness: string
  improved_version: string
}
