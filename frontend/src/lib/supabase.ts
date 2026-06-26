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
  phone: string | null;
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
  phone: string;
  note: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
}

export interface WorkshopReview {
  id: string;
  user_id: string | null;
  display_name: string;
  rating: number;
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'hidden';
  invite_id?: string | null;
  review_type?: 'class' | 'product' | 'other';
  product_name?: string | null;
  class_name?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ReviewInvite {
  id: string;
  token: string;
  customer_name: string | null;
  review_type: 'class' | 'product' | 'other';
  product_name: string | null;
  class_name: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface ContactInquiry {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  status: 'new' | 'read' | 'replied';
  email_sent: boolean;
  email_error: string | null;
  created_at: string;
  updated_at?: string;
}

export interface SiteProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  colors: string[];
  badge: 'NEW' | 'BEST' | 'CUSTOM' | null;
  image: string;
  category: 'wallets' | 'bags' | 'desk' | 'gifts';
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface WorkshopClass {
  id: string;
  name: string;
  description: string;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  image: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}
