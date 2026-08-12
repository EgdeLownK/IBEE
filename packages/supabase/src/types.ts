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
          cancel_min_hours: number
          color: string | null
          content_blocks: Json
          created_at: string
          currency: string
          deposit_percent: number
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
          payment_required: boolean
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
          cancel_min_hours?: number
          color?: string | null
          content_blocks?: Json
          created_at?: string
          currency?: string
          deposit_percent?: number
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
          payment_required?: boolean
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
          cancel_min_hours?: number
          color?: string | null
          content_blocks?: Json
          created_at?: string
          currency?: string
          deposit_percent?: number
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
          payment_required?: boolean
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
          checkout_expires_at: string | null
          client_id: string | null
          confirmation_sent_at: string | null
          created_at: string
          currency: string
          end_at: string
          entity_id: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_status: Database["public"]["Enums"]["booking_payment_status"]
          price_cents: number | null
          refund_cents: number
          reminder_sent_at: string | null
          source: string
          start_at: string
          status: Database["public"]["Enums"]["booking_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
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
          checkout_expires_at?: string | null
          client_id?: string | null
          confirmation_sent_at?: string | null
          created_at?: string
          currency?: string
          end_at: string
          entity_id: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["booking_payment_status"]
          price_cents?: number | null
          refund_cents?: number
          reminder_sent_at?: string | null
          source?: string
          start_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
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
          checkout_expires_at?: string | null
          client_id?: string | null
          confirmation_sent_at?: string | null
          created_at?: string
          currency?: string
          end_at?: string
          entity_id?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["booking_payment_status"]
          price_cents?: number | null
          refund_cents?: number
          reminder_sent_at?: string | null
          source?: string
          start_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
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
          banned_at: string | null
          bookings_count: number
          created_at: string
          email: string
          entity_id: string
          id: string
          is_banned: boolean
          last_booking_at: string | null
          name: string
          notes: string | null
          phone: string | null
          tags: string[]
          total_revenue_cents: number
          updated_at: string
        }
        Insert: {
          banned_at?: string | null
          bookings_count?: number
          created_at?: string
          email: string
          entity_id: string
          id?: string
          is_banned?: boolean
          last_booking_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          tags?: string[]
          total_revenue_cents?: number
          updated_at?: string
        }
        Update: {
          banned_at?: string | null
          bookings_count?: number
          created_at?: string
          email?: string
          entity_id?: string
          id?: string
          is_banned?: boolean
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
      discount_code_events: {
        Row: {
          code_id: string
          event_id: string
        }
        Insert: {
          code_id: string
          event_id: string
        }
        Update: {
          code_id?: string
          event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_code_events_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_code_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
          {
            foreignKeyName: "discount_code_uses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      entity_expenses: {
        Row: {
          amount_cents: number
          created_at: string
          description: string
          entity_id: string
          id: string
          incurred_at: string
          status: Database["public"]["Enums"]["entity_expense_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          description: string
          entity_id: string
          id?: string
          incurred_at?: string
          status?: Database["public"]["Enums"]["entity_expense_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          description?: string
          entity_id?: string
          id?: string
          incurred_at?: string
          status?: Database["public"]["Enums"]["entity_expense_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_expenses_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_expenses_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
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
          folder_id: string | null
          id: string
          mime_type: string | null
          name: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name: string
          size_bytes: number
          storage_path: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          folder_id?: string | null
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
          {
            foreignKeyName: "entity_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "entity_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_folders: {
        Row: {
          created_at: string
          entity_id: string
          id: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_folders_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_folders_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
          {
            foreignKeyName: "entity_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "entity_folders"
            referencedColumns: ["id"]
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
      entity_job_applications: {
        Row: {
          age: number | null
          applicant_user_id: string | null
          created_at: string
          education_level: string | null
          email: string
          experience_years: number | null
          first_name: string
          gender: string | null
          id: string
          is_archived: boolean
          last_name: string
          location: string | null
          message: string | null
          offer_id: string
          phone: string | null
          resume_url: string | null
          session_number: number
          skills: string[] | null
          status: Database["public"]["Enums"]["entity_job_application_status"]
          updated_at: string
        }
        Insert: {
          age?: number | null
          applicant_user_id?: string | null
          created_at?: string
          education_level?: string | null
          email: string
          experience_years?: number | null
          first_name: string
          gender?: string | null
          id?: string
          is_archived?: boolean
          last_name: string
          location?: string | null
          message?: string | null
          offer_id: string
          phone?: string | null
          resume_url?: string | null
          session_number?: number
          skills?: string[] | null
          status?: Database["public"]["Enums"]["entity_job_application_status"]
          updated_at?: string
        }
        Update: {
          age?: number | null
          applicant_user_id?: string | null
          created_at?: string
          education_level?: string | null
          email?: string
          experience_years?: number | null
          first_name?: string
          gender?: string | null
          id?: string
          is_archived?: boolean
          last_name?: string
          location?: string | null
          message?: string | null
          offer_id?: string
          phone?: string | null
          resume_url?: string | null
          session_number?: number
          skills?: string[] | null
          status?: Database["public"]["Enums"]["entity_job_application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_job_applications_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "entity_job_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_job_offer_media: {
        Row: {
          alt_text: string | null
          created_at: string
          display_order: number
          id: string
          media_type: Database["public"]["Enums"]["entity_job_offer_media_type"]
          offer_id: string
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          media_type: Database["public"]["Enums"]["entity_job_offer_media_type"]
          offer_id: string
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          media_type?: Database["public"]["Enums"]["entity_job_offer_media_type"]
          offer_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_job_offer_media_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "entity_job_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_job_offer_skills: {
        Row: {
          created_at: string
          display_order: number
          offer_id: string
          skill_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          offer_id: string
          skill_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          offer_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_job_offer_skills_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "entity_job_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_job_offer_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "job_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_job_offers: {
        Row: {
          apply_url: string | null
          blocks: Json
          compensation_amount: number | null
          compensation_frequency:
            | Database["public"]["Enums"]["entity_job_comp_freq"]
            | null
          compensation_type:
            | Database["public"]["Enums"]["entity_job_comp_type"]
            | null
          contract_type: Database["public"]["Enums"]["entity_job_contract_type"]
          created_at: string
          end_date: string | null
          entity_id: string
          id: string
          is_cadre: boolean | null
          location_text: string | null
          location_type: Database["public"]["Enums"]["entity_job_location_type"]
          sector_id: string | null
          session_count: number
          status: Database["public"]["Enums"]["entity_job_status_v2"]
          title: string
          updated_at: string
        }
        Insert: {
          apply_url?: string | null
          blocks?: Json
          compensation_amount?: number | null
          compensation_frequency?:
            | Database["public"]["Enums"]["entity_job_comp_freq"]
            | null
          compensation_type?:
            | Database["public"]["Enums"]["entity_job_comp_type"]
            | null
          contract_type: Database["public"]["Enums"]["entity_job_contract_type"]
          created_at?: string
          end_date?: string | null
          entity_id: string
          id?: string
          is_cadre?: boolean | null
          location_text?: string | null
          location_type?: Database["public"]["Enums"]["entity_job_location_type"]
          sector_id?: string | null
          session_count?: number
          status?: Database["public"]["Enums"]["entity_job_status_v2"]
          title: string
          updated_at?: string
        }
        Update: {
          apply_url?: string | null
          blocks?: Json
          compensation_amount?: number | null
          compensation_frequency?:
            | Database["public"]["Enums"]["entity_job_comp_freq"]
            | null
          compensation_type?:
            | Database["public"]["Enums"]["entity_job_comp_type"]
            | null
          contract_type?: Database["public"]["Enums"]["entity_job_contract_type"]
          created_at?: string
          end_date?: string | null
          entity_id?: string
          id?: string
          is_cadre?: boolean | null
          location_text?: string | null
          location_type?: Database["public"]["Enums"]["entity_job_location_type"]
          sector_id?: string | null
          session_count?: number
          status?: Database["public"]["Enums"]["entity_job_status_v2"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_job_offers_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_job_offers_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
          {
            foreignKeyName: "entity_job_offers_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "job_sectors"
            referencedColumns: ["id"]
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
          direction: string
          entity_id: string
          id: string
          sender_email: string
          sender_name: string
          sender_user_id: string | null
          thread_key: string
        }
        Insert: {
          body: string
          created_at?: string
          direction?: string
          entity_id: string
          id?: string
          sender_email: string
          sender_name: string
          sender_user_id?: string | null
          thread_key: string
        }
        Update: {
          body?: string
          created_at?: string
          direction?: string
          entity_id?: string
          id?: string
          sender_email?: string
          sender_name?: string
          sender_user_id?: string | null
          thread_key?: string
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
      entity_payout_allocations: {
        Row: {
          amount_type: Database["public"]["Enums"]["entity_payout_amount_type"]
          amount_value: number
          created_at: string
          end_date: string | null
          entity_id: string
          id: string
          last_run_at: string | null
          member_id: string | null
          next_run_at: string
          recipient_type: Database["public"]["Enums"]["entity_payout_recipient_type"]
          recurrence: Database["public"]["Enums"]["entity_payout_recurrence"]
          schedule_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          amount_type: Database["public"]["Enums"]["entity_payout_amount_type"]
          amount_value: number
          created_at?: string
          end_date?: string | null
          entity_id: string
          id?: string
          last_run_at?: string | null
          member_id?: string | null
          next_run_at: string
          recipient_type: Database["public"]["Enums"]["entity_payout_recipient_type"]
          recurrence?: Database["public"]["Enums"]["entity_payout_recurrence"]
          schedule_id: string
          start_date?: string
          updated_at?: string
        }
        Update: {
          amount_type?: Database["public"]["Enums"]["entity_payout_amount_type"]
          amount_value?: number
          created_at?: string
          end_date?: string | null
          entity_id?: string
          id?: string
          last_run_at?: string | null
          member_id?: string | null
          next_run_at?: string
          recipient_type?: Database["public"]["Enums"]["entity_payout_recipient_type"]
          recurrence?: Database["public"]["Enums"]["entity_payout_recurrence"]
          schedule_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_payout_allocations_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_payout_allocations_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
          {
            foreignKeyName: "entity_payout_allocations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "entity_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_payout_allocations_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "entity_payout_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_payout_schedules: {
        Row: {
          created_at: string
          entity_id: string
          id: string
          is_active: boolean
          last_run_at: string | null
          next_run_at: string
          recurrence: Database["public"]["Enums"]["entity_payout_recurrence"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at: string
          recurrence: Database["public"]["Enums"]["entity_payout_recurrence"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string
          recurrence?: Database["public"]["Enums"]["entity_payout_recurrence"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_payout_schedules_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_payout_schedules_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
        ]
      }
      entity_payout_transfers: {
        Row: {
          allocation_id: string | null
          amount_cents: number
          completed_at: string | null
          created_at: string
          entity_id: string
          exported_at: string | null
          id: string
          member_id: string | null
          period_end: string
          period_start: string
          recipient_email: string
          recipient_name: string
          recipient_type: Database["public"]["Enums"]["entity_payout_recipient_type"]
          revenue_basis_cents: number
          schedule_id: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["entity_payout_transfer_status"]
          updated_at: string
        }
        Insert: {
          allocation_id?: string | null
          amount_cents: number
          completed_at?: string | null
          created_at?: string
          entity_id: string
          exported_at?: string | null
          id?: string
          member_id?: string | null
          period_end: string
          period_start: string
          recipient_email: string
          recipient_name: string
          recipient_type: Database["public"]["Enums"]["entity_payout_recipient_type"]
          revenue_basis_cents?: number
          schedule_id?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["entity_payout_transfer_status"]
          updated_at?: string
        }
        Update: {
          allocation_id?: string | null
          amount_cents?: number
          completed_at?: string | null
          created_at?: string
          entity_id?: string
          exported_at?: string | null
          id?: string
          member_id?: string | null
          period_end?: string
          period_start?: string
          recipient_email?: string
          recipient_name?: string
          recipient_type?: Database["public"]["Enums"]["entity_payout_recipient_type"]
          revenue_basis_cents?: number
          schedule_id?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["entity_payout_transfer_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_payout_transfers_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "entity_payout_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_payout_transfers_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_payout_transfers_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
          {
            foreignKeyName: "entity_payout_transfers_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "entity_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_payout_transfers_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "entity_payout_schedules"
            referencedColumns: ["id"]
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
      event_activities: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          end_at: string | null
          entity_id: string
          event_id: string
          id: string
          is_published: boolean
          location_details: string | null
          location_type:
            | Database["public"]["Enums"]["event_location_type"]
            | null
          position: number
          slug: string
          start_at: string
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          end_at?: string | null
          entity_id: string
          event_id: string
          id?: string
          is_published?: boolean
          location_details?: string | null
          location_type?:
            | Database["public"]["Enums"]["event_location_type"]
            | null
          position?: number
          slug: string
          start_at: string
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          end_at?: string | null
          entity_id?: string
          event_id?: string
          id?: string
          is_published?: boolean
          location_details?: string | null
          location_type?:
            | Database["public"]["Enums"]["event_location_type"]
            | null
          position?: number
          slug?: string
          start_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_activities_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_activities_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
          {
            foreignKeyName: "event_activities_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_manual_reg_contact_sessions: {
        Row: {
          attendee_email: string | null
          attendee_name: string | null
          attendee_phone: string | null
          consumed_at: string | null
          created_at: string
          created_by: string
          entity_id: string
          event_id: string
          expires_at: string
          filled_at: string | null
          id: string
          status: string
          token: string
        }
        Insert: {
          attendee_email?: string | null
          attendee_name?: string | null
          attendee_phone?: string | null
          consumed_at?: string | null
          created_at?: string
          created_by: string
          entity_id: string
          event_id: string
          expires_at: string
          filled_at?: string | null
          id?: string
          status?: string
          token: string
        }
        Update: {
          attendee_email?: string | null
          attendee_name?: string | null
          attendee_phone?: string | null
          consumed_at?: string | null
          created_at?: string
          created_by?: string
          entity_id?: string
          event_id?: string
          expires_at?: string
          filled_at?: string | null
          id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_manual_reg_contact_sessions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_manual_reg_contact_sessions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
          {
            foreignKeyName: "event_manual_reg_contact_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          activity_id: string | null
          attendee_email: string
          attendee_name: string
          attendee_phone: string | null
          checked_in_at: string | null
          created_at: string
          entity_id: string
          event_id: string
          form_answers: Json
          id: string
          message: string | null
          order_id: string | null
          price_cents: number | null
          refund_cents: number
          reminder_sent_at: string | null
          status: Database["public"]["Enums"]["event_registration_status"]
          ticket_code: string | null
          ticket_type_id: string | null
        }
        Insert: {
          activity_id?: string | null
          attendee_email: string
          attendee_name: string
          attendee_phone?: string | null
          checked_in_at?: string | null
          created_at?: string
          entity_id: string
          event_id: string
          form_answers?: Json
          id?: string
          message?: string | null
          order_id?: string | null
          price_cents?: number | null
          refund_cents?: number
          reminder_sent_at?: string | null
          status?: Database["public"]["Enums"]["event_registration_status"]
          ticket_code?: string | null
          ticket_type_id?: string | null
        }
        Update: {
          activity_id?: string | null
          attendee_email?: string
          attendee_name?: string
          attendee_phone?: string | null
          checked_in_at?: string | null
          created_at?: string
          entity_id?: string
          event_id?: string
          form_answers?: Json
          id?: string
          message?: string | null
          order_id?: string | null
          price_cents?: number | null
          refund_cents?: number
          reminder_sent_at?: string | null
          status?: Database["public"]["Enums"]["event_registration_status"]
          ticket_code?: string | null
          ticket_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "event_activities"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "event_registrations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ticket_types: {
        Row: {
          activity_id: string | null
          created_at: string
          currency: string
          entity_id: string
          event_id: string
          id: string
          is_active: boolean
          position: number
          price_cents: number
          quota: number | null
          sales_end_at: string | null
          sales_start_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          currency?: string
          entity_id: string
          event_id: string
          id?: string
          is_active?: boolean
          position?: number
          price_cents?: number
          quota?: number | null
          sales_end_at?: string | null
          sales_start_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          currency?: string
          entity_id?: string
          event_id?: string
          id?: string
          is_active?: boolean
          position?: number
          price_cents?: number
          quota?: number | null
          sales_end_at?: string | null
          sales_start_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_ticket_types_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "event_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_ticket_types_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_ticket_types_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
          {
            foreignKeyName: "event_ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cancel_min_hours: number
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
          registration_fields: Json
          slug: string
          start_at: string
          title: string
          updated_at: string
        }
        Insert: {
          cancel_min_hours?: number
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
          registration_fields?: Json
          slug: string
          start_at: string
          title: string
          updated_at?: string
        }
        Update: {
          cancel_min_hours?: number
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
          registration_fields?: Json
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
      favorites: {
        Row: {
          anonymous_id: string | null
          created_at: string
          entity_id: string
          id: string
          user_id: string | null
        }
        Insert: {
          anonymous_id?: string | null
          created_at?: string
          entity_id: string
          id?: string
          user_id?: string | null
        }
        Update: {
          anonymous_id?: string | null
          created_at?: string
          entity_id?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favorites_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_entity_id_fkey"
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
      job_sectors: {
        Row: {
          created_at: string
          display_order: number
          id: string
          label: string
          slug: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          label: string
          slug: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          label?: string
          slug?: string
        }
        Relationships: []
      }
      job_skills: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          label: string
          normalized_label: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
          normalized_label?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          normalized_label?: string | null
        }
        Relationships: []
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
      order_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          detail: string | null
          entity_id: string
          event_type: Database["public"]["Enums"]["order_event_type"]
          id: string
          metadata: Json
          order_id: string
          title: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          detail?: string | null
          entity_id: string
          event_type: Database["public"]["Enums"]["order_event_type"]
          id?: string
          metadata?: Json
          order_id: string
          title: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          detail?: string | null
          entity_id?: string
          event_type?: Database["public"]["Enums"]["order_event_type"]
          id?: string
          metadata?: Json
          order_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_lines: {
        Row: {
          created_at: string
          event_id: string | null
          event_ticket_type_id: string | null
          id: string
          line_kind: Database["public"]["Enums"]["order_line_kind"]
          line_total_cents: number
          order_id: string
          product_id: string | null
          product_type: Database["public"]["Enums"]["product_type"] | null
          quantity: number
          registration_id: string | null
          title_snapshot: string
          unit_price_cents: number
          variant_id: string | null
          variant_snapshot: Json | null
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          event_ticket_type_id?: string | null
          id?: string
          line_kind?: Database["public"]["Enums"]["order_line_kind"]
          line_total_cents: number
          order_id: string
          product_id?: string | null
          product_type?: Database["public"]["Enums"]["product_type"] | null
          quantity: number
          registration_id?: string | null
          title_snapshot: string
          unit_price_cents: number
          variant_id?: string | null
          variant_snapshot?: Json | null
        }
        Update: {
          created_at?: string
          event_id?: string | null
          event_ticket_type_id?: string | null
          id?: string
          line_kind?: Database["public"]["Enums"]["order_line_kind"]
          line_total_cents?: number
          order_id?: string
          product_id?: string | null
          product_type?: Database["public"]["Enums"]["product_type"] | null
          quantity?: number
          registration_id?: string | null
          title_snapshot?: string
          unit_price_cents?: number
          variant_id?: string | null
          variant_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_event_ticket_type_id_fkey"
            columns: ["event_ticket_type_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          activity_id: string | null
          attendee_message: string | null
          attendee_phone: string | null
          buyer_email: string | null
          buyer_name: string | null
          buyer_user_id: string | null
          cancelled_at: string | null
          checkout_expires_at: string | null
          created_at: string
          currency: string
          discount_cents: number
          discount_code_id: string | null
          entity_id: string
          event_id: string | null
          event_ticket_type_id: string | null
          form_answers: Json
          fulfillment_status: Database["public"]["Enums"]["order_fulfillment_status"]
          id: string
          notes: string | null
          order_kind: Database["public"]["Enums"]["order_kind"]
          order_number: string
          paid_at: string | null
          refund_cents: number
          refunded_at: string | null
          shipping_address: Json | null
          shipping_cents: number
          status: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          subtotal_cents: number
          total_cents: number
          tracking_carrier: string | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          activity_id?: string | null
          attendee_message?: string | null
          attendee_phone?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_user_id?: string | null
          cancelled_at?: string | null
          checkout_expires_at?: string | null
          created_at?: string
          currency?: string
          discount_cents?: number
          discount_code_id?: string | null
          entity_id: string
          event_id?: string | null
          event_ticket_type_id?: string | null
          form_answers?: Json
          fulfillment_status?: Database["public"]["Enums"]["order_fulfillment_status"]
          id?: string
          notes?: string | null
          order_kind?: Database["public"]["Enums"]["order_kind"]
          order_number: string
          paid_at?: string | null
          refund_cents?: number
          refunded_at?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents: number
          total_cents: number
          tracking_carrier?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          activity_id?: string | null
          attendee_message?: string | null
          attendee_phone?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_user_id?: string | null
          cancelled_at?: string | null
          checkout_expires_at?: string | null
          created_at?: string
          currency?: string
          discount_cents?: number
          discount_code_id?: string | null
          entity_id?: string
          event_id?: string | null
          event_ticket_type_id?: string | null
          form_answers?: Json
          fulfillment_status?: Database["public"]["Enums"]["order_fulfillment_status"]
          id?: string
          notes?: string | null
          order_kind?: Database["public"]["Enums"]["order_kind"]
          order_number?: string
          paid_at?: string | null
          refund_cents?: number
          refunded_at?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          tracking_carrier?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "event_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "publication_comments_with_author"
            referencedColumns: ["author_entity_id"]
          },
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_event_ticket_type_id_fkey"
            columns: ["event_ticket_type_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_types"
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
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
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
          sale_ends_at: string | null
          sale_price_cents_override: number | null
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
          sale_ends_at?: string | null
          sale_price_cents_override?: number | null
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
          sale_ends_at?: string | null
          sale_price_cents_override?: number | null
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
          audience: string | null
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
          digital_stock_quantity: number | null
          digital_stock_unlimited: boolean
          entity_id: string
          faq: Json
          id: string
          in_person_enabled: boolean
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
          audience?: string | null
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
          digital_stock_quantity?: number | null
          digital_stock_unlimited?: boolean
          entity_id: string
          faq?: Json
          id?: string
          in_person_enabled?: boolean
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
          audience?: string | null
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
          digital_stock_quantity?: number | null
          digital_stock_unlimited?: boolean
          entity_id?: string
          faq?: Json
          id?: string
          in_person_enabled?: boolean
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
      user_profiles: {
        Row: {
          created_at: string
          default_resume_url: string | null
          first_name: string | null
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_resume_url?: string | null
          first_name?: string | null
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_resume_url?: string | null
          first_name?: string | null
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_skills: {
        Row: {
          created_at: string
          skill_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          skill_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          skill_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "job_skills"
            referencedColumns: ["id"]
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
      assert_product_in_stock: {
        Args: {
          p_product: Database["public"]["Tables"]["products"]["Row"]
          p_quantity: number
          p_variant: Database["public"]["Tables"]["product_variants"]["Row"]
        }
        Returns: undefined
      }
      attach_stripe_session_to_booking: {
        Args: { p_booking_id: string; p_stripe_session_id: string }
        Returns: undefined
      }
      attach_stripe_session_to_order: {
        Args: { p_order_id: string; p_stripe_session_id: string }
        Returns: undefined
      }
      backfill_entity_analytics_daily: {
        Args: { p_from_day: string; p_to_day: string }
        Returns: Json
      }
      ban_entity_client: {
        Args: {
          p_email: string
          p_entity_id: string
          p_name?: string
          p_phone?: string
        }
        Returns: {
          banned_at: string | null
          bookings_count: number
          created_at: string
          email: string
          entity_id: string
          id: string
          is_banned: boolean
          last_booking_at: string | null
          name: string
          notes: string | null
          phone: string | null
          tags: string[]
          total_revenue_cents: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      booking_blocks_slot: {
        Args: { p_booking: Database["public"]["Tables"]["bookings"]["Row"] }
        Returns: boolean
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
      check_in_event_registration: {
        Args: {
          p_entity_id: string
          p_event_id?: string
          p_ticket_code: string
        }
        Returns: Json
      }
      complete_booking_checkout: {
        Args: { p_payment_intent_id?: string; p_stripe_session_id: string }
        Returns: string
      }
      complete_checkout_order: {
        Args: {
          p_buyer_email?: string
          p_buyer_name?: string
          p_payment_intent_id?: string
          p_stripe_session_id: string
        }
        Returns: string
      }
      complete_event_ticket_checkout: {
        Args: { p_payment_intent_id?: string; p_stripe_session_id: string }
        Returns: string
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
      count_event_activity_holds: {
        Args: { p_activity_id: string }
        Returns: number
      }
      count_event_registrations: {
        Args: { p_event_id: string }
        Returns: number
      }
      count_event_ticket_holds: {
        Args: { p_event_id: string }
        Returns: number
      }
      create_booking_checkout: {
        Args: {
          p_appointment_type_id: string
          p_booker_email: string
          p_booker_message?: string
          p_booker_name: string
          p_booker_phone?: string
          p_end_at: string
          p_entity_id: string
          p_source?: string
          p_start_at: string
        }
        Returns: string
      }
      create_checkout_order: {
        Args: {
          p_buyer_user_id?: string
          p_entity_id: string
          p_product_id: string
          p_quantity?: number
          p_variant_id?: string
        }
        Returns: string
      }
      create_event_ticket_checkout: {
        Args: {
          p_attendee_email: string
          p_attendee_message?: string
          p_attendee_name: string
          p_attendee_phone?: string
          p_entity_id: string
          p_event_id: string
          p_form_answers?: Json
          p_promo_code?: string
          p_ticket_type_id: string
        }
        Returns: string
      }
      decrement_stock_for_line: {
        Args: {
          p_product: Database["public"]["Tables"]["products"]["Row"]
          p_quantity: number
          p_variant_id: string
        }
        Returns: undefined
      }
      entity_user_has_permission: {
        Args: { p_entity_id: string; p_permission: string }
        Returns: boolean
      }
      expire_stale_booking_checkouts: { Args: never; Returns: number }
      expire_stale_event_ticket_checkouts: { Args: never; Returns: number }
      generate_event_ticket_code: { Args: never; Returns: string }
      generate_order_number: { Args: never; Returns: string }
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
      get_availability_exception_for_date: {
        Args: { p_date: string; p_entity_id: string }
        Returns: {
          end_time: string
          is_blocked: boolean
          start_time: string
        }[]
      }
      get_booked_time_ranges: {
        Args: { p_entity_id: string; p_from: string; p_to: string }
        Returns: {
          end_at: string
          start_at: string
        }[]
      }
      get_event_checkin_live_stats: {
        Args: { p_entity_id: string; p_event_id: string }
        Returns: Json
      }
      get_event_entree_public_stats: {
        Args: { p_event_id: string }
        Returns: Json
      }
      get_manual_reg_contact_session_public: {
        Args: { p_token: string }
        Returns: Json
      }
      get_public_resource_view_counts: {
        Args: {
          p_event_type: Database["public"]["Enums"]["analytics_event_type"]
          p_resource_ids: string[]
        }
        Returns: {
          resource_id: string
          view_count: number
        }[]
      }
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
      is_event_activity_past: {
        Args: {
          p_activity: Database["public"]["Tables"]["event_activities"]["Row"]
        }
        Returns: boolean
      }
      list_event_registrations_due_for_reminder: {
        Args: never
        Returns: {
          activity_id: string | null
          attendee_email: string
          attendee_name: string
          attendee_phone: string | null
          checked_in_at: string | null
          created_at: string
          entity_id: string
          event_id: string
          form_answers: Json
          id: string
          message: string | null
          order_id: string | null
          price_cents: number | null
          refund_cents: number
          reminder_sent_at: string | null
          status: Database["public"]["Enums"]["event_registration_status"]
          ticket_code: string | null
          ticket_type_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "event_registrations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      normalize_job_skill_label: { Args: { input: string }; Returns: string }
      refresh_client_counters: {
        Args: { p_client_id: string }
        Returns: undefined
      }
      relaunch_job_offer: {
        Args: { p_offer_id: string }
        Returns: {
          apply_url: string | null
          blocks: Json
          compensation_amount: number | null
          compensation_frequency:
            | Database["public"]["Enums"]["entity_job_comp_freq"]
            | null
          compensation_type:
            | Database["public"]["Enums"]["entity_job_comp_type"]
            | null
          contract_type: Database["public"]["Enums"]["entity_job_contract_type"]
          created_at: string
          end_date: string | null
          entity_id: string
          id: string
          is_cadre: boolean | null
          location_text: string | null
          location_type: Database["public"]["Enums"]["entity_job_location_type"]
          sector_id: string | null
          session_count: number
          status: Database["public"]["Enums"]["entity_job_status_v2"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "entity_job_offers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_appointment_charge_cents: {
        Args: {
          p_type: Database["public"]["Tables"]["appointment_types"]["Row"]
        }
        Returns: number
      }
      resolve_appointment_unit_price_cents: {
        Args: {
          p_type: Database["public"]["Tables"]["appointment_types"]["Row"]
        }
        Returns: number
      }
      resolve_event_promo_discount: {
        Args: {
          p_code: string
          p_entity_id: string
          p_event_id: string
          p_subtotal_cents: number
        }
        Returns: {
          code_id: string
          discount_cents: number
        }[]
      }
      resolve_event_ticket_price_cents: {
        Args: {
          p_type: Database["public"]["Tables"]["event_ticket_types"]["Row"]
        }
        Returns: number
      }
      resolve_product_unit_price_cents: {
        Args: {
          p_product: Database["public"]["Tables"]["products"]["Row"]
          p_variant?: Database["public"]["Tables"]["product_variants"]["Row"]
        }
        Returns: number
      }
      rollup_entity_analytics_daily: {
        Args: { p_day: string }
        Returns: number
      }
      rollup_entity_analytics_incremental: { Args: never; Returns: Json }
      self_check_in_event_registration: {
        Args: { p_event_id: string; p_ticket_code: string }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      slugify: { Args: { input: string }; Returns: string }
      submit_manual_reg_contact_session: {
        Args: {
          p_email: string
          p_name: string
          p_phone?: string
          p_token: string
        }
        Returns: Json
      }
      unaccent: { Args: { "": string }; Returns: string }
      unban_entity_client: {
        Args: { p_client_id: string; p_entity_id: string }
        Returns: {
          banned_at: string | null
          bookings_count: number
          created_at: string
          email: string
          entity_id: string
          id: string
          is_banned: boolean
          last_booking_at: string | null
          name: string
          notes: string | null
          phone: string | null
          tags: string[]
          total_revenue_cents: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
        | "checkout_started"
        | "checkout_completed"
        | "booking_checkout_started"
        | "booking_checkout_completed"
        | "event_checkout_started"
        | "event_checkout_completed"
      appointment_location_type: "in_person" | "video" | "phone"
      booking_payment_status:
        | "unpaid"
        | "pending"
        | "paid"
        | "refunded"
        | "partially_refunded"
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
        | "all_events"
        | "specific_events"
      discount_code_type: "percentage" | "fixed_amount" | "free_shipping"
      entity_expense_status: "pending" | "completed" | "cancelled"
      entity_job_application_status:
        | "new"
        | "shortlisted"
        | "interviewing"
        | "hired"
        | "rejected"
      entity_job_comp_freq: "weekly" | "monthly" | "mission"
      entity_job_comp_type: "fixed" | "percentage"
      entity_job_contract_type:
        | "cdi"
        | "cdd"
        | "mission"
        | "interim"
        | "contrat_pro"
        | "apprentissage"
        | "stage"
      entity_job_location_type: "remote" | "onsite" | "hybrid"
      entity_job_offer_media_type: "image" | "video"
      entity_job_status: "draft" | "published" | "closed"
      entity_job_status_v2: "active" | "inactive"
      entity_payout_amount_type: "fixed" | "percent"
      entity_payout_recipient_type: "owner" | "member"
      entity_payout_recurrence: "weekly" | "monthly" | "quarterly"
      entity_payout_transfer_status:
        | "pending"
        | "exported"
        | "completed"
        | "cancelled"
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
        | "widget_highlight"
        | "widget_carousel"
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
      order_event_type:
        | "order_created"
        | "payment_confirmed"
        | "fulfillment_changed"
        | "tracking_updated"
        | "label_printed"
        | "note_updated"
      order_fulfillment_status:
        | "not_applicable"
        | "pending"
        | "to_ship"
        | "ready"
        | "shipped"
        | "delivered"
        | "returned"
      order_kind: "product" | "event_ticket"
      order_line_kind: "product" | "event_ticket"
      order_status:
        | "pending"
        | "paid"
        | "failed"
        | "cancelled"
        | "refunded"
        | "partially_refunded"
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
        "checkout_started",
        "checkout_completed",
        "booking_checkout_started",
        "booking_checkout_completed",
        "event_checkout_started",
        "event_checkout_completed",
      ],
      appointment_location_type: ["in_person", "video", "phone"],
      booking_payment_status: [
        "unpaid",
        "pending",
        "paid",
        "refunded",
        "partially_refunded",
      ],
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
        "all_events",
        "specific_events",
      ],
      discount_code_type: ["percentage", "fixed_amount", "free_shipping"],
      entity_expense_status: ["pending", "completed", "cancelled"],
      entity_job_application_status: [
        "new",
        "shortlisted",
        "interviewing",
        "hired",
        "rejected",
      ],
      entity_job_comp_freq: ["weekly", "monthly", "mission"],
      entity_job_comp_type: ["fixed", "percentage"],
      entity_job_contract_type: [
        "cdi",
        "cdd",
        "mission",
        "interim",
        "contrat_pro",
        "apprentissage",
        "stage",
      ],
      entity_job_location_type: ["remote", "onsite", "hybrid"],
      entity_job_offer_media_type: ["image", "video"],
      entity_job_status: ["draft", "published", "closed"],
      entity_job_status_v2: ["active", "inactive"],
      entity_payout_amount_type: ["fixed", "percent"],
      entity_payout_recipient_type: ["owner", "member"],
      entity_payout_recurrence: ["weekly", "monthly", "quarterly"],
      entity_payout_transfer_status: [
        "pending",
        "exported",
        "completed",
        "cancelled",
      ],
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
        "widget_highlight",
        "widget_carousel",
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
      order_event_type: [
        "order_created",
        "payment_confirmed",
        "fulfillment_changed",
        "tracking_updated",
        "label_printed",
        "note_updated",
      ],
      order_fulfillment_status: [
        "not_applicable",
        "pending",
        "to_ship",
        "ready",
        "shipped",
        "delivered",
        "returned",
      ],
      order_kind: ["product", "event_ticket"],
      order_line_kind: ["product", "event_ticket"],
      order_status: [
        "pending",
        "paid",
        "failed",
        "cancelled",
        "refunded",
        "partially_refunded",
      ],
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
