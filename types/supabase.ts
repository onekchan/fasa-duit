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
      accounts: {
        Row: {
          archived: boolean
          created_at: string
          currency: string
          id: string
          institution: string | null
          name: string
          opening_balance_sen: number
          type: Database["public"]["Enums"]["account_kind"]
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          currency?: string
          id?: string
          institution?: string | null
          name: string
          opening_balance_sen?: number
          type?: Database["public"]["Enums"]["account_kind"]
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          currency?: string
          id?: string
          institution?: string | null
          name?: string
          opening_balance_sen?: number
          type?: Database["public"]["Enums"]["account_kind"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          archived: boolean
          bucket: Database["public"]["Enums"]["bucket_kind"]
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          bucket: Database["public"]["Enums"]["bucket_kind"]
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          bucket?: Database["public"]["Enums"]["bucket_kind"]
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      debts: {
        Row: {
          apr_bps: number
          archived: boolean
          balance_sen: number
          created_at: string
          id: string
          min_payment_sen: number
          name: string
          type: Database["public"]["Enums"]["debt_kind"]
          updated_at: string
          user_id: string
        }
        Insert: {
          apr_bps?: number
          archived?: boolean
          balance_sen: number
          created_at?: string
          id?: string
          min_payment_sen?: number
          name: string
          type?: Database["public"]["Enums"]["debt_kind"]
          updated_at?: string
          user_id: string
        }
        Update: {
          apr_bps?: number
          archived?: boolean
          balance_sen?: number
          created_at?: string
          id?: string
          min_payment_sen?: number
          name?: string
          type?: Database["public"]["Enums"]["debt_kind"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          currency: string
          income_sen: number
          islamic_mode: boolean
          language: string
          onboarding_done: boolean
          split_needs: number
          split_savings: number
          split_wants: number
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          income_sen?: number
          islamic_mode?: boolean
          language?: string
          onboarding_done?: boolean
          split_needs?: number
          split_savings?: number
          split_wants?: number
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          income_sen?: number
          islamic_mode?: boolean
          language?: string
          onboarding_done?: boolean
          split_needs?: number
          split_savings?: number
          split_wants?: number
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring: {
        Row: {
          archived: boolean
          auto_post: boolean
          created_at: string
          id: string
          last_run: string | null
          name: string
          next_run: string
          schedule: Json
          template: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          auto_post?: boolean
          created_at?: string
          id?: string
          last_run?: string | null
          name: string
          next_run: string
          schedule: Json
          template: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          auto_post?: boolean
          created_at?: string
          id?: string
          last_run?: string | null
          name?: string
          next_run?: string
          schedule?: Json
          template?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sinking_funds: {
        Row: {
          archived: boolean
          contributions: Json
          created_at: string
          icon: string
          id: string
          linked_category_id: string | null
          name: string
          target_date: string
          target_sen: number
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          contributions?: Json
          created_at?: string
          icon?: string
          id?: string
          linked_category_id?: string | null
          name: string
          target_date: string
          target_sen: number
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          contributions?: Json
          created_at?: string
          icon?: string
          id?: string
          linked_category_id?: string | null
          name?: string
          target_date?: string
          target_sen?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sinking_funds_linked_category_id_fkey"
            columns: ["linked_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount_sen: number
          category_id: string | null
          created_at: string
          date: string
          id: string
          merchant: string | null
          notes: string | null
          receipt_path: string | null
          recurring_id: string | null
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount_sen: number
          category_id?: string | null
          created_at?: string
          date: string
          id?: string
          merchant?: string | null
          notes?: string | null
          receipt_path?: string | null
          recurring_id?: string | null
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount_sen?: number
          category_id?: string | null
          created_at?: string
          date?: string
          id?: string
          merchant?: string | null
          notes?: string | null
          receipt_path?: string | null
          recurring_id?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      post_due_recurring: {
        Args: Record<string, never>
        Returns: number
      }
    }
    Enums: {
      account_kind:
        | "cash"
        | "current"
        | "savings"
        | "credit"
        | "ewallet"
        | "investment"
      bucket_kind: "needs" | "wants" | "savings"
      debt_kind:
        | "credit"
        | "ptptn"
        | "personal"
        | "car"
        | "mortgage"
        | "asb"
        | "family"
        | "other"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_kind: [
        "cash",
        "current",
        "savings",
        "credit",
        "ewallet",
        "investment",
      ],
      bucket_kind: ["needs", "wants", "savings"],
      debt_kind: [
        "credit",
        "ptptn",
        "personal",
        "car",
        "mortgage",
        "asb",
        "family",
        "other",
      ],
    },
  },
} as const
