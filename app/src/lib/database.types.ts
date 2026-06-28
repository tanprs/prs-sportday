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
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_value: Json | null
          note: string | null
          old_value: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_value?: Json | null
          note?: string | null
          old_value?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_value?: Json | null
          note?: string | null
          old_value?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      classroom_house_mapping: {
        Row: {
          classroom: string
          grade_level: string
          house_color: string
          id: string
        }
        Insert: {
          classroom: string
          grade_level: string
          house_color: string
          id?: string
        }
        Update: {
          classroom?: string
          grade_level?: string
          house_color?: string
          id?: string
        }
        Relationships: []
      }
      houses: {
        Row: {
          house_color: string
          name_th: string
          primary_hex: string
          secondary_hex: string
        }
        Insert: {
          house_color: string
          name_th: string
          primary_hex: string
          secondary_hex: string
        }
        Update: {
          house_color?: string
          name_th?: string
          primary_hex?: string
          secondary_hex?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string | null
          id: string
          match_date: string | null
          match_no: string | null
          notes: string | null
          recorded_at: string | null
          recorded_by: string | null
          round: Database["public"]["Enums"]["match_round"]
          score_a: number | null
          score_b: number | null
          sport_id: string
          status: Database["public"]["Enums"]["match_status"] | null
          team_a_id: string | null
          team_b_id: string | null
          venue: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_date?: string | null
          match_no?: string | null
          notes?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          round: Database["public"]["Enums"]["match_round"]
          score_a?: number | null
          score_b?: number | null
          sport_id: string
          status?: Database["public"]["Enums"]["match_status"] | null
          team_a_id?: string | null
          team_b_id?: string | null
          venue?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          match_date?: string | null
          match_no?: string | null
          notes?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          round?: Database["public"]["Enums"]["match_round"]
          score_a?: number | null
          score_b?: number | null
          sport_id?: string
          status?: Database["public"]["Enums"]["match_status"] | null
          team_a_id?: string | null
          team_b_id?: string | null
          venue?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sport_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_windows: {
        Row: {
          blue_extended_until: string | null
          created_at: string | null
          created_by: string | null
          end_at: string
          green_extended_until: string | null
          id: string
          is_active: boolean | null
          name: string
          red_extended_until: string | null
          start_at: string
          yellow_extended_until: string | null
        }
        Insert: {
          blue_extended_until?: string | null
          created_at?: string | null
          created_by?: string | null
          end_at: string
          green_extended_until?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          red_extended_until?: string | null
          start_at: string
          yellow_extended_until?: string | null
        }
        Update: {
          blue_extended_until?: string | null
          created_at?: string | null
          created_by?: string | null
          end_at?: string
          green_extended_until?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          red_extended_until?: string | null
          start_at?: string
          yellow_extended_until?: string | null
        }
        Relationships: []
      }
      registrations: {
        Row: {
          created_at: string | null
          id: string
          sport_id: string
          student_id: string
          team_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          sport_id: string
          student_id: string
          team_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          sport_id?: string
          student_id?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sport_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sport_types: {
        Row: {
          category: string
          gender_type: string
          grade_group: string
          id: string
          is_active: boolean | null
          max_teams_per_color: number | null
          name: string
          sort_order: number | null
          sub_grade_quota: Json | null
          team_size: number | null
        }
        Insert: {
          category: string
          gender_type?: string
          grade_group: string
          id?: string
          is_active?: boolean | null
          max_teams_per_color?: number | null
          name: string
          sort_order?: number | null
          sub_grade_quota?: Json | null
          team_size?: number | null
        }
        Update: {
          category?: string
          gender_type?: string
          grade_group?: string
          id?: string
          is_active?: boolean | null
          max_teams_per_color?: number | null
          name?: string
          sort_order?: number | null
          sub_grade_quota?: Json | null
          team_size?: number | null
        }
        Relationships: []
      }
      sso_identities: {
        Row: {
          attendance_user_id: number
          auth_user_id: string
          created_at: string
          id: string
          last_login_at: string
          username: string
        }
        Insert: {
          attendance_user_id: number
          auth_user_id: string
          created_at?: string
          id?: string
          last_login_at?: string
          username: string
        }
        Update: {
          attendance_user_id?: number
          auth_user_id?: string
          created_at?: string
          id?: string
          last_login_at?: string
          username?: string
        }
        Relationships: []
      }
      student_login_invites: {
        Row: {
          claim_code: string
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          student_code: string
        }
        Insert: {
          claim_code: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          student_code: string
        }
        Update: {
          claim_code?: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          student_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_login_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_login_invites_student_code_fkey"
            columns: ["student_code"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_code"]
          },
        ]
      }
      students: {
        Row: {
          classroom: string
          created_at: string | null
          full_name: string
          gender: string | null
          grade_level: string
          house_color: string | null
          id: string
          photo_url: string | null
          student_code: string
          title: string | null
        }
        Insert: {
          classroom: string
          created_at?: string | null
          full_name: string
          gender?: string | null
          grade_level: string
          house_color?: string | null
          id?: string
          photo_url?: string | null
          student_code: string
          title?: string | null
        }
        Update: {
          classroom?: string
          created_at?: string | null
          full_name?: string
          gender?: string | null
          grade_level?: string
          house_color?: string | null
          id?: string
          photo_url?: string | null
          student_code?: string
          title?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          added_by: string | null
          created_at: string | null
          id: string
          role: string | null
          student_id: string
          team_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
          student_id: string
          team_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
          student_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          house_color: string
          id: string
          reject_note: string | null
          sport_id: string
          status: Database["public"]["Enums"]["team_status"] | null
          team_name: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          house_color: string
          id?: string
          reject_note?: string | null
          sport_id: string
          status?: Database["public"]["Enums"]["team_status"] | null
          team_name?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          house_color?: string
          id?: string
          reject_note?: string | null
          sport_id?: string
          status?: Database["public"]["Enums"]["team_status"] | null
          team_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sport_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          assigned_sports: string[] | null
          created_at: string | null
          full_name: string
          house_color: string | null
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          assigned_sports?: string[] | null
          created_at?: string | null
          full_name: string
          house_color?: string | null
          id: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          assigned_sports?: string[] | null
          created_at?: string | null
          full_name?: string
          house_color?: string | null
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_assigned_sports: { Args: never; Returns: string[] }
      auth_house_color: { Args: never; Returns: string }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      grade_in_group: {
        Args: { p_grade: string; p_group: string }
        Returns: boolean
      }
      registration_is_open: { Args: { p_house: string }; Returns: boolean }
    }
    Enums: {
      match_round: "qualifier" | "final"
      match_status: "scheduled" | "ongoing" | "completed" | "cancelled"
      team_status: "draft" | "submitted" | "approved" | "rejected" | "locked"
      user_role:
        | "admin"
        | "teacher"
        | "house_teacher"
        | "sport_captain"
        | "house_captain"
        | "referee"
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
      match_round: ["qualifier", "final"],
      match_status: ["scheduled", "ongoing", "completed", "cancelled"],
      team_status: ["draft", "submitted", "approved", "rejected", "locked"],
      user_role: [
        "admin",
        "teacher",
        "house_teacher",
        "sport_captain",
        "house_captain",
        "referee",
      ],
    },
  },
} as const
