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
      activists: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          created_at: string
          does_install: boolean
          id: string
          lat: number | null
          lng: number | null
          name: string
          notes: string | null
          phone: string
          service_radius_km: number
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          created_at?: string
          does_install?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          notes?: string | null
          phone: string
          service_radius_km?: number
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          created_at?: string
          does_install?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          notes?: string | null
          phone?: string
          service_radius_km?: number
        }
        Relationships: []
      }
      phone_otps: {
        Row: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          verified: boolean
          verify_token: string | null
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          verified?: boolean
          verify_token?: string | null
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          verified?: boolean
          verify_token?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          available: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          installable: boolean
          name: string
          orderable: boolean
          price: number | null
          sort_order: number
          special_price: number | null
          visible: boolean
        }
        Insert: {
          available?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          installable?: boolean
          name: string
          orderable?: boolean
          price?: number | null
          sort_order?: number
          special_price?: number | null
          visible?: boolean
        }
        Update: {
          available?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          installable?: boolean
          name?: string
          orderable?: boolean
          price?: number | null
          sort_order?: number
          special_price?: number | null
          visible?: boolean
        }
        Relationships: []
      }
      request_events: {
        Row: {
          created_at: string
          event: string
          id: string
          request_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          request_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_items: {
        Row: {
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          request_id: string
        }
        Insert: {
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          request_id: string
        }
        Update: {
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          activist_ids: string[]
          address: string
          admin_notes: string | null
          city: string | null
          created_at: string
          customer_response: string | null
          followup_due_at: string | null
          followup_sent_at: string | null
          full_name: string
          house_number: string | null
          id: string
          lat: number | null
          lng: number | null
          notes: string | null
          phone: string
          sent_to_activists_at: string | null
          status: string
          street: string | null
          track_token: string
          updated_at: string
          urgent: boolean
          wants_install: boolean
          zip: string | null
        }
        Insert: {
          activist_ids?: string[]
          address: string
          admin_notes?: string | null
          city?: string | null
          created_at?: string
          customer_response?: string | null
          followup_due_at?: string | null
          followup_sent_at?: string | null
          full_name: string
          house_number?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          phone: string
          sent_to_activists_at?: string | null
          status?: string
          street?: string | null
          track_token?: string
          updated_at?: string
          urgent?: boolean
          wants_install?: boolean
          zip?: string | null
        }
        Update: {
          activist_ids?: string[]
          address?: string
          admin_notes?: string | null
          city?: string | null
          created_at?: string
          customer_response?: string | null
          followup_due_at?: string | null
          followup_sent_at?: string | null
          full_name?: string
          house_number?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          phone?: string
          sent_to_activists_at?: string | null
          status?: string
          street?: string | null
          track_token?: string
          updated_at?: string
          urgent?: boolean
          wants_install?: boolean
          zip?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          activists_per_request: number
          admin_phone: string | null
          followup_business_days: number
          hero_subtitle: string
          hero_title: string
          id: number
          show_public_map: boolean
        }
        Insert: {
          activists_per_request?: number
          admin_phone?: string | null
          followup_business_days?: number
          hero_subtitle?: string
          hero_title?: string
          id?: number
          show_public_map?: boolean
        }
        Update: {
          activists_per_request?: number
          admin_phone?: string | null
          followup_business_days?: number
          hero_subtitle?: string
          hero_title?: string
          id?: number
          show_public_map?: boolean
        }
        Relationships: []
      }
      sms_log: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string | null
          response: string | null
          status: string
          to_phone: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: string | null
          response?: string | null
          status: string
          to_phone: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string | null
          response?: string | null
          status?: string
          to_phone?: string
        }
        Relationships: []
      }
      sms_templates: {
        Row: {
          body: string
          key: string
          label: string
        }
        Insert: {
          body: string
          key: string
          label: string
        }
        Update: {
          body?: string
          key?: string
          label?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "area_manager" | "staff"
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
      app_role: ["admin", "area_manager", "staff"],
    },
  },
} as const
