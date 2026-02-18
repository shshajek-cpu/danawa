import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface Customer {
  id: string;
  phone: string;
  name: string | null;
  created_at: string;
}

export interface Quote {
  id: string;
  customer_id: string;
  car_id: string;
  car_name: string;
  trim_id: string;
  trim_name: string;
  trim_price: number;
  color_id: string | null;
  color_name: string | null;
  options: { id: string; name: string; price: number }[];
  total_price: number;
  duration: number;
  mileage: number;
  deposit_rate: number;
  estimated_monthly: number | null;
  status: 'open' | 'closed' | 'cancelled';
  created_at: string;
  customer?: Customer;
  lead_purchases?: LeadPurchase[];
}

export interface Agent {
  id: string;
  user_id: string;
  phone: string;
  name: string;
  company: string;
  is_active: boolean;
  points: number;
  created_at: string;
}

export interface LeadPurchase {
  id: string;
  quote_id: string;
  agent_id: string;
  points_used: number;
  created_at: string;
  agent?: Agent;
  quote?: Quote;
}

export interface PointTransaction {
  id: string;
  agent_id: string;
  amount: number;
  type: 'charge' | 'purchase' | 'refund' | 'bonus';
  description: string | null;
  created_at: string;
}
