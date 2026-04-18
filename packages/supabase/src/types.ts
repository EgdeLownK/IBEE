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
      entity: {
        Row: {
          avatar_url: string | null
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
      check_comment_rate_limit: {
        Args: { p_user_id: string }
        Returns: boolean
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
      get_user_entity_ids: { Args: never; Returns: string[] }
      insert_slug_history: {
        Args: { p_entity_id: string; p_old_slug: string }
        Returns: undefined
      }
      refresh_client_counters: {
        Args: { p_client_id: string }
        Returns: undefined
      }
      slugify: { Args: { input: string }; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      appointment_location_type: "in_person" | "video" | "phone"
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "no_show"
      global_feature_type: "faq"
      home_widget_type:
        | "widget_news_feed"
        | "widget_upcoming_events"
        | "widget_featured_videos"
        | "widget_featured_products"
        | "widget_links_grid"
        | "widget_testimonials"
      menu_section_type:
        | "home"
        | "news"
        | "events"
        | "videos"
        | "shop"
        | "links"
        | "appointments"
      notification_type: "new_follower" | "new_publication" | "new_comment"
      publication_media_type: "image"
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
      appointment_location_type: ["in_person", "video", "phone"],
      booking_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "no_show",
      ],
      global_feature_type: ["faq"],
      home_widget_type: [
        "widget_news_feed",
        "widget_upcoming_events",
        "widget_featured_videos",
        "widget_featured_products",
        "widget_links_grid",
        "widget_testimonials",
      ],
      menu_section_type: [
        "home",
        "news",
        "events",
        "videos",
        "shop",
        "links",
        "appointments",
      ],
      notification_type: ["new_follower", "new_publication", "new_comment"],
      publication_media_type: ["image"],
      publication_status: ["published", "scheduled"],
    },
  },
} as const
