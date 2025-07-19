import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          phone?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          created_at?: string
        }
      }
      care_circles: {
        Row: {
          id: string
          patient_first_name: string
          patient_last_name: string
          facility_name: string | null
          room_number: string | null
          visiting_hours_start: string | null
          visiting_hours_end: string | null
          special_notes: string | null
          created_by: string | null
          created_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          patient_first_name: string
          patient_last_name: string
          facility_name?: string | null
          room_number?: string | null
          visiting_hours_start?: string | null
          visiting_hours_end?: string | null
          special_notes?: string | null
          created_by?: string | null
          created_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          patient_first_name?: string
          patient_last_name?: string
          facility_name?: string | null
          room_number?: string | null
          visiting_hours_start?: string | null
          visiting_hours_end?: string | null
          special_notes?: string | null
          created_by?: string | null
          created_at?: string
          is_active?: boolean
        }
      }
      circle_members: {
        Row: {
          id: string
          circle_id: string
          user_id: string
          role: 'coordinator' | 'visitor' | 'view_only'
          joined_at: string
        }
        Insert: {
          id?: string
          circle_id: string
          user_id: string
          role?: 'coordinator' | 'visitor' | 'view_only'
          joined_at?: string
        }
        Update: {
          id?: string
          circle_id?: string
          user_id?: string
          role?: 'coordinator' | 'visitor' | 'view_only'
          joined_at?: string
        }
      }
      visits: {
        Row: {
          id: string
          circle_id: string
          visitor_id: string | null
          visit_date: string
          start_time: string
          end_time: string
          notes: string | null
          status: 'scheduled' | 'completed' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          circle_id: string
          visitor_id?: string | null
          visit_date: string
          start_time: string
          end_time: string
          notes?: string | null
          status?: 'scheduled' | 'completed' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          circle_id?: string
          visitor_id?: string | null
          visit_date?: string
          start_time?: string
          end_time?: string
          notes?: string | null
          status?: 'scheduled' | 'completed' | 'cancelled'
          created_at?: string
        }
      }
      updates: {
        Row: {
          id: string
          circle_id: string
          author_id: string | null
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          circle_id: string
          author_id?: string | null
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          circle_id?: string
          author_id?: string | null
          message?: string
          created_at?: string
        }
      }
    }
  }
}