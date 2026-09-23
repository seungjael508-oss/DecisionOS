export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      brokerage_contact: {
        Row: {
          active: boolean
          brokerage_office_id: string
          created_at: string
          id: string
          name: string
          phone: string | null
          project_id: string
          role: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          brokerage_office_id: string
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          project_id: string
          role: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          brokerage_office_id?: string
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          project_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brokerage_contact_brokerage_office_id_project_id_fkey"
            columns: ["brokerage_office_id", "project_id"]
            isOneToOne: false
            referencedRelation: "brokerage_office"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      brokerage_office: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          id: string
          main_phone: string | null
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          main_phone?: string | null
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          main_phone?: string | null
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brokerage_office_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      community_notice: {
        Row: {
          content: string
          created_at: string
          created_by: string
          notice_id: string
          project_id: string
          sent_at: string | null
          target_type: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          notice_id?: string
          project_id: string
          sent_at?: string | null
          target_type: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          notice_id?: string
          project_id?: string
          sent_at?: string | null
          target_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_notice_created_by_project_id_fkey"
            columns: ["created_by", "project_id"]
            isOneToOne: false
            referencedRelation: "project_member"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "community_notice_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
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
          channel: string | null
          consulted_at: string
          contact_type: string | null
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
          purpose: string | null
          stage: string | null
          structured_tags: Json | null
          unit_id: string | null
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
          channel?: string | null
          consulted_at: string
          contact_type?: string | null
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
          purpose?: string | null
          stage?: string | null
          structured_tags?: Json | null
          unit_id?: string | null
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
          channel?: string | null
          consulted_at?: string
          contact_type?: string | null
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
          purpose?: string | null
          stage?: string | null
          structured_tags?: Json | null
          unit_id?: string | null
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
          {
            foreignKeyName: "consultation_unit_project_fkey"
            columns: ["project_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "project_unit"
            referencedColumns: ["project_id", "unit_id"]
          },
        ]
      }
      contact_schedule: {
        Row: {
          actual_sent_at: string | null
          contact_type: string
          contract_id: string | null
          created_at: string
          created_by: string
          customer_id: string
          planned_at: string
          project_id: string
          result_consultation_id: string | null
          schedule_id: string
          status: Database["public"]["Enums"]["contact_schedule_status"]
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          actual_sent_at?: string | null
          contact_type: string
          contract_id?: string | null
          created_at?: string
          created_by: string
          customer_id: string
          planned_at: string
          project_id: string
          result_consultation_id?: string | null
          schedule_id?: string
          status?: Database["public"]["Enums"]["contact_schedule_status"]
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          actual_sent_at?: string | null
          contact_type?: string
          contract_id?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string
          planned_at?: string
          project_id?: string
          result_consultation_id?: string | null
          schedule_id?: string
          status?: Database["public"]["Enums"]["contact_schedule_status"]
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_schedule_contract_id_project_id_fkey"
            columns: ["contract_id", "project_id"]
            isOneToOne: false
            referencedRelation: "contract"
            referencedColumns: ["contract_id", "project_id"]
          },
          {
            foreignKeyName: "contact_schedule_created_by_project_id_fkey"
            columns: ["created_by", "project_id"]
            isOneToOne: false
            referencedRelation: "project_member"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "contact_schedule_customer_id_project_id_fkey"
            columns: ["customer_id", "project_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "contact_schedule_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_schedule_project_id_unit_id_fkey"
            columns: ["project_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "project_unit"
            referencedColumns: ["project_id", "unit_id"]
          },
          {
            foreignKeyName: "contact_schedule_result_consultation_id_project_id_fkey"
            columns: ["result_consultation_id", "project_id"]
            isOneToOne: false
            referencedRelation: "consultation"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      contract: {
        Row: {
          cancellation_reason: string | null
          contract_id: string
          contract_scheduled_date: string | null
          contract_status: Database["public"]["Enums"]["contract_status"]
          contracted_at: string
          created_at: string
          customer_id: string
          document_status: string | null
          previous_contract_id: string | null
          project_id: string
          subscription_id: string | null
          unit_id: string
          updated_at: string
          visit_date_confirmed: boolean
          winner_confirmed: boolean | null
          winner_list_received_at: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          contract_id?: string
          contract_scheduled_date?: string | null
          contract_status: Database["public"]["Enums"]["contract_status"]
          contracted_at?: string
          created_at?: string
          customer_id: string
          document_status?: string | null
          previous_contract_id?: string | null
          project_id: string
          subscription_id?: string | null
          unit_id: string
          updated_at?: string
          visit_date_confirmed?: boolean
          winner_confirmed?: boolean | null
          winner_list_received_at?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          contract_id?: string
          contract_scheduled_date?: string | null
          contract_status?: Database["public"]["Enums"]["contract_status"]
          contracted_at?: string
          created_at?: string
          customer_id?: string
          document_status?: string | null
          previous_contract_id?: string | null
          project_id?: string
          subscription_id?: string | null
          unit_id?: string
          updated_at?: string
          visit_date_confirmed?: boolean
          winner_confirmed?: boolean | null
          winner_list_received_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_customer_id_project_id_fkey"
            columns: ["customer_id", "project_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "contract_previous_contract_id_project_id_unit_id_fkey"
            columns: ["previous_contract_id", "project_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "contract"
            referencedColumns: ["contract_id", "project_id", "unit_id"]
          },
          {
            foreignKeyName: "contract_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_project_id_unit_id_fkey"
            columns: ["project_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "project_unit"
            referencedColumns: ["project_id", "unit_id"]
          },
          {
            foreignKeyName: "contract_subscription_id_customer_id_project_id_fkey"
            columns: ["subscription_id", "customer_id", "project_id"]
            isOneToOne: false
            referencedRelation: "subscription"
            referencedColumns: ["subscription_id", "customer_id", "project_id"]
          },
        ]
      }
      contract_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          contact_id: string | null
          contract_id: string
          field_changed: string
          history_id: string
          new_value: string | null
          previous_value: string | null
          project_id: string
          reason: string | null
          unit_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          contact_id?: string | null
          contract_id: string
          field_changed: string
          history_id?: string
          new_value?: string | null
          previous_value?: string | null
          project_id: string
          reason?: string | null
          unit_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          contact_id?: string | null
          contract_id?: string
          field_changed?: string
          history_id?: string
          new_value?: string | null
          previous_value?: string | null
          project_id?: string
          reason?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_status_history_changed_by_project_id_fkey"
            columns: ["changed_by", "project_id"]
            isOneToOne: false
            referencedRelation: "project_member"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "contract_status_history_contact_project_fkey"
            columns: ["contact_id", "project_id"]
            isOneToOne: false
            referencedRelation: "consultation"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "contract_status_history_contract_id_project_id_unit_id_fkey"
            columns: ["contract_id", "project_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "contract"
            referencedColumns: ["contract_id", "project_id", "unit_id"]
          },
          {
            foreignKeyName: "contract_status_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_status_history_project_id_unit_id_fkey"
            columns: ["project_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "project_unit"
            referencedColumns: ["project_id", "unit_id"]
          },
        ]
      }
      cs_ticket: {
        Row: {
          assigned_to: string | null
          category: string
          contract_id: string
          created_at: string
          created_by: string
          customer_id: string
          description: string
          priority: string
          project_id: string
          resolved_at: string | null
          status: string
          ticket_id: string
          title: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          contract_id: string
          created_at?: string
          created_by: string
          customer_id: string
          description: string
          priority?: string
          project_id: string
          resolved_at?: string | null
          status?: string
          ticket_id?: string
          title: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          contract_id?: string
          created_at?: string
          created_by?: string
          customer_id?: string
          description?: string
          priority?: string
          project_id?: string
          resolved_at?: string | null
          status?: string
          ticket_id?: string
          title?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_ticket_assigned_to_project_id_fkey"
            columns: ["assigned_to", "project_id"]
            isOneToOne: false
            referencedRelation: "project_member"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "cs_ticket_contract_id_customer_id_project_id_unit_id_fkey"
            columns: ["contract_id", "customer_id", "project_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "contract"
            referencedColumns: [
              "contract_id",
              "customer_id",
              "project_id",
              "unit_id",
            ]
          },
          {
            foreignKeyName: "cs_ticket_created_by_project_id_fkey"
            columns: ["created_by", "project_id"]
            isOneToOne: false
            referencedRelation: "project_member"
            referencedColumns: ["id", "project_id"]
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
          phone_quality: string | null
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
      customer_unit_interest: {
        Row: {
          assigned_counselor_id: string | null
          created_at: string
          current_status: Database["public"]["Enums"]["customer_unit_interest_status"]
          customer_id: string
          first_interested_at: string
          interest_id: string
          interest_level: string | null
          interest_reason: string | null
          last_interested_at: string
          project_id: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          assigned_counselor_id?: string | null
          created_at?: string
          current_status?: Database["public"]["Enums"]["customer_unit_interest_status"]
          customer_id: string
          first_interested_at?: string
          interest_id?: string
          interest_level?: string | null
          interest_reason?: string | null
          last_interested_at?: string
          project_id: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          assigned_counselor_id?: string | null
          created_at?: string
          current_status?: Database["public"]["Enums"]["customer_unit_interest_status"]
          customer_id?: string
          first_interested_at?: string
          interest_id?: string
          interest_level?: string | null
          interest_reason?: string | null
          last_interested_at?: string
          project_id?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_unit_interest_assigned_counselor_id_project_id_fkey"
            columns: ["assigned_counselor_id", "project_id"]
            isOneToOne: false
            referencedRelation: "project_member"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "customer_unit_interest_customer_id_project_id_fkey"
            columns: ["customer_id", "project_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "customer_unit_interest_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_unit_interest_project_id_unit_id_fkey"
            columns: ["project_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "project_unit"
            referencedColumns: ["project_id", "unit_id"]
          },
        ]
      }
      entry_pool: {
        Row: {
          acquisition_channel: string | null
          catalog_view_count: number
          created_at: string
          entry_id: string
          interest_unit_type: string | null
          name_or_nickname: string | null
          phone_normalized: string
          price_view_count: number
          project_id: string
          region: string | null
          status: string
          updated_at: string
        }
        Insert: {
          acquisition_channel?: string | null
          catalog_view_count?: number
          created_at?: string
          entry_id?: string
          interest_unit_type?: string | null
          name_or_nickname?: string | null
          phone_normalized: string
          price_view_count?: number
          project_id: string
          region?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          acquisition_channel?: string | null
          catalog_view_count?: number
          created_at?: string
          entry_id?: string
          interest_unit_type?: string | null
          name_or_nickname?: string | null
          phone_normalized?: string
          price_view_count?: number
          project_id?: string
          region?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_pool_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_event: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          event_at: string
          event_id: string
          event_type: string
          metadata: Json | null
          project_id: string
          source_channel: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          event_at?: string
          event_id?: string
          event_type: string
          metadata?: Json | null
          project_id: string
          source_channel?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          event_at?: string
          event_id?: string
          event_type?: string
          metadata?: Json | null
          project_id?: string
          source_channel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_event_created_by_project_id_fkey"
            columns: ["created_by", "project_id"]
            isOneToOne: false
            referencedRelation: "project_member"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "funnel_event_customer_id_project_id_fkey"
            columns: ["customer_id", "project_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "funnel_event_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      market_data: {
        Row: {
          collected_at: string
          complex_name: string | null
          created_at: string
          data_scope: Database["public"]["Enums"]["market_data_scope"]
          jeonse_listing_count: number | null
          market_data_id: string
          monthly_rent_listing_count: number | null
          move_in_date: string | null
          move_in_units: number | null
          period: string
          price_avg: number | null
          project_id: string
          sale_listing_count: number | null
          source: string | null
          transaction_count: number | null
          unit_type: string | null
        }
        Insert: {
          collected_at?: string
          complex_name?: string | null
          created_at?: string
          data_scope: Database["public"]["Enums"]["market_data_scope"]
          jeonse_listing_count?: number | null
          market_data_id?: string
          monthly_rent_listing_count?: number | null
          move_in_date?: string | null
          move_in_units?: number | null
          period: string
          price_avg?: number | null
          project_id: string
          sale_listing_count?: number | null
          source?: string | null
          transaction_count?: number | null
          unit_type?: string | null
        }
        Update: {
          collected_at?: string
          complex_name?: string | null
          created_at?: string
          data_scope?: Database["public"]["Enums"]["market_data_scope"]
          jeonse_listing_count?: number | null
          market_data_id?: string
          monthly_rent_listing_count?: number | null
          move_in_date?: string | null
          move_in_units?: number | null
          period?: string
          price_avg?: number | null
          project_id?: string
          sale_listing_count?: number | null
          source?: string | null
          transaction_count?: number | null
          unit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_data_project_id_fkey"
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
          display_name: string | null
          id: string
          project_id: string
          role: Database["public"]["Enums"]["project_member_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          project_id: string
          role: Database["public"]["Enums"]["project_member_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string | null
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
      project_unit: {
        Row: {
          building_no: string
          created_at: string
          floor: number | null
          project_id: string
          unit_id: string
          unit_no: string
          unit_type: string | null
          updated_at: string
        }
        Insert: {
          building_no: string
          created_at?: string
          floor?: number | null
          project_id: string
          unit_id?: string
          unit_no: string
          unit_type?: string | null
          updated_at?: string
        }
        Update: {
          building_no?: string
          created_at?: string
          floor?: number | null
          project_id?: string
          unit_id?: string
          unit_no?: string
          unit_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_unit_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      report: {
        Row: {
          created_at: string
          generated_at: string
          generated_by: string
          generated_data: Json
          project_id: string
          report_date: string
          report_id: string
          report_phase: Database["public"]["Enums"]["report_phase"]
          report_type: Database["public"]["Enums"]["report_type"]
          supersedes_report_id: string | null
          template_id: string | null
          version: number
        }
        Insert: {
          created_at?: string
          generated_at?: string
          generated_by: string
          generated_data: Json
          project_id: string
          report_date: string
          report_id?: string
          report_phase: Database["public"]["Enums"]["report_phase"]
          report_type: Database["public"]["Enums"]["report_type"]
          supersedes_report_id?: string | null
          template_id?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          generated_at?: string
          generated_by?: string
          generated_data?: Json
          project_id?: string
          report_date?: string
          report_id?: string
          report_phase?: Database["public"]["Enums"]["report_phase"]
          report_type?: Database["public"]["Enums"]["report_type"]
          supersedes_report_id?: string | null
          template_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_generated_by_project_id_fkey"
            columns: ["generated_by", "project_id"]
            isOneToOne: false
            referencedRelation: "project_member"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "report_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_supersedes_report_id_project_id_fkey"
            columns: ["supersedes_report_id", "project_id"]
            isOneToOne: false
            referencedRelation: "report"
            referencedColumns: ["report_id", "project_id"]
          },
          {
            foreignKeyName: "report_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_template"
            referencedColumns: ["template_id"]
          },
        ]
      }
      report_template: {
        Row: {
          active: boolean
          created_at: string
          mapping_definition: Json
          name: string
          organization_id: string
          project_id: string | null
          report_phase: Database["public"]["Enums"]["report_phase"]
          report_type: Database["public"]["Enums"]["report_type"]
          source_type: Database["public"]["Enums"]["report_template_source_type"]
          template_definition: Json
          template_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          mapping_definition: Json
          name: string
          organization_id: string
          project_id?: string | null
          report_phase: Database["public"]["Enums"]["report_phase"]
          report_type: Database["public"]["Enums"]["report_type"]
          source_type: Database["public"]["Enums"]["report_template_source_type"]
          template_definition: Json
          template_id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          mapping_definition?: Json
          name?: string
          organization_id?: string
          project_id?: string | null
          report_phase?: Database["public"]["Enums"]["report_phase"]
          report_type?: Database["public"]["Enums"]["report_type"]
          source_type?: Database["public"]["Enums"]["report_template_source_type"]
          template_definition?: Json
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_template_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_template_project_id_organization_id_fkey"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      subscription: {
        Row: {
          contract_interest_level: string | null
          created_at: string
          customer_id: string
          project_id: string
          satisfaction_notes: string | null
          subscribed_at: string
          subscription_id: string
          subscription_round: string
          subscription_type: string | null
          unit_type: string | null
          updated_at: string
        }
        Insert: {
          contract_interest_level?: string | null
          created_at?: string
          customer_id: string
          project_id: string
          satisfaction_notes?: string | null
          subscribed_at?: string
          subscription_id?: string
          subscription_round: string
          subscription_type?: string | null
          unit_type?: string | null
          updated_at?: string
        }
        Update: {
          contract_interest_level?: string | null
          created_at?: string
          customer_id?: string
          project_id?: string
          satisfaction_notes?: string | null
          subscribed_at?: string
          subscription_id?: string
          subscription_round?: string
          subscription_type?: string | null
          unit_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_customer_id_project_id_fkey"
            columns: ["customer_id", "project_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "subscription_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_deal: {
        Row: {
          consent_status: string
          contract_id: string
          created_at: string
          customer_id: string
          deal_status: string
          details: string | null
          id: string
          jeonse_enabled: boolean
          jeonse_note: string | null
          monthly_rent_enabled: boolean
          monthly_rent_note: string | null
          project_id: string
          sale_enabled: boolean
          sale_note: string | null
          unit_id: string
          updated_at: string
          updated_by_project_member_id: string
        }
        Insert: {
          consent_status: string
          contract_id: string
          created_at?: string
          customer_id: string
          deal_status: string
          details?: string | null
          id?: string
          jeonse_enabled?: boolean
          jeonse_note?: string | null
          monthly_rent_enabled?: boolean
          monthly_rent_note?: string | null
          project_id: string
          sale_enabled?: boolean
          sale_note?: string | null
          unit_id: string
          updated_at?: string
          updated_by_project_member_id: string
        }
        Update: {
          consent_status?: string
          contract_id?: string
          created_at?: string
          customer_id?: string
          deal_status?: string
          details?: string | null
          id?: string
          jeonse_enabled?: boolean
          jeonse_note?: string | null
          monthly_rent_enabled?: boolean
          monthly_rent_note?: string | null
          project_id?: string
          sale_enabled?: boolean
          sale_note?: string | null
          unit_id?: string
          updated_at?: string
          updated_by_project_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_deal_contract_id_project_id_unit_id_fkey"
            columns: ["contract_id", "project_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "contract"
            referencedColumns: ["contract_id", "project_id", "unit_id"]
          },
          {
            foreignKeyName: "unit_deal_customer_id_project_id_fkey"
            columns: ["customer_id", "project_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "unit_deal_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_deal_project_id_unit_id_fkey"
            columns: ["project_id", "unit_id"]
            isOneToOne: true
            referencedRelation: "project_unit"
            referencedColumns: ["project_id", "unit_id"]
          },
          {
            foreignKeyName: "unit_deal_updated_by_project_member_id_project_id_fkey"
            columns: ["updated_by_project_member_id", "project_id"]
            isOneToOne: false
            referencedRelation: "project_member"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      unit_deal_brokerage: {
        Row: {
          brokerage_contact_id: string | null
          brokerage_office_id: string
          created_at: string
          unit_deal_id: string
        }
        Insert: {
          brokerage_contact_id?: string | null
          brokerage_office_id: string
          created_at?: string
          unit_deal_id: string
        }
        Update: {
          brokerage_contact_id?: string | null
          brokerage_office_id?: string
          created_at?: string
          unit_deal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_deal_brokerage_brokerage_contact_id_fkey"
            columns: ["brokerage_contact_id"]
            isOneToOne: false
            referencedRelation: "brokerage_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_deal_brokerage_brokerage_office_id_fkey"
            columns: ["brokerage_office_id"]
            isOneToOne: false
            referencedRelation: "brokerage_office"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_deal_brokerage_unit_deal_id_fkey"
            columns: ["unit_deal_id"]
            isOneToOne: false
            referencedRelation: "unit_deal"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_occupancy_status: {
        Row: {
          actual_move_in_date: string | null
          balance_paid_at: string | null
          contract_id: string
          created_at: string
          funding_status: Database["public"]["Enums"]["funding_status"]
          last_contact_at: string | null
          move_in_status: Database["public"]["Enums"]["move_in_status"]
          next_contact_at: string | null
          occupancy_intent: Database["public"]["Enums"]["occupancy_intent"]
          occupancy_status_id: string
          planned_move_in_date: string | null
          project_id: string
          unit_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actual_move_in_date?: string | null
          balance_paid_at?: string | null
          contract_id: string
          created_at?: string
          funding_status?: Database["public"]["Enums"]["funding_status"]
          last_contact_at?: string | null
          move_in_status?: Database["public"]["Enums"]["move_in_status"]
          next_contact_at?: string | null
          occupancy_intent?: Database["public"]["Enums"]["occupancy_intent"]
          occupancy_status_id?: string
          planned_move_in_date?: string | null
          project_id: string
          unit_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actual_move_in_date?: string | null
          balance_paid_at?: string | null
          contract_id?: string
          created_at?: string
          funding_status?: Database["public"]["Enums"]["funding_status"]
          last_contact_at?: string | null
          move_in_status?: Database["public"]["Enums"]["move_in_status"]
          next_contact_at?: string | null
          occupancy_intent?: Database["public"]["Enums"]["occupancy_intent"]
          occupancy_status_id?: string
          planned_move_in_date?: string | null
          project_id?: string
          unit_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_occupancy_status_contract_id_project_id_unit_id_fkey"
            columns: ["contract_id", "project_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "contract"
            referencedColumns: ["contract_id", "project_id", "unit_id"]
          },
          {
            foreignKeyName: "unit_occupancy_status_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_occupancy_status_project_id_unit_id_fkey"
            columns: ["project_id", "unit_id"]
            isOneToOne: true
            referencedRelation: "project_unit"
            referencedColumns: ["project_id", "unit_id"]
          },
          {
            foreignKeyName: "unit_occupancy_status_updated_by_project_id_fkey"
            columns: ["updated_by", "project_id"]
            isOneToOne: false
            referencedRelation: "project_member"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_move_in_import_row: {
        Args: {
          p_actual_move_in_date?: string
          p_apply_mode: string
          p_balance_paid_at?: string
          p_existing_customer_id?: string
          p_expected_current_contract_id?: string
          p_funding_status?: Database["public"]["Enums"]["funding_status"]
          p_move_in_status?: Database["public"]["Enums"]["move_in_status"]
          p_new_customer_name?: string
          p_new_customer_phone_normalized?: string
          p_occupancy_intent?: Database["public"]["Enums"]["occupancy_intent"]
          p_planned_move_in_date?: string
          p_project_id: string
          p_reason?: string
          p_unit_id: string
        }
        Returns: Json
      }
      assign_move_in_customers: {
        Args: {
          p_assignee_project_member_id: string
          p_customer_ids: string[]
          p_project_id: string
        }
        Returns: number
      }
      cancel_contract: {
        Args: {
          p_cancellation_reason: string
          p_contract_id: string
          p_project_id: string
        }
        Returns: string
      }
      create_contract: {
        Args: {
          p_customer_id: string
          p_project_id: string
          p_subscription_id?: string
          p_unit_id: string
        }
        Returns: string
      }
      create_cs_ticket: {
        Args: {
          p_assigned_to?: string
          p_category: string
          p_contract_id: string
          p_description: string
          p_priority?: string
          p_project_id: string
          p_title: string
        }
        Returns: string
      }
      create_move_in_consultation: {
        Args: {
          p_actual_move_in_date?: string
          p_balance_paid_at?: string
          p_business_purpose?: string
          p_consultation_type: string
          p_content: string
          p_customer_id: string
          p_funding_status?: Database["public"]["Enums"]["funding_status"]
          p_legacy_grade?: string
          p_move_in_status?: Database["public"]["Enums"]["move_in_status"]
          p_next_contact_at?: string
          p_occupancy_intent?: Database["public"]["Enums"]["occupancy_intent"]
          p_planned_move_in_date?: string
          p_project_id: string
          p_reason?: string
          p_unit_id: string
        }
        Returns: string
      }
      generate_report: {
        Args: {
          p_generated_data: Json
          p_project_id: string
          p_report_date: string
          p_report_phase: Database["public"]["Enums"]["report_phase"]
          p_report_type: Database["public"]["Enums"]["report_type"]
          p_template_id?: string
        }
        Returns: string
      }
      invite_project_member: {
        Args: {
          p_display_name: string
          p_project_id: string
          p_role: Database["public"]["Enums"]["project_member_role"]
          p_user_id: string
        }
        Returns: string
      }
      list_move_in_field_members: {
        Args: { p_project_id: string }
        Returns: {
          display_name: string
          member_id: string
        }[]
      }
      list_project_members: {
        Args: { p_project_id: string }
        Returns: {
          member_id: string
          user_id: string
          display_name: string | null
          email: string
          role: Database["public"]["Enums"]["project_member_role"]
          active: boolean
          created_at: string
        }[]
      }
      promote_entry_to_customer: {
        Args: { p_entry_id: string; p_project_id: string }
        Returns: string
      }
      save_brokerage_office: {
        Args: {
          p_active?: boolean
          p_address?: string
          p_contacts?: Json
          p_main_phone?: string
          p_name: string
          p_office_id?: string
          p_project_id: string
        }
        Returns: string
      }
      save_move_in_unit_deal: {
        Args: {
          p_brokerages?: Json
          p_consent_status: string
          p_contract_id: string
          p_customer_id: string
          p_deal_status: string
          p_details?: string
          p_jeonse_enabled: boolean
          p_jeonse_note?: string
          p_monthly_rent_enabled: boolean
          p_monthly_rent_note?: string
          p_project_id: string
          p_sale_enabled: boolean
          p_sale_note?: string
          p_unit_id: string
        }
        Returns: string
      }
      transfer_contract_holder: {
        Args: {
          p_contract_id: string
          p_new_customer_id: string
          p_project_id: string
        }
        Returns: string
      }
      update_cs_ticket: {
        Args: {
          p_assigned_to?: string
          p_clear_assigned_to?: boolean
          p_priority?: string
          p_project_id: string
          p_resolved_at?: string
          p_status?: string
          p_ticket_id: string
        }
        Returns: string
      }
      update_move_in_field_member_display_name: {
        Args: {
          p_display_name: string
          p_member_id: string
          p_project_id: string
        }
        Returns: string
      }
      update_unit_occupancy_status: {
        Args: {
          p_actual_move_in_date?: string
          p_balance_paid_at?: string
          p_clear_actual_move_in_date?: boolean
          p_clear_balance_paid_at?: boolean
          p_clear_last_contact_at?: boolean
          p_clear_next_contact_at?: boolean
          p_clear_planned_move_in_date?: boolean
          p_contact_id?: string
          p_contract_id: string
          p_funding_status?: Database["public"]["Enums"]["funding_status"]
          p_last_contact_at?: string
          p_move_in_status?: Database["public"]["Enums"]["move_in_status"]
          p_next_contact_at?: string
          p_occupancy_intent?: Database["public"]["Enums"]["occupancy_intent"]
          p_planned_move_in_date?: string
          p_project_id: string
          p_reason?: string
          p_unit_id: string
        }
        Returns: string
      }
      upsert_customer_unit_interest: {
        Args: {
          p_assigned_counselor_id?: string
          p_current_status?: Database["public"]["Enums"]["customer_unit_interest_status"]
          p_customer_id: string
          p_interest_level?: string
          p_interest_reason?: string
          p_project_id: string
          p_unit_id: string
        }
        Returns: string
      }
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
      contact_schedule_status: "PENDING" | "SENT" | "FAILED" | "SKIPPED"
      contract_status: "ACTIVE" | "CANCELLED" | "COMPLETED"
      customer_grade: "A" | "B" | "C"
      customer_status: "ACTIVE" | "ARCHIVED"
      customer_unit_interest_status:
        | "ACTIVE"
        | "HOLD"
        | "LOST"
        | "CONTRACTED"
        | "UNIT_SOLD_TO_OTHER"
      funding_status:
        | "NORMAL"
        | "LOAN_NEEDED"
        | "FUNDING_SHORTAGE"
        | "EXISTING_HOME_UNSOLD"
        | "UNKNOWN"
      market_data_scope: "INTERNAL" | "COMPETITOR" | "REGION_TOTAL"
      move_in_status:
        | "NOT_CONTACTED"
        | "CONTACTED"
        | "PLANNED"
        | "DELAYED"
        | "BALANCE_PAID"
        | "MOVED_IN"
      occupancy_intent:
        | "SELF_MOVE_IN"
        | "SALE"
        | "JEONSE"
        | "MONTHLY_RENT"
        | "UNDECIDED"
      organization_status: "ACTIVE" | "INACTIVE"
      project_member_role:
        | "COUNSELOR"
        | "TEAM_LEAD"
        | "PROJECT_ADMIN"
        | "CLIENT_MANAGER"
      project_status: "ACTIVE" | "CLOSED"
      report_phase: "SALES" | "UNSOLD" | "MOVE_IN"
      report_template_source_type: "PHOTO" | "SCREENSHOT" | "EXCEL" | "MANUAL"
      report_type:
        | "MORNING_MEETING"
        | "EVENING_MEETING"
        | "DAILY"
        | "WEEKLY"
        | "MONTHLY"
        | "CLIENT"
        | "EXECUTIVE"
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
  graphql_public: {
    Enums: {},
  },
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
      contact_schedule_status: ["PENDING", "SENT", "FAILED", "SKIPPED"],
      contract_status: ["ACTIVE", "CANCELLED", "COMPLETED"],
      customer_grade: ["A", "B", "C"],
      customer_status: ["ACTIVE", "ARCHIVED"],
      customer_unit_interest_status: [
        "ACTIVE",
        "HOLD",
        "LOST",
        "CONTRACTED",
        "UNIT_SOLD_TO_OTHER",
      ],
      funding_status: [
        "NORMAL",
        "LOAN_NEEDED",
        "FUNDING_SHORTAGE",
        "EXISTING_HOME_UNSOLD",
        "UNKNOWN",
      ],
      market_data_scope: ["INTERNAL", "COMPETITOR", "REGION_TOTAL"],
      move_in_status: [
        "NOT_CONTACTED",
        "CONTACTED",
        "PLANNED",
        "DELAYED",
        "BALANCE_PAID",
        "MOVED_IN",
      ],
      occupancy_intent: [
        "SELF_MOVE_IN",
        "SALE",
        "JEONSE",
        "MONTHLY_RENT",
        "UNDECIDED",
      ],
      organization_status: ["ACTIVE", "INACTIVE"],
      project_member_role: [
        "COUNSELOR",
        "TEAM_LEAD",
        "PROJECT_ADMIN",
        "CLIENT_MANAGER",
      ],
      project_status: ["ACTIVE", "CLOSED"],
      report_phase: ["SALES", "UNSOLD", "MOVE_IN"],
      report_template_source_type: ["PHOTO", "SCREENSHOT", "EXCEL", "MANUAL"],
      report_type: [
        "MORNING_MEETING",
        "EVENING_MEETING",
        "DAILY",
        "WEEKLY",
        "MONTHLY",
        "CLIENT",
        "EXECUTIVE",
      ],
    },
  },
} as const

