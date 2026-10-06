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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      change_history: {
        Row: {
          action: string
          actor_user_id: string | null
          changes: Json | null
          company_id: string | null
          created_at: string
          id: string
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          changes?: Json | null
          company_id?: string | null
          created_at?: string
          id?: string
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          changes?: Json | null
          company_id?: string | null
          created_at?: string
          id?: string
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_invitations: {
        Row: {
          accepted_at: string | null
          accepted_user_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          email: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_memberships: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          assistant_id: string | null
          call_routing_status: string
          company_id: string
          features: Json
          inbound_phone_number: string | null
          included_minutes: number
          seat_limit: number
          updated_at: string
        }
        Insert: {
          assistant_id?: string | null
          call_routing_status?: string
          company_id: string
          features?: Json
          inbound_phone_number?: string | null
          included_minutes?: number
          seat_limit?: number
          updated_at?: string
        }
        Update: {
          assistant_id?: string | null
          call_routing_status?: string
          company_id?: string
          features?: Json
          inbound_phone_number?: string | null
          included_minutes?: number
          seat_limit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_notes: {
        Row: {
          author_user_id: string
          body: string
          company_id: string
          created_at: string
          id: string
          lead_id: string
        }
        Insert: {
          author_user_id: string
          body: string
          company_id: string
          created_at?: string
          id?: string
          lead_id: string
        }
        Update: {
          author_user_id?: string
          body?: string
          company_id?: string
          created_at?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiry_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "frontdesk_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      frontdesk_leads: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assignment_status: string
          assistant_id: string | null
          boiler_error_code: string | null
          boiler_make_model: string | null
          call_summary: string | null
          caller_name: string | null
          caller_phone: string | null
          caller_role: string | null
          carbon_monoxide_concern: boolean | null
          company_id: string | null
          consent_to_callback: boolean | null
          created_at: string
          drainage_blockage: boolean | null
          event_type: string | null
          existing_customer: boolean | null
          full_address: string | null
          has_active_leak: boolean | null
          id: string
          issue_summary: string | null
          leak_contained: boolean | null
          match_reason: string | null
          no_heating: boolean | null
          no_hot_water: boolean | null
          postcode: string | null
          preferred_date: string | null
          preferred_time: string | null
          property_type: string | null
          raw_payload: Json | null
          recommended_business_action: string | null
          service_category: string | null
          status: string | null
          structured_output_name: string | null
          suspected_gas_leak: boolean | null
          updated_at: string
          urgency: string | null
          vapi_call_id: string | null
          vulnerable_occupant: boolean | null
          vulnerable_occupant_notes: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assignment_status?: string
          assistant_id?: string | null
          boiler_error_code?: string | null
          boiler_make_model?: string | null
          call_summary?: string | null
          caller_name?: string | null
          caller_phone?: string | null
          caller_role?: string | null
          carbon_monoxide_concern?: boolean | null
          company_id?: string | null
          consent_to_callback?: boolean | null
          created_at?: string
          drainage_blockage?: boolean | null
          event_type?: string | null
          existing_customer?: boolean | null
          full_address?: string | null
          has_active_leak?: boolean | null
          id?: string
          issue_summary?: string | null
          leak_contained?: boolean | null
          match_reason?: string | null
          no_heating?: boolean | null
          no_hot_water?: boolean | null
          postcode?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          property_type?: string | null
          raw_payload?: Json | null
          recommended_business_action?: string | null
          service_category?: string | null
          status?: string | null
          structured_output_name?: string | null
          suspected_gas_leak?: boolean | null
          updated_at?: string
          urgency?: string | null
          vapi_call_id?: string | null
          vulnerable_occupant?: boolean | null
          vulnerable_occupant_notes?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assignment_status?: string
          assistant_id?: string | null
          boiler_error_code?: string | null
          boiler_make_model?: string | null
          call_summary?: string | null
          caller_name?: string | null
          caller_phone?: string | null
          caller_role?: string | null
          carbon_monoxide_concern?: boolean | null
          company_id?: string | null
          consent_to_callback?: boolean | null
          created_at?: string
          drainage_blockage?: boolean | null
          event_type?: string | null
          existing_customer?: boolean | null
          full_address?: string | null
          has_active_leak?: boolean | null
          id?: string
          issue_summary?: string | null
          leak_contained?: boolean | null
          match_reason?: string | null
          no_heating?: boolean | null
          no_hot_water?: boolean | null
          postcode?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          property_type?: string | null
          raw_payload?: Json | null
          recommended_business_action?: string | null
          service_category?: string | null
          status?: string | null
          structured_output_name?: string | null
          suspected_gas_leak?: boolean | null
          updated_at?: string
          urgency?: string | null
          vapi_call_id?: string | null
          vulnerable_occupant?: boolean | null
          vulnerable_occupant_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frontdesk_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      frontdesk_pilot_interests: {
        Row: {
          business_name: string | null
          calls_per_week: string | null
          city: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          notes: string | null
          phone: string | null
          status: string | null
          website: string | null
        }
        Insert: {
          business_name?: string | null
          calls_per_week?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          website?: string | null
        }
        Update: {
          business_name?: string | null
          calls_per_week?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          website?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          company_id: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_manager: { Args: { _company_id: string }; Returns: boolean }
      is_company_member: { Args: { _company_id: string }; Returns: boolean }
      is_platform_owner: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "platform_owner" | "manager" | "employee"
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
      app_role: ["platform_owner", "manager", "employee"],
    },
  },
} as const
