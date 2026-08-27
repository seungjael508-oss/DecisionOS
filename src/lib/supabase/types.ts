export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      consultation: {
        Row: {
          ai_analysis_status: Database["public"]["Enums"]["consultation_ai_status"]
          ai_analyzed_at: string | null
          ai_analyzed_content_version: number | null
          ai_confidence: number | null
          ai_density_level:
            | Database["public"]["Enums"]["consultation_density_level"]
            | null
          ai_evidence_summary: string | null
          ai_failure_reason: string | null
          ai_last_attempted_at: string | null
          ai_prompt_version: string | null
          ai_retry_count: number
          consulted_at: string
          content: string
          content_version: number
          counselor_id: string
          created_at: string
          created_by: string
          customer_id: string
          grade_after: Database["public"]["Enums"]["customer_grade"] | null
          id: string
          next_action_at: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          ai_analysis_status?: Database["public"]["Enums"]["consultation_ai_status"]
          ai_analyzed_at?: string | null
          ai_analyzed_content_version?: number | null
          ai_confidence?: number | null
          ai_density_level?:
            | Database["public"]["Enums"]["consultation_density_level"]
            | null
          ai_evidence_summary?: string | null
          ai_failure_reason?: string | null
          ai_last_attempted_at?: string | null
          ai_prompt_version?: string | null
          ai_retry_count?: number
          consulted_at: string
          content: string
          content_version?: number
          counselor_id: string
          created_at?: string
          created_by: string
          customer_id: string
          grade_after?: Database["public"]["Enums"]["customer_grade"] | null
          id?: string
          next_action_at?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          ai_analysis_status?: Database["public"]["Enums"]["consultation_ai_status"]
          ai_analyzed_at?: string | null
          ai_analyzed_content_version?: number | null
          ai_confidence?: number | null
          ai_density_level?:
            | Database["public"]["Enums"]["consultation_density_level"]
            | null
          ai_evidence_summary?: string | null
          ai_failure_reason?: string | null
          ai_last_attempted_at?: string | null
          ai_prompt_version?: string | null
          ai_retry_count?: number
          consulted_at?: string
          content?: string
          content_version?: number
          counselor_id?: string
          created_at?: string
          created_by?: string
          customer_id?: string
          grade_after?: Database["public"]["Enums"]["customer_grade"] | null
          id?: string
          next_action_at?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_counselor_id_project_id_fkey"
            columns: ["counselor_id", "project_id"]
            isOneToOne: false
            referencedRelation: "project_member"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "consultation_created_by_project_id_fkey"
            columns: ["created_by", "project_id"]
            isOneToOne: false
            referencedRelation: "project_member"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "consultation_customer_id_project_id_fkey"
            columns: ["customer_id", "project_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "consultation_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      customer: {
        Row: {
          assigned_counselor_id: string | null
          created_at: string
          grade: Database["public"]["Enums"]["customer_grade"]
          id: string
          name: string
          phone: string
          phone_normalized: string
          project_id: string
          source: string | null
          status: Database["public"]["Enums"]["customer_status"]
          suggested_at: string | null
          suggested_grade: Database["public"]["Enums"]["customer_grade"] | null
          suggested_grade_reason: string | null
          suggested_score: number | null
          suggestion_rule_version: string | null
          updated_at: string
        }
        Insert: {
          assigned_counselor_id?: string | null
          created_at?: string
          grade?: Database["public"]["Enums"]["customer_grade"]
          id?: string
          name: string
          phone: string
          phone_normalized: string
          project_id: string
          source?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          suggested_at?: string | null
          suggested_grade?: Database["public"]["Enums"]["customer_grade"] | null
          suggested_grade_reason?: string | null
          suggested_score?: number | null
          suggestion_rule_version?: string | null
          updated_at?: string
        }
        Update: {
          assigned_counselor_id?: string | null
          created_at?: string
          grade?: Database["public"]["Enums"]["customer_grade"]
          id?: string
          name?: string
          phone?: string
          phone_normalized?: string
          project_id?: string
          source?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          suggested_at?: string | null
          suggested_grade?: Database["public"]["Enums"]["customer_grade"] | null
          suggested_grade_reason?: string | null
          suggested_score?: number | null
          suggestion_rule_version?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_assigned_counselor_id_project_id_fkey"
            columns: ["assigned_counselor_id", "project_id"]
            isOneToOne: false
            referencedRelation: "project_member"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "customer_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_status_log: {
        Row: {
          changed_at: string
          changed_by: string
          consultation_id: string | null
          customer_id: string
          grade_after: Database["public"]["Enums"]["customer_grade"]
          grade_before: Database["public"]["Enums"]["customer_grade"] | null
          id: string
          project_id: string
          reason: string | null
          suggested_grade_at_time:
            | Database["public"]["Enums"]["customer_grade"]
            | null
        }
        Insert: {
          changed_at?: string
          changed_by: string
          consultation_id?: string | null
          customer_id: string
          grade_after: Database["public"]["Enums"]["customer_grade"]
          grade_before?: Database["public"]["Enums"]["customer_grade"] | null
          id?: string
          project_id: string
          reason?: string | null
          suggested_grade_at_time?:
            | Database["public"]["Enums"]["customer_grade"]
            | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          consultation_id?: string | null
          customer_id?: string
          grade_after?: Database["public"]["Enums"]["customer_grade"]
          grade_before?: Database["public"]["Enums"]["customer_grade"] | null
          id?: string
          project_id?: string
          reason?: string | null
          suggested_grade_at_time?:
            | Database["public"]["Enums"]["customer_grade"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_status_log_changed_by_project_id_fkey"
            columns: ["changed_by", "project_id"]
            isOneToOne: false
            referencedRelation: "project_member"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "customer_status_log_consultation_id_project_id_fkey"
            columns: ["consultation_id", "project_id"]
            isOneToOne: false
            referencedRelation: "consultation"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "customer_status_log_customer_id_project_id_fkey"
            columns: ["customer_id", "project_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "customer_status_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      organization: {
        Row: {
          created_at: string
          id: string
          name: string
          status: Database["public"]["Enums"]["organization_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["organization_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["organization_status"]
          updated_at?: string
        }
        Relationships: []
      }
      project: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          status: Database["public"]["Enums"]["project_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          status?: Database["public"]["Enums"]["project_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["project_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      project_member: {
        Row: {
          active: boolean
          created_at: string
          id: string
          project_id: string
          role: Database["public"]["Enums"]["project_member_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          project_id: string
          role: Database["public"]["Enums"]["project_member_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_member_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_member_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
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
      consultation_ai_status:
        | "PENDING"
        | "COMPLETED"
        | "FAILED"
        | "LOW_CONFIDENCE"
      consultation_density_level:
        | "SIMPLE_INQUIRY"
        | "INTEREST"
        | "SUBSTANTIVE"
        | "ACTION"
      customer_grade: "A" | "B" | "C"
      customer_status: "ACTIVE" | "ARCHIVED"
      organization_status: "ACTIVE" | "INACTIVE"
      project_member_role: "COUNSELOR" | "TEAM_LEAD" | "PROJECT_ADMIN"
      project_status: "ACTIVE" | "CLOSED"
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
      consultation_ai_status: [
        "PENDING",
        "COMPLETED",
        "FAILED",
        "LOW_CONFIDENCE",
      ],
      consultation_density_level: [
        "SIMPLE_INQUIRY",
        "INTEREST",
        "SUBSTANTIVE",
        "ACTION",
      ],
      customer_grade: ["A", "B", "C"],
      customer_status: ["ACTIVE", "ARCHIVED"],
      organization_status: ["ACTIVE", "INACTIVE"],
      project_member_role: ["COUNSELOR", "TEAM_LEAD", "PROJECT_ADMIN"],
      project_status: ["ACTIVE", "CLOSED"],
    },
  },
} as const

