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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_processing_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          input_data: Json | null
          model: string
          mpesa_id: string | null
          output_data: Json | null
          processing_time_ms: number | null
          prompt_id: string
          success: boolean | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          model: string
          mpesa_id?: string | null
          output_data?: Json | null
          processing_time_ms?: number | null
          prompt_id: string
          success?: boolean | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          model?: string
          mpesa_id?: string | null
          output_data?: Json | null
          processing_time_ms?: number | null
          prompt_id?: string
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_processing_logs_mpesa_id_fkey"
            columns: ["mpesa_id"]
            isOneToOne: false
            referencedRelation: "mpesa_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      labeled_dataset: {
        Row: {
          corrected_by: string
          corrected_parse: Json
          correction_type: string | null
          created_at: string | null
          id: string
          mpesa_id: string | null
          notes: string | null
          original_parse: Json
        }
        Insert: {
          corrected_by: string
          corrected_parse: Json
          correction_type?: string | null
          created_at?: string | null
          id?: string
          mpesa_id?: string | null
          notes?: string | null
          original_parse: Json
        }
        Update: {
          corrected_by?: string
          corrected_parse?: Json
          correction_type?: string | null
          created_at?: string | null
          id?: string
          mpesa_id?: string | null
          notes?: string | null
          original_parse?: Json
        }
        Relationships: [
          {
            foreignKeyName: "labeled_dataset_mpesa_id_fkey"
            columns: ["mpesa_id"]
            isOneToOne: false
            referencedRelation: "mpesa_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_clients: {
        Row: {
          app_version: string | null
          created_at: string | null
          device_id: string
          device_model: string | null
          device_name: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          os_version: string | null
          updated_at: string | null
        }
        Insert: {
          app_version?: string | null
          created_at?: string | null
          device_id: string
          device_model?: string | null
          device_name?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          os_version?: string | null
          updated_at?: string | null
        }
        Update: {
          app_version?: string | null
          created_at?: string | null
          device_id?: string
          device_model?: string | null
          device_name?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          os_version?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mpesa_audit: {
        Row: {
          action: string
          after_state: Json | null
          before_state: Json | null
          created_at: string | null
          id: string
          ip_address: unknown
          mpesa_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          mpesa_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          mpesa_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mpesa_audit_mpesa_id_fkey"
            columns: ["mpesa_id"]
            isOneToOne: false
            referencedRelation: "mpesa_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      mpesa_transactions: {
        Row: {
          ai_metadata: Json
          amount: number | null
          balance: number | null
          client_id: string
          client_tx_id: string
          created_at: string | null
          duplicate_of: string | null
          id: string
          parsed_data: Json | null
          raw_message: string
          recipient: string | null
          sender: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          transaction_code: string | null
          transaction_timestamp: number
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
        }
        Insert: {
          ai_metadata?: Json
          amount?: number | null
          balance?: number | null
          client_id: string
          client_tx_id: string
          created_at?: string | null
          duplicate_of?: string | null
          id?: string
          parsed_data?: Json | null
          raw_message: string
          recipient?: string | null
          sender?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          transaction_code?: string | null
          transaction_timestamp: number
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
        }
        Update: {
          ai_metadata?: Json
          amount?: number | null
          balance?: number | null
          client_id?: string
          client_tx_id?: string
          created_at?: string | null
          duplicate_of?: string | null
          id?: string
          parsed_data?: Json | null
          raw_message?: string
          recipient?: string | null
          sender?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          transaction_code?: string | null
          transaction_timestamp?: number
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mpesa_transactions_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "mpesa_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      review_queue: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          id: string
          mpesa_id: string
          notes: string | null
          priority: Database["public"]["Enums"]["review_priority"] | null
          reason: string
          resolution: string | null
          resolved_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          mpesa_id: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["review_priority"] | null
          reason: string
          resolution?: string | null
          resolved_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          mpesa_id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["review_priority"] | null
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_queue_mpesa_id_fkey"
            columns: ["mpesa_id"]
            isOneToOne: false
            referencedRelation: "mpesa_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      review_priority: "low" | "normal" | "high" | "critical"
      transaction_status:
        | "pending_upload"
        | "uploaded"
        | "pending_review"
        | "cleaned"
        | "duplicate"
        | "rejected"
      transaction_type:
        | "Paybill"
        | "Till"
        | "SendMoney"
        | "Withdrawal"
        | "Deposit"
        | "Airtime"
        | "BankToMpesa"
        | "MpesaToBank"
        | "Reversal"
        | "Unknown"
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
    Enums: {
      review_priority: ["low", "normal", "high", "critical"],
      transaction_status: [
        "pending_upload",
        "uploaded",
        "pending_review",
        "cleaned",
        "duplicate",
        "rejected",
      ],
      transaction_type: [
        "Paybill",
        "Till",
        "SendMoney",
        "Withdrawal",
        "Deposit",
        "Airtime",
        "BankToMpesa",
        "MpesaToBank",
        "Reversal",
        "Unknown",
      ],
    },
  },
} as const
