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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointment_types: {
        Row: {
          auto_accept_bookings: boolean
          buffer_after_minutes: number
          buffer_before_minutes: number
          color: string | null
          content_blocks: Json
          created_at: string
          currency: string
          description: string | null
          duration_minutes: number
          entity_id: string
          faq: Json
          gallery_images: string[]
          highlights: Json
          id: string
          is_active: boolean
          location_details: string | null
          location_type: Database["public"]["Enums"]["appointment_location_type"]
          max_advance_days: number
          min_notice_hours: number
          position: number
          price_cents: number | null
          promo_price_cents: number | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          auto_accept_bookings?: boolean
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          color?: string | null
          content_blocks?: Json
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes: number
          entity_id: string
          faq?: Json
          gallery_images?: string[]
          highlights?: Json
          id?: string
          is_active?: boolean
          location_details?: string | null
          location_type?: Database["public"]["Enums"]["appointment_location_type"]
          max_advance_days?: number
          min_notice_hours?: number
          position?: number
          price_cents?: number | null
          promo_price_cents?: number | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          auto_accept_bookings?: boolean
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          color?: string | null
          content_blocks?: Json
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number
          entity_id?: string
          faq?: Json
          gallery_images?: string[]
          highlights?: Json
          id?: string
          is_active?: boolean
          location_details?: string | null
          location_type?: Database["public"]["Enums"]["appointment_location_type"]
          max_advance_days?: number
          min_notice_hours?: number
          position?: number
          price_cents?: number | null
          promo_price_cents?: number | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_types_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_types_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      availability_exceptions: {
        Row: {
          created_at: string
          date: string
          end_time: string | null
          entity_id: string
          id: string
          is_blocked: boolean
          reason: string | null
          start_time: string | null
        }
        Insert: {
          created_at?: string
          date: string
          end_time?: string | null
          entity_id: string
          id?: string
          is_blocked?: boolean
          reason?: string | null
          start_time?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string | null
          entity_id?: string
          id?: string
          is_blocked?: boolean
          reason?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_exceptions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_exceptions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      availability_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          entity_id: string
          id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          entity_id: string
          id?: string
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          entity_id?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_schedules_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_schedules_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      bookings: {
        Row: {
          appointment_type_id: string
          booker_email: string
          booker_message: string | null
          booker_name: string
          booker_phone: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_id: string | null
          created_at: string
          end_at: string
          entity_id: string
          id: string
          notes: string | null
          start_at: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          appointment_type_id: string
          booker_email: string
          booker_message?: string | null
          booker_name: string
          booker_phone?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id?: string | null
          created_at?: string
          end_at: string
          entity_id: string
          id?: string
          notes?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          appointment_type_id?: string
          booker_email?: string
          booker_message?: string | null
          booker_name?: string
          booker_phone?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id?: string | null
          created_at?: string
          end_at?: string
          entity_id?: string
          id?: string
          notes?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      clients: {
        Row: {
          bookings_count: number
          created_at: string
          email: string
          entity_id: string
          id: string
          last_booking_at: string | null
          name: string
          notes: string | null
          phone: string | null
          tags: string[]
          total_revenue_cents: number
          updated_at: string
        }
        Insert: {
          bookings_count?: number
          created_at?: string
          email: string
          entity_id: string
          id?: string
          last_booking_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          tags?: string[]
          total_revenue_cents?: number
          updated_at?: string
        }
        Update: {
          bookings_count?: number
          created_at?: string
          email?: string
          entity_id?: string
          id?: string
          last_booking_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          tags?: string[]
          total_revenue_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      discount_code_categories: {
        Row: {
          category: string
          code_id: string
        }
        Insert: {
          category: string
          code_id: string
        }
        Update: {
          category?: string
          code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_code_categories_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_code_products: {
        Row: {
          code_id: string
          product_id: string
        }
        Insert: {
          code_id: string
          product_id: string
        }
        Update: {
          code_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_code_products_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_code_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_code_uses: {
        Row: {
          code_id: string
          discount_amount_cents: number
          id: string
          order_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          code_id: string
          discount_amount_cents: number
          id?: string
          order_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          code_id?: string
          discount_amount_cents?: number
          id?: string
          order_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_code_uses_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          applies_to: Database["public"]["Enums"]["discount_applies_to"]
          code: string
          created_at: string
          ends_at: string | null
          entity_id: string
          id: string
          is_active: boolean
          max_uses_per_user: number
          max_uses_total: number | null
          min_purchase_cents: number | null
          starts_at: string | null
          type: Database["public"]["Enums"]["discount_code_type"]
          updated_at: string
          value: number
        }
        Insert: {
          applies_to?: Database["public"]["Enums"]["discount_applies_to"]
          code: string
          created_at?: string
          ends_at?: string | null
          entity_id: string
          id?: string
          is_active?: boolean
          max_uses_per_user?: number
          max_uses_total?: number | null
          min_purchase_cents?: number | null
          starts_at?: string | null
          type: Database["public"]["Enums"]["discount_code_type"]
          updated_at?: string
          value: number
        }
        Update: {
          applies_to?: Database["public"]["Enums"]["discount_applies_to"]
          code?: string
          created_at?: string
          ends_at?: string | null
          entity_id?: string
          id?: string
          is_active?: boolean
          max_uses_per_user?: number
          max_uses_total?: number | null
          min_purchase_cents?: number | null
          starts_at?: string | null
          type?: Database["public"]["Enums"]["discount_code_type"]
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_codes_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      entity: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          followers_count: number
          following_count: number
          id: string
          location: string | null
          role: string | null
          slug: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          followers_count?: number
          following_count?: number
          id?: string
          location?: string | null
          role?: string | null
          slug: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          followers_count?: number
          following_count?: number
          id?: string
          location?: string | null
          role?: string | null
          slug?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      entity_analytics_daily: {
        Row: {
          day: string
          dimension_key: string
          distinct_count: number
          entity_id: string
          event_count: number
          event_type: Database["public"]["Enums"]["analytics_event_type"]
          updated_at: string
        }
        Insert: {
          day: string
          dimension_key?: string
          distinct_count?: number
          entity_id: string
          event_count?: number
          event_type: Database["public"]["Enums"]["analytics_event_type"]
          updated_at?: string
        }
        Update: {
          day?: string
          dimension_key?: string
          distinct_count?: number
          entity_id?: string
          event_count?: number
          event_type?: Database["public"]["Enums"]["analytics_event_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_analytics_daily_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_analytics_daily_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      entity_analytics_events: {
        Row: {
          entity_id: string
          event_type: Database["public"]["Enums"]["analytics_event_type"]
          id: string
          metadata: Json
          occurred_at: string
          resource_id: string | null
          section_type: Database["public"]["Enums"]["menu_section_type"] | null
          visitor_key: string | null
        }
        Insert: {
          entity_id: string
          event_type: Database["public"]["Enums"]["analytics_event_type"]
          id?: string
          metadata?: Json
          occurred_at?: string
          resource_id?: string | null
          section_type?: Database["public"]["Enums"]["menu_section_type"] | null
          visitor_key?: string | null
        }
        Update: {
          entity_id?: string
          event_type?: Database["public"]["Enums"]["analytics_event_type"]
          id?: string
          metadata?: Json
          occurred_at?: string
          resource_id?: string | null
          section_type?: Database["public"]["Enums"]["menu_section_type"] | null
          visitor_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_analytics_events_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_analytics_events_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      entity_analytics_rollup_state: {
        Row: {
          id: number
          last_completed_day: string
          updated_at: string
        }
        Insert: {
          id?: number
          last_completed_day?: string
          updated_at?: string
        }
        Update: {
          id?: number
          last_completed_day?: string
          updated_at?: string
        }
        Relationships: []
      }
      entity_contact_info: {
        Row: {
          contact_email: string | null
          contact_email_public: boolean
          contact_phone: string | null
          contact_phone_public: boolean
          created_at: string
          entity_id: string
          message_enabled: boolean
          opening_hours: Json
          opening_hours_enabled: boolean
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_email_public?: boolean
          contact_phone?: string | null
          contact_phone_public?: boolean
          created_at?: string
          entity_id: string
          message_enabled?: boolean
          opening_hours?: Json
          opening_hours_enabled?: boolean
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_email_public?: boolean
          contact_phone?: string | null
          contact_phone_public?: boolean
          created_at?: string
          entity_id?: string
          message_enabled?: boolean
          opening_hours?: Json
          opening_hours_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_contact_info_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_contact_info_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      entity_faq_items: {
        Row: {
          answer: string
          created_at: string
          entity_id: string
          id: string
          position: number
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          entity_id: string
          id?: string
          position?: number
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          entity_id?: string
          id?: string
          position?: number
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_faq_items_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_faq_items_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      entity_files: {
        Row: {
          created_at: string
          entity_id: string
          id: string
          mime_type: string | null
          name: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          id?: string
          mime_type?: string | null
          name: string
          size_bytes: number
          storage_path: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          id?: string
          mime_type?: string | null
          name?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_files_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_files_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      entity_global_features: {
        Row: {
          created_at: string
          entity_id: string
          id: string
          is_active: boolean
          is_configured: boolean
          type: Database["public"]["Enums"]["global_feature_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          id?: string
          is_active?: boolean
          is_configured?: boolean
          type: Database["public"]["Enums"]["global_feature_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          id?: string
          is_active?: boolean
          is_configured?: boolean
          type?: Database["public"]["Enums"]["global_feature_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_global_features_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_global_features_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      entity_history: {
        Row: {
          blocks: Json
          content: string
          created_at: string
          entity_id: string
          updated_at: string
        }
        Insert: {
          blocks?: Json
          content?: string
          created_at?: string
          entity_id: string
          updated_at?: string
        }
        Update: {
          blocks?: Json
          content?: string
          created_at?: string
          entity_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_history_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_history_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      entity_home_widgets: {
        Row: {
          config: Json
          created_at: string
          entity_id: string
          id: string
          is_active: boolean
          position: number
          type: Database["public"]["Enums"]["home_widget_type"]
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          entity_id: string
          id?: string
          is_active?: boolean
          position?: number
          type: Database["public"]["Enums"]["home_widget_type"]
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          entity_id?: string
          id?: string
          is_active?: boolean
          position?: number
          type?: Database["public"]["Enums"]["home_widget_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_home_widgets_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_home_widgets_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      entity_menu_sections: {
        Row: {
          created_at: string
          entity_id: string
          id: string
          is_active: boolean
          is_configured: boolean
          position: number
          type: Database["public"]["Enums"]["menu_section_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          id?: string
          is_active?: boolean
          is_configured?: boolean
          position?: number
          type: Database["public"]["Enums"]["menu_section_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          id?: string
          is_active?: boolean
          is_configured?: boolean
          position?: number
          type?: Database["public"]["Enums"]["menu_section_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_menu_sections_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_menu_sections_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      entity_messages: {
        Row: {
          body: string
          created_at: string
          entity_id: string
          id: string
          sender_email: string
          sender_name: string
          sender_user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          entity_id: string
          id?: string
          sender_email: string
          sender_name: string
          sender_user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          entity_id?: string
          id?: string
          sender_email?: string
          sender_name?: string
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_messages_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_messages_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      entity_product_categories: {
        Row: {
          created_at: string
          entity_id: string
          id: string
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          id?: string
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_product_categories_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_product_categories_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      entity_team_invitations: {
        Row: {
          created_at: string
          email: string
          entity_id: string
          id: string
          invited_by: string
          role_id: string
          status: Database["public"]["Enums"]["entity_team_invite_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          entity_id: string
          id?: string
          invited_by: string
          role_id: string
          status?: Database["public"]["Enums"]["entity_team_invite_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          entity_id?: string
          id?: string
          invited_by?: string
          role_id?: string
          status?: Database["public"]["Enums"]["entity_team_invite_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_team_invitations_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_team_invitations_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
          {
            foreignKeyName: "entity_team_invitations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "entity_team_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_team_members: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          entity_id: string
          id: string
          joined_at: string
          role_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          entity_id: string
          id?: string
          joined_at?: string
          role_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          entity_id?: string
          id?: string
          joined_at?: string
          role_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_team_members_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_team_members_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
          {
            foreignKeyName: "entity_team_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "entity_team_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_team_roles: {
        Row: {
          bg: string
          created_at: string
          entity_id: string
          fg: string
          id: string
          inviteable: boolean
          label: string
          locked: boolean
          permissions: Json
          position: number
          role_key: string
          updated_at: string
        }
        Insert: {
          bg: string
          created_at?: string
          entity_id: string
          fg: string
          id?: string
          inviteable?: boolean
          label: string
          locked?: boolean
          permissions?: Json
          position?: number
          role_key: string
          updated_at?: string
        }
        Update: {
          bg?: string
          created_at?: string
          entity_id?: string
          fg?: string
          id?: string
          inviteable?: boolean
          label?: string
          locked?: boolean
          permissions?: Json
          position?: number
          role_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_team_roles_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_team_roles_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          attendee_email: string
          attendee_name: string
          attendee_phone: string | null
          created_at: string
          entity_id: string
          event_id: string
          id: string
          message: string | null
          status: Database["public"]["Enums"]["event_registration_status"]
        }
        Insert: {
          attendee_email: string
          attendee_name: string
          attendee_phone?: string | null
          created_at?: string
          entity_id: string
          event_id: string
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["event_registration_status"]
        }
        Update: {
          attendee_email?: string
          attendee_name?: string
          attendee_phone?: string | null
          created_at?: string
          entity_id?: string
          event_id?: string
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["event_registration_status"]
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          content_blocks: Json
          created_at: string
          currency: string
          description: string | null
          end_at: string | null
          entity_id: string
          faq: Json
          gallery_images: string[]
          highlights: Json
          id: string
          is_published: boolean
          location_details: string | null
          location_type: Database["public"]["Enums"]["event_location_type"]
          position: number
          price_cents: number | null
          slug: string
          start_at: string
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          content_blocks?: Json
          created_at?: string
          currency?: string
          description?: string | null
          end_at?: string | null
          entity_id: string
          faq?: Json
          gallery_images?: string[]
          highlights?: Json
          id?: string
          is_published?: boolean
          location_details?: string | null
          location_type?: Database["public"]["Enums"]["event_location_type"]
          position?: number
          price_cents?: number | null
          slug: string
          start_at: string
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          content_blocks?: Json
          created_at?: string
          currency?: string
          description?: string | null
          end_at?: string | null
          entity_id?: string
          faq?: Json
          gallery_images?: string[]
          highlights?: Json
          id?: string
          is_published?: boolean
          location_details?: string | null
          location_type?: Database["public"]["Enums"]["event_location_type"]
          position?: number
          price_cents?: number | null
          slug?: string
          start_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followed_entity_id: string
          follower_user_id: string
          id: string
        }
        Insert: {
          created_at?: string
          followed_entity_id: string
          follower_user_id: string
          id?: string
        }
        Update: {
          created_at?: string
          followed_entity_id?: string
          follower_user_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followed_entity_id_fkey"
            columns: ["followed_entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_followed_entity_id_fkey"
            columns: ["followed_entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_entity_id: string | null
          created_at: string
          id: string
          read_at: string | null
          recipient_user_id: string
          target_publication_id: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          actor_entity_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_user_id: string
          target_publication_id?: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          actor_entity_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_user_id?: string
          target_publication_id?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_entity_id_fkey"
            columns: ["actor_entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_entity_id_fkey"
            columns: ["actor_entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
          {
            foreignKeyName: "notifications_target_publication_id_fkey"
            columns: ["target_publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
        ]
      }
      product_answers: {
        Row: {
          answer_text: string
          answerer_user_id: string
          created_at: string
          helpful_count: number
          id: string
          is_seller: boolean
          question_id: string
          status: Database["public"]["Enums"]["product_answer_status"]
        }
        Insert: {
          answer_text: string
          answerer_user_id: string
          created_at?: string
          helpful_count?: number
          id?: string
          is_seller?: boolean
          question_id: string
          status?: Database["public"]["Enums"]["product_answer_status"]
        }
        Update: {
          answer_text?: string
          answerer_user_id?: string
          created_at?: string
          helpful_count?: number
          id?: string
          is_seller?: boolean
          question_id?: string
          status?: Database["public"]["Enums"]["product_answer_status"]
        }
        Relationships: [
          {
            foreignKeyName: "product_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "product_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      product_media: {
        Row: {
          alt_text: string | null
          created_at: string
          display_order: number
          id: string
          media_type: Database["public"]["Enums"]["product_media_type"]
          product_id: string
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          media_type: Database["public"]["Enums"]["product_media_type"]
          product_id: string
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          media_type?: Database["public"]["Enums"]["product_media_type"]
          product_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_questions: {
        Row: {
          asker_user_id: string
          created_at: string
          helpful_count: number
          id: string
          product_id: string
          question_text: string
          status: Database["public"]["Enums"]["product_question_status"]
        }
        Insert: {
          asker_user_id: string
          created_at?: string
          helpful_count?: number
          id?: string
          product_id: string
          question_text: string
          status?: Database["public"]["Enums"]["product_question_status"]
        }
        Update: {
          asker_user_id?: string
          created_at?: string
          helpful_count?: number
          id?: string
          product_id?: string
          question_text?: string
          status?: Database["public"]["Enums"]["product_question_status"]
        }
        Relationships: [
          {
            foreignKeyName: "product_questions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_review_photos: {
        Row: {
          created_at: string
          display_order: number
          id: string
          review_id: string
          url: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          review_id: string
          url: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          review_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_review_photos_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          buyer_user_id: string
          content: string
          created_at: string
          helpful_count: number
          id: string
          is_verified_purchase: boolean
          moderated_at: string | null
          order_id: string | null
          product_id: string
          rating: number
          seller_replied_at: string | null
          seller_reply: string | null
          status: Database["public"]["Enums"]["product_review_status"]
          title: string | null
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          buyer_user_id: string
          content: string
          created_at?: string
          helpful_count?: number
          id?: string
          is_verified_purchase?: boolean
          moderated_at?: string | null
          order_id?: string | null
          product_id: string
          rating: number
          seller_replied_at?: string | null
          seller_reply?: string | null
          status?: Database["public"]["Enums"]["product_review_status"]
          title?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          buyer_user_id?: string
          content?: string
          created_at?: string
          helpful_count?: number
          id?: string
          is_verified_purchase?: boolean
          moderated_at?: string | null
          order_id?: string | null
          product_id?: string
          rating?: number
          seller_replied_at?: string | null
          seller_reply?: string | null
          status?: Database["public"]["Enums"]["product_review_status"]
          title?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_slug_history: {
        Row: {
          changed_at: string
          entity_id: string
          id: string
          new_slug: string
          old_slug: string
          product_id: string
        }
        Insert: {
          changed_at?: string
          entity_id: string
          id?: string
          new_slug: string
          old_slug: string
          product_id: string
        }
        Update: {
          changed_at?: string
          entity_id?: string
          id?: string
          new_slug?: string
          old_slug?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_slug_history_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_slug_history_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
          {
            foreignKeyName: "product_slug_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json
          created_at: string
          id: string
          is_active: boolean
          price_cents_override: number | null
          primary_image_url: string | null
          product_id: string
          sku: string | null
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          attributes: Json
          created_at?: string
          id?: string
          is_active?: boolean
          price_cents_override?: number | null
          primary_image_url?: string | null
          product_id: string
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          attributes?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          price_cents_override?: number | null
          primary_image_url?: string | null
          product_id?: string
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          archived_at: string | null
          bullet_points: Json
          category: string | null
          category_id: string | null
          content_blocks: Json
          created_at: string
          currency: string
          custom_details: Json
          delivery_enabled: boolean
          description_long: string | null
          description_short: string
          digital_file_format:
            | Database["public"]["Enums"]["digital_file_format"]
            | null
          digital_file_id: string | null
          digital_file_size_bytes: number | null
          digital_file_url: string | null
          digital_language: string | null
          digital_license: Database["public"]["Enums"]["digital_license"] | null
          digital_pages_or_duration: number | null
          digital_preview_url: string | null
          entity_id: string
          faq: Json
          id: string
          og_image_url: string | null
          physical_brand: string | null
          physical_color: string | null
          physical_condition:
            | Database["public"]["Enums"]["physical_condition_t"]
            | null
          physical_dimensions_cm: Json | null
          physical_material: string | null
          physical_pickup_instructions: string | null
          physical_pickup_location: string | null
          physical_size: string | null
          physical_stock_quantity: number | null
          physical_stock_unlimited: boolean | null
          physical_weight_grams: number | null
          pickup_enabled: boolean
          price_cents: number
          published_at: string | null
          sale_ends_at: string | null
          sale_price_cents: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          tags: string[]
          title: string
          type: Database["public"]["Enums"]["product_type"]
          updated_at: string
          vat_included: boolean
          vat_rate: number | null
        }
        Insert: {
          archived_at?: string | null
          bullet_points?: Json
          category?: string | null
          category_id?: string | null
          content_blocks?: Json
          created_at?: string
          currency?: string
          custom_details?: Json
          delivery_enabled?: boolean
          description_long?: string | null
          description_short: string
          digital_file_format?:
            | Database["public"]["Enums"]["digital_file_format"]
            | null
          digital_file_id?: string | null
          digital_file_size_bytes?: number | null
          digital_file_url?: string | null
          digital_language?: string | null
          digital_license?:
            | Database["public"]["Enums"]["digital_license"]
            | null
          digital_pages_or_duration?: number | null
          digital_preview_url?: string | null
          entity_id: string
          faq?: Json
          id?: string
          og_image_url?: string | null
          physical_brand?: string | null
          physical_color?: string | null
          physical_condition?:
            | Database["public"]["Enums"]["physical_condition_t"]
            | null
          physical_dimensions_cm?: Json | null
          physical_material?: string | null
          physical_pickup_instructions?: string | null
          physical_pickup_location?: string | null
          physical_size?: string | null
          physical_stock_quantity?: number | null
          physical_stock_unlimited?: boolean | null
          physical_weight_grams?: number | null
          pickup_enabled?: boolean
          price_cents: number
          published_at?: string | null
          sale_ends_at?: string | null
          sale_price_cents?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          tags?: string[]
          title: string
          type: Database["public"]["Enums"]["product_type"]
          updated_at?: string
          vat_included?: boolean
          vat_rate?: number | null
        }
        Update: {
          archived_at?: string | null
          bullet_points?: Json
          category?: string | null
          category_id?: string | null
          content_blocks?: Json
          created_at?: string
          currency?: string
          custom_details?: Json
          delivery_enabled?: boolean
          description_long?: string | null
          description_short?: string
          digital_file_format?:
            | Database["public"]["Enums"]["digital_file_format"]
            | null
          digital_file_id?: string | null
          digital_file_size_bytes?: number | null
          digital_file_url?: string | null
          digital_language?: string | null
          digital_license?:
            | Database["public"]["Enums"]["digital_license"]
            | null
          digital_pages_or_duration?: number | null
          digital_preview_url?: string | null
          entity_id?: string
          faq?: Json
          id?: string
          og_image_url?: string | null
          physical_brand?: string | null
          physical_color?: string | null
          physical_condition?:
            | Database["public"]["Enums"]["physical_condition_t"]
            | null
          physical_dimensions_cm?: Json | null
          physical_material?: string | null
          physical_pickup_instructions?: string | null
          physical_pickup_location?: string | null
          physical_size?: string | null
          physical_stock_quantity?: number | null
          physical_stock_unlimited?: boolean | null
          physical_weight_grams?: number | null
          pickup_enabled?: boolean
          price_cents?: number
          published_at?: string | null
          sale_ends_at?: string | null
          sale_price_cents?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          tags?: string[]
          title?: string
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string
          vat_included?: boolean
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "entity_product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_digital_file_id_fkey"
            columns: ["digital_file_id"]
            isOneToOne: false
            referencedRelation: "entity_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      publication_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          publication_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          publication_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          publication_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_comments_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_media: {
        Row: {
          alt_text: string | null
          created_at: string
          height: number | null
          id: string
          position: number
          publication_id: string
          type: Database["public"]["Enums"]["publication_media_type"]
          url: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          height?: number | null
          id?: string
          position?: number
          publication_id: string
          type: Database["public"]["Enums"]["publication_media_type"]
          url: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          height?: number | null
          id?: string
          position?: number
          publication_id?: string
          type?: Database["public"]["Enums"]["publication_media_type"]
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "publication_media_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
        ]
      }
      publications: {
        Row: {
          comments_count: number
          content: string | null
          created_at: string
          entity_id: string
          id: string
          published_at: string | null
          scheduled_for: string | null
          slug: string
          status: Database["public"]["Enums"]["publication_status"]
          title: string
          updated_at: string
        }
        Insert: {
          comments_count?: number
          content?: string | null
          created_at?: string
          entity_id: string
          id?: string
          published_at?: string | null
          scheduled_for?: string | null
          slug: string
          status: Database["public"]["Enums"]["publication_status"]
          title: string
          updated_at?: string
        }
        Update: {
          comments_count?: number
          content?: string | null
          created_at?: string
          entity_id?: string
          id?: string
          published_at?: string | null
          scheduled_for?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["publication_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "publications_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publications_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      service_reviews: {
        Row: {
          appointment_type_id: string
          booking_id: string | null
          buyer_user_id: string
          content: string
          created_at: string
          entity_id: string
          helpful_count: number
          id: string
          is_verified_purchase: boolean
          moderated_at: string | null
          rating: number
          seller_replied_at: string | null
          seller_reply: string | null
          status: Database["public"]["Enums"]["product_review_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          appointment_type_id: string
          booking_id?: string | null
          buyer_user_id: string
          content: string
          created_at?: string
          entity_id: string
          helpful_count?: number
          id?: string
          is_verified_purchase?: boolean
          moderated_at?: string | null
          rating: number
          seller_replied_at?: string | null
          seller_reply?: string | null
          status?: Database["public"]["Enums"]["product_review_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          appointment_type_id?: string
          booking_id?: string | null
          buyer_user_id?: string
          content?: string
          created_at?: string
          entity_id?: string
          helpful_count?: number
          id?: string
          is_verified_purchase?: boolean
          moderated_at?: string | null
          rating?: number
          seller_replied_at?: string | null
          seller_reply?: string | null
          status?: Database["public"]["Enums"]["product_review_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_reviews_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_reviews_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_reviews_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      wishlist_items: {
        Row: {
          added_at: string
          id: string
          note: string | null
          price_cents_at_add: number | null
          product_id: string
          user_id: string
          variant_id: string | null
        }
        Insert: {
          added_at?: string
          id?: string
          note?: string | null
          price_cents_at_add?: number | null
          product_id: string
          user_id: string
          variant_id?: string | null
        }
        Update: {
          added_at?: string
          id?: string
          note?: string | null
          price_cents_at_add?: number | null
          product_id?: string
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      publication_comments_with_author: {
        Row: {
          author_avatar_url: string | null
          author_display_name: string | null
          author_entity_id: string | null
          author_slug: string | null
          content: string | null
          created_at: string | null
          id: string | null
          publication_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publication_comments_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      analytics_event_bucket_index: {
        Args: {
          p_from: string
          p_occurred_at: string
          p_period: string
          p_to: string
        }
        Returns: number
      }
      analytics_rollup_cutoff: { Args: never; Returns: string }
      backfill_entity_analytics_daily: {
        Args: { p_from_day: string; p_to_day: string }
        Returns: Json
      }
      bucket_analytics_distinct_visitors: {
        Args: {
          p_entity_id: string
          p_event_types: Database["public"]["Enums"]["analytics_event_type"][]
          p_from: string
          p_period: string
          p_resource_id?: string
          p_section_type?: Database["public"]["Enums"]["menu_section_type"]
          p_to: string
        }
        Returns: {
          bucket_index: number
          event_count: number
        }[]
      }
      bucket_analytics_distinct_visitors_hybrid: {
        Args: {
          p_entity_id: string
          p_event_types: Database["public"]["Enums"]["analytics_event_type"][]
          p_from: string
          p_period: string
          p_resource_id?: string
          p_section_type?: Database["public"]["Enums"]["menu_section_type"]
          p_to: string
        }
        Returns: {
          bucket_index: number
          event_count: number
        }[]
      }
      bucket_analytics_events: {
        Args: {
          p_entity_id: string
          p_event_types: Database["public"]["Enums"]["analytics_event_type"][]
          p_from: string
          p_period: string
          p_resource_id?: string
          p_section_type?: Database["public"]["Enums"]["menu_section_type"]
          p_to: string
        }
        Returns: {
          bucket_index: number
          event_count: number
        }[]
      }
      bucket_analytics_events_hybrid: {
        Args: {
          p_entity_id: string
          p_event_types: Database["public"]["Enums"]["analytics_event_type"][]
          p_from: string
          p_period: string
          p_resource_id?: string
          p_section_type?: Database["public"]["Enums"]["menu_section_type"]
          p_to: string
        }
        Returns: {
          bucket_index: number
          event_count: number
        }[]
      }
      check_comment_rate_limit: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      count_analytics_distinct_visitors: {
        Args: {
          p_entity_id: string
          p_event_types: Database["public"]["Enums"]["analytics_event_type"][]
          p_from: string
          p_resource_id?: string
          p_section_type?: Database["public"]["Enums"]["menu_section_type"]
          p_to: string
        }
        Returns: number
      }
      count_analytics_events: {
        Args: {
          p_entity_id: string
          p_event_types: Database["public"]["Enums"]["analytics_event_type"][]
          p_from: string
          p_resource_id?: string
          p_section_type?: Database["public"]["Enums"]["menu_section_type"]
          p_to: string
        }
        Returns: number
      }
      count_analytics_events_hybrid: {
        Args: {
          p_entity_id: string
          p_event_types: Database["public"]["Enums"]["analytics_event_type"][]
          p_from: string
          p_resource_id?: string
          p_section_type?: Database["public"]["Enums"]["menu_section_type"]
          p_to: string
        }
        Returns: number
      }
      count_event_registrations: {
        Args: { p_event_id: string }
        Returns: number
      }
      generate_unique_appointment_slug: {
        Args: { p_entity_id: string; p_title: string }
        Returns: string
      }
      generate_unique_publication_slug: {
        Args: { p_entity_id: string; p_title: string }
        Returns: string
      }
      generate_unique_slug_from_email: {
        Args: { email_input: string }
        Returns: string
      }
      get_analyse_event_data: {
        Args: {
          p_entity_id: string
          p_from: string
          p_period: string
          p_prev_from: string
          p_prev_to: string
          p_to: string
        }
        Returns: Json
      }
      get_analyse_news_data: {
        Args: {
          p_entity_id: string
          p_from: string
          p_period: string
          p_prev_from: string
          p_prev_to: string
          p_to: string
        }
        Returns: Json
      }
      get_analyse_ranking_chart_buckets: {
        Args: {
          p_entity_id: string
          p_from: string
          p_period: string
          p_resource_id?: string
          p_scope: string
          p_section_type?: Database["public"]["Enums"]["menu_section_type"]
          p_to: string
        }
        Returns: Json
      }
      get_analyse_scope_data: {
        Args: {
          p_entity_id: string
          p_from: string
          p_period: string
          p_prev_from: string
          p_prev_to: string
          p_scope: string
          p_to: string
        }
        Returns: Json
      }
      get_analyse_service_data: {
        Args: {
          p_entity_id: string
          p_from: string
          p_period: string
          p_prev_from: string
          p_prev_to: string
          p_to: string
        }
        Returns: Json
      }
      get_analyse_shop_data: {
        Args: {
          p_entity_id: string
          p_from: string
          p_period: string
          p_prev_from: string
          p_prev_to: string
          p_to: string
        }
        Returns: Json
      }
      get_analyse_web_data: {
        Args: {
          p_entity_id: string
          p_from: string
          p_period: string
          p_prev_from: string
          p_prev_to: string
          p_to: string
        }
        Returns: Json
      }
      get_user_entity_ids: { Args: never; Returns: string[] }
      group_analytics_by_resource: {
        Args: {
          p_entity_id: string
          p_event_types: Database["public"]["Enums"]["analytics_event_type"][]
          p_from: string
          p_to: string
        }
        Returns: {
          event_count: number
          resource_id: string
        }[]
      }
      group_analytics_by_resource_hybrid: {
        Args: {
          p_entity_id: string
          p_event_types: Database["public"]["Enums"]["analytics_event_type"][]
          p_from: string
          p_to: string
        }
        Returns: {
          event_count: number
          resource_id: string
        }[]
      }
      group_analytics_by_section: {
        Args: {
          p_entity_id: string
          p_event_types: Database["public"]["Enums"]["analytics_event_type"][]
          p_from: string
          p_to: string
        }
        Returns: {
          event_count: number
          section_type: Database["public"]["Enums"]["menu_section_type"]
        }[]
      }
      group_analytics_by_section_hybrid: {
        Args: {
          p_entity_id: string
          p_event_types: Database["public"]["Enums"]["analytics_event_type"][]
          p_from: string
          p_to: string
        }
        Returns: {
          event_count: number
          section_type: Database["public"]["Enums"]["menu_section_type"]
        }[]
      }
      insert_slug_history: {
        Args: { p_entity_id: string; p_old_slug: string }
        Returns: undefined
      }
      refresh_client_counters: {
        Args: { p_client_id: string }
        Returns: undefined
      }
      rollup_entity_analytics_daily: {
        Args: { p_day: string }
        Returns: number
      }
      rollup_entity_analytics_incremental: { Args: never; Returns: Json }
      slugify: { Args: { input: string }; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      analytics_event_type:
        | "profile_view"
        | "section_view"
        | "publication_view"
        | "product_view"
        | "service_view"
        | "event_view"
        | "booking_created"
        | "follow"
        | "unfollow"
        | "wishlist_add"
        | "publication_share"
      appointment_location_type: "in_person" | "video" | "phone"
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "no_show"
      digital_file_format: "pdf" | "epub" | "mp4" | "mp3" | "zip" | "other"
      digital_license: "personal" | "professional" | "commercial"
      discount_applies_to:
        | "all_products"
        | "specific_products"
        | "specific_categories"
      discount_code_type: "percentage" | "fixed_amount" | "free_shipping"
      entity_team_invite_status:
        | "pending"
        | "accepted"
        | "expired"
        | "cancelled"
      event_location_type: "online" | "in_person"
      event_registration_status: "confirmed" | "cancelled"
      global_feature_type: "faq"
      home_widget_type:
        | "widget_news_feed"
        | "widget_upcoming_events"
        | "widget_featured_videos"
        | "widget_featured_products"
        | "widget_links_grid"
        | "widget_testimonials"
        | "widget_shop"
        | "widget_service"
        | "widget_event"
        | "widget_news"
        | "widget_history"
        | "widget_announcement"
        | "widget_bio"
        | "widget_faq"
      menu_section_type:
        | "home"
        | "news"
        | "events"
        | "videos"
        | "shop"
        | "links"
        | "appointments"
        | "history"
        | "faq"
      notification_type: "new_follower" | "new_publication" | "new_comment"
      physical_condition_t:
        | "new"
        | "like_new"
        | "very_good"
        | "good"
        | "acceptable"
      product_answer_status: "pending" | "published" | "hidden"
      product_media_type: "image" | "video"
      product_question_status: "pending" | "published" | "hidden"
      product_review_status: "pending" | "published" | "hidden" | "flagged"
      product_status: "draft" | "published" | "archived"
      product_type: "digital" | "physical"
      publication_media_type: "image" | "video"
      publication_status: "published" | "scheduled"
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
      analytics_event_type: [
        "profile_view",
        "section_view",
        "publication_view",
        "product_view",
        "service_view",
        "event_view",
        "booking_created",
        "follow",
        "unfollow",
        "wishlist_add",
        "publication_share",
      ],
      appointment_location_type: ["in_person", "video", "phone"],
      booking_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "no_show",
      ],
      digital_file_format: ["pdf", "epub", "mp4", "mp3", "zip", "other"],
      digital_license: ["personal", "professional", "commercial"],
      discount_applies_to: [
        "all_products",
        "specific_products",
        "specific_categories",
      ],
      discount_code_type: ["percentage", "fixed_amount", "free_shipping"],
      entity_team_invite_status: [
        "pending",
        "accepted",
        "expired",
        "cancelled",
      ],
      event_location_type: ["online", "in_person"],
      event_registration_status: ["confirmed", "cancelled"],
      global_feature_type: ["faq"],
      home_widget_type: [
        "widget_news_feed",
        "widget_upcoming_events",
        "widget_featured_videos",
        "widget_featured_products",
        "widget_links_grid",
        "widget_testimonials",
        "widget_shop",
        "widget_service",
        "widget_event",
        "widget_news",
        "widget_history",
        "widget_announcement",
        "widget_bio",
        "widget_faq",
      ],
      menu_section_type: [
        "home",
        "news",
        "events",
        "videos",
        "shop",
        "links",
        "appointments",
        "history",
        "faq",
      ],
      notification_type: ["new_follower", "new_publication", "new_comment"],
      physical_condition_t: [
        "new",
        "like_new",
        "very_good",
        "good",
        "acceptable",
      ],
      product_answer_status: ["pending", "published", "hidden"],
      product_media_type: ["image", "video"],
      product_question_status: ["pending", "published", "hidden"],
      product_review_status: ["pending", "published", "hidden", "flagged"],
      product_status: ["draft", "published", "archived"],
      product_type: ["digital", "physical"],
      publication_media_type: ["image", "video"],
      publication_status: ["published", "scheduled"],
    },
  },
} as const
