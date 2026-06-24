import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  provider: string | null;
  provider_user_id: string | null;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export interface ClassReservation {
  id: string;
  user_id: string;
  class_name: string;
  preferred_date: string;
  note: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
}

export interface WorkshopReview {
  id: string;
  user_id: string;
  display_name: string;
  rating: number;
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'hidden';
  created_at: string;
  updated_at?: string;
}
