export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_actions: {
        Row: {
          action_type: string
          created_at: string
          credits_consumed: number
          id: string
          metadata: Json | null
          roadbook_id: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          credits_consumed?: number
          id?: string
          metadata?: Json | null
          roadbook_id?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          credits_consumed?: number
          id?: string
          metadata?: Json | null
          roadbook_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_actions_roadbook_id_fkey"
            columns: ["roadbook_id"]
            isOneToOne: false
            referencedRelation: "roadbook_view_stats"
            referencedColumns: ["roadbook_id"]
          },
          {
            foreignKeyName: "ai_actions_roadbook_id_fkey"
            columns: ["roadbook_id"]
            isOneToOne: false
            referencedRelation: "roadbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agency_logo_url: string | null
          agency_name: string | null
          avatar_url: string | null
          brand_color: string | null
          cancel_at: string | null
          created_at: string
          current_period_end: string | null
          display_name: string | null
          email: string | null
          id: string
          phone: string | null
          plan_key: string
          plan_status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          agency_logo_url?: string | null
          agency_name?: string | null
          avatar_url?: string | null
          brand_color?: string | null
          cancel_at?: string | null
          created_at?: string
          current_period_end?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          phone?: string | null
          plan_key?: string
          plan_status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          agency_logo_url?: string | null
          agency_name?: string | null
          avatar_url?: string | null
          brand_color?: string | null
          cancel_at?: string | null
          created_at?: string
          current_period_end?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          plan_key?: string
          plan_status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      roadbook_views: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          referrer: string | null
          roadbook_id: string
          viewed_at: string
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          referrer?: string | null
          roadbook_id: string
          viewed_at?: string
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          referrer?: string | null
          roadbook_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadbook_views_roadbook_id_fkey"
            columns: ["roadbook_id"]
            isOneToOne: false
            referencedRelation: "roadbook_view_stats"
            referencedColumns: ["roadbook_id"]
          },
          {
            foreignKeyName: "roadbook_views_roadbook_id_fkey"
            columns: ["roadbook_id"]
            isOneToOne: false
            referencedRelation: "roadbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      roadbooks: {
        Row: {
          agent_notes: string | null
          budget_range: string | null
          client_name: string
          content: Json | null
          created_at: string
          destination: string
          end_date: string | null
          generation_mode: string
          id: string
          share_token: string | null
          start_date: string | null
          status: string
          theme: string | null
          traveler_profile: string | null
          travelers_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_notes?: string | null
          budget_range?: string | null
          client_name: string
          content?: Json | null
          created_at?: string
          destination: string
          end_date?: string | null
          generation_mode?: string
          id?: string
          share_token?: string | null
          start_date?: string | null
          status?: string
          theme?: string | null
          traveler_profile?: string | null
          travelers_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_notes?: string | null
          budget_range?: string | null
          client_name?: string
          content?: Json | null
          created_at?: string
          destination?: string
          end_date?: string | null
          generation_mode?: string
          id?: string
          share_token?: string | null
          start_date?: string | null
          status?: string
          theme?: string | null
          traveler_profile?: string | null
          travelers_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      roadbook_view_stats: {
        Row: {
          desktop_count: number | null
          last_viewed_at: string | null
          mobile_count: number | null
          roadbook_id: string | null
          user_id: string | null
          view_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_shared_roadbook: {
        Args: { p_token: string }
        Returns: {
          budget_range: string
          client_name: string
          content: Json
          destination: string
          end_date: string
          id: string
          start_date: string
          status: string
          theme: string
          traveler_profile: string
          travelers_count: number
          updated_at: string
        }[]
      }
      regenerate_share_token: {
        Args: { p_roadbook_id: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
