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
      achievements: {
        Row: {
          bonus_points: number
          category: string
          created_at: string
          description: string
          display_order: number
          emoji: string
          id: string
          name: string
        }
        Insert: {
          bonus_points?: number
          category: string
          created_at?: string
          description: string
          display_order?: number
          emoji: string
          id: string
          name: string
        }
        Update: {
          bonus_points?: number
          category?: string
          created_at?: string
          description?: string
          display_order?: number
          emoji?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      admin_action_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      answer_likes: {
        Row: {
          answer_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          answer_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          answer_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_likes_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "question_answers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          start_date: string | null
          type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          start_date?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      columns_articles: {
        Row: {
          author_id: string
          category: string
          content: string
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          published_at: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          category?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      login_bonus_claimed: {
        Row: {
          claimed_at: string
          id: string
          milestone: number
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          milestone: number
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          milestone?: number
          user_id?: string
        }
        Relationships: []
      }
      login_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_login_date: string
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_login_date?: string
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_login_date?: string
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notices: {
        Row: {
          category: string
          created_at: string
          description: string
          display_order: number
          end_date: string | null
          id: string
          is_published: boolean
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          display_order?: number
          end_date?: string | null
          id?: string
          is_published?: boolean
          start_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          display_order?: number
          end_date?: string | null
          id?: string
          is_published?: boolean
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      points_history: {
        Row: {
          admin_action: boolean
          admin_user_id: string | null
          created_at: string
          description: string
          id: string
          points: number
          reason: string | null
          shift_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          admin_action?: boolean
          admin_user_id?: string | null
          created_at?: string
          description: string
          id?: string
          points: number
          reason?: string | null
          shift_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          admin_action?: boolean
          admin_user_id?: string | null
          created_at?: string
          description?: string
          id?: string
          points?: number
          reason?: string | null
          shift_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_history_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      prefecture_milestones: {
        Row: {
          achieved_at: string
          id: string
          milestone_hours: number
          prefecture: string
        }
        Insert: {
          achieved_at?: string
          id?: string
          milestone_hours: number
          prefecture: string
        }
        Update: {
          achieved_at?: string
          id?: string
          milestone_hours?: number
          prefecture?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          banned_by: string | null
          care_experience: string | null
          care_qualifications: string | null
          contract_end_date: string | null
          created_at: string
          current_job: string | null
          current_status: string | null
          date_of_birth: string | null
          dispatch_company: string | null
          display_name: string | null
          email: string | null
          employment_type: string | null
          facility_name: string | null
          first_launch_date: string
          full_name: string | null
          gender: string | null
          hourly_rate: number | null
          id: string
          is_admin: boolean
          is_banned: boolean
          phone_number: string | null
          prefecture: string | null
          preferred_shift: string | null
          updated_at: string
          user_id: string
          weekly_days: string | null
          work_location: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          care_experience?: string | null
          care_qualifications?: string | null
          contract_end_date?: string | null
          created_at?: string
          current_job?: string | null
          current_status?: string | null
          date_of_birth?: string | null
          dispatch_company?: string | null
          display_name?: string | null
          email?: string | null
          employment_type?: string | null
          facility_name?: string | null
          first_launch_date?: string
          full_name?: string | null
          gender?: string | null
          hourly_rate?: number | null
          id?: string
          is_admin?: boolean
          is_banned?: boolean
          phone_number?: string | null
          prefecture?: string | null
          preferred_shift?: string | null
          updated_at?: string
          user_id: string
          weekly_days?: string | null
          work_location?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          care_experience?: string | null
          care_qualifications?: string | null
          contract_end_date?: string | null
          created_at?: string
          current_job?: string | null
          current_status?: string | null
          date_of_birth?: string | null
          dispatch_company?: string | null
          display_name?: string | null
          email?: string | null
          employment_type?: string | null
          facility_name?: string | null
          first_launch_date?: string
          full_name?: string | null
          gender?: string | null
          hourly_rate?: number | null
          id?: string
          is_admin?: boolean
          is_banned?: boolean
          phone_number?: string | null
          prefecture?: string | null
          preferred_shift?: string | null
          updated_at?: string
          user_id?: string
          weekly_days?: string | null
          work_location?: string | null
        }
        Relationships: []
      }
      question_answers: {
        Row: {
          anonymous_name: string
          body: string
          created_at: string
          id: string
          question_id: string
          user_id: string
        }
        Insert: {
          anonymous_name?: string
          body: string
          created_at?: string
          id?: string
          question_id: string
          user_id: string
        }
        Update: {
          anonymous_name?: string
          body?: string
          created_at?: string
          id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_likes: {
        Row: {
          created_at: string
          id: string
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_likes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          anonymous_name: string
          answer_count: number
          approved_at: string | null
          body: string
          created_at: string
          id: string
          is_approved: boolean
          is_rejected: boolean
          title: string
          user_id: string
        }
        Insert: {
          anonymous_name?: string
          answer_count?: number
          approved_at?: string | null
          body?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          is_rejected?: boolean
          title: string
          user_id: string
        }
        Update: {
          anonymous_name?: string
          answer_count?: number
          approved_at?: string | null
          body?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          is_rejected?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          friend_contact: string | null
          friend_name: string | null
          id: string
          points_awarded: boolean
          profile_bonus_granted_at: string | null
          referral_code: string | null
          referred_user_id: string | null
          referrer_id: string
          signup_bonus_granted_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          friend_contact?: string | null
          friend_name?: string | null
          id?: string
          points_awarded?: boolean
          profile_bonus_granted_at?: string | null
          referral_code?: string | null
          referred_user_id?: string | null
          referrer_id: string
          signup_bonus_granted_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          friend_contact?: string | null
          friend_name?: string | null
          id?: string
          points_awarded?: boolean
          profile_bonus_granted_at?: string | null
          referral_code?: string | null
          referred_user_id?: string | null
          referrer_id?: string
          signup_bonus_granted_at?: string | null
          status?: string
        }
        Relationships: []
      }
      shifts: {
        Row: {
          created_at: string
          end_time: string
          facility_name: string | null
          hours: number
          id: string
          points_earned: number
          shift_date: string
          shift_type: string
          start_time: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_time: string
          facility_name?: string | null
          hours?: number
          id?: string
          points_earned?: number
          shift_date: string
          shift_type: string
          start_time: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_time?: string
          facility_name?: string | null
          hours?: number
          id?: string
          points_earned?: number
          shift_date?: string
          shift_type?: string
          start_time?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
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
      prefecture_hours: {
        Row: {
          prefecture: string | null
          total_hours: number | null
          user_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      change_user_role: {
        Args: { new_role: string; target_user_id: string }
        Returns: undefined
      }
      check_and_grant_achievements: {
        Args: { target_user_id?: string }
        Returns: Json
      }
      get_referral_user_points: {
        Args: { _referrer_id: string }
        Returns: {
          referral_id: string
          total_points: number
        }[]
      }
      get_user_last_sign_in: {
        Args: { _user_ids: string[] }
        Returns: {
          last_sign_in_at: string
          user_id: string
        }[]
      }
      grant_question_post_points: {
        Args: { p_question_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_profile_complete: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
