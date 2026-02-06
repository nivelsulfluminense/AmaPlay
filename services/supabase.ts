import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// === Database types based on public schema ===

export interface Profile {
    id: string; // UUID
    email: string;
    name: string;
    role: 'presidente' | 'vice-presidente' | 'admin' | 'player';
    intended_role: 'presidente' | 'vice-presidente' | 'admin' | 'player' | null;
    avatar: string | null;
    card_avatar: string | null;
    team_id: string | null; // UUID
    phone: string | null;
    birth_date: string | null;
    address: {
        cep?: string;
        street?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
        number?: string;
        complement?: string;
        country?: string;
    } | null;
    position: 'GOL' | 'ZAG' | 'MEI' | 'ATA' | null;
    is_pro: boolean | null;
    stats: {
        pace: number;
        shooting: number;
        passing: number;
        dribbling: number;
        defending: number;
        physical: number;
    } | null;
    ovr: number | null;
    max_scout: number | null;
    vote_count: number | null;
    has_voted: boolean | null;
    is_public: boolean | null;
    is_setup_complete: boolean | null;
    status: 'pending' | 'approved' | 'rejected' | null;
    is_approved: boolean | null;
    is_first_manager: boolean | null;
    heart_team: string | null;
    created_at: string;
    updated_at: string | null;
}

export interface Team {
    id: string; // UUID
    name: string;
    location: string | null;
    logo: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    description: string | null;
    is_public: boolean | null;
    creator_id: string | null; // UUID
    member_count: number | null;
    has_first_manager: boolean | null;
    created_at: string;
    updated_at: string | null;
}

export interface GameEvent {
    id: string; // UUID
    type: 'game' | 'bbq';
    title: string;
    opponent: string | null;
    event_date: string;
    event_time: string;
    location: string;
    confirmed_count: number;
    team_id: string | null;
    creator_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface EventParticipant {
    id: string; // UUID
    event_id: string;
    user_id: string;
    status: 'pending' | 'confirmed' | 'declined';
    created_at: string;
    updated_at: string;
}

export interface Transaction {
    id: string; // UUID
    type: 'income' | 'expense';
    amount: number;
    description: string;
    category: string;
    transaction_date: string;
    status: 'paid' | 'pending';
    team_id: string | null;
    creator_id: string | null;
    created_at: string;
    updated_at: string | null;
}

export interface InventoryItem {
    id: string; // UUID
    name: string;
    category: string;
    quantity: number;
    max_quantity: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    image: string | null;
    color: string | null;
    team_id: string | null;
    creator_id: string | null;
    responsible_id: string | null;
    created_at: string;
    updated_at: string | null;
}

// === Tabela team_members ===
export interface TeamMemberDB {
    id: string;
    team_id: string;
    profile_id: string;
    role: 'presidente' | 'vice-presidente' | 'admin' | 'player';
    is_team_approved: boolean;
    created_at: string;
    updated_at: string | null;
}
