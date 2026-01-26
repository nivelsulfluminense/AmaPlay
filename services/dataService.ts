import { supabase, Transaction, InventoryItem, GameEvent, EventParticipant, Team, Profile } from './supabase';
import { Role } from '../contexts/UserContext';

// Legacy interfaces for backward compatibility
export interface LegacyTransaction {
    id: number;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    category: string;
    date: string;
    status: 'paid' | 'pending';
    createdAt: string;
}

export interface LegacyInventoryItem {
    id: number;
    name: string;
    category: string;
    quantity: number;
    maxQuantity: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    image?: string;
    color?: string;
    createdAt: string;
}

export interface PlayerStats {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
}

export interface Player {
    id: number | string;
    name: string;
    position: 'GOL' | 'ZAG' | 'MEI' | 'ATA';
    avatar: string;
    teamId: number | string;
    phone?: string;
    birthDate?: string;
    address?: {
        cep?: string;
        street?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
        number?: string;
        country?: string;
    };
    stats: PlayerStats;
    ovr: number;
    maxScout: number;
    voteCount?: number;
    hasVoted?: boolean;
    isPublic?: boolean;
    heartTeamId?: string | null;
    cardAvatar?: string | null;
    role?: Role;
    is_approved?: boolean;
    is_first_manager?: boolean;
    createdAt: string;
}

export interface LegacyGameEvent {
    id: number | string;
    type: 'game' | 'bbq' | 'match' | 'meeting' | 'birthday';
    title: string;
    opponent?: string;
    date: string;
    time: string;
    location: string;
    confirmedCount: number;
    myStatus: 'pending' | 'confirmed' | 'declined';
    creatorId: number | string;
    createdAt: string;
    participants?: { name: string, avatar: string, status: 'confirmed' | 'declined' }[];
}

export interface CustomTeam {
    id: number | string;
    name: string;
    location: string;
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    creatorId: number | string;
    members: number;
    description?: string;
    isPublic: boolean;
    createdAt: string;
}

// Helper function to get current user's team ID with memoization
let cachedTeamId: string | null = null;
let cachedUserId: string | null = null;

const getCurrentTeamId = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return null;

    if (cachedUserId === user.id && cachedTeamId !== null) {
        return cachedTeamId;
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single();

    cachedUserId = user.id;
    cachedTeamId = profile?.team_id || null;
    return cachedTeamId;
};

export const dataService = {
    team: {
        getPendingRequests: async (): Promise<Profile[]> => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, team_id')
                .eq('id', user.id)
                .single();

            if (!profile?.team_id) return [];

            let query = supabase
                .from('profiles')
                .select('*')
                .eq('team_id', profile.team_id)
                .eq('is_approved', false);

            const { data, error } = await query;
            if (error) return [];

            // Regras de visibilidade solicitadas:
            // Presidente vê VP. VP vê Presidente. Ambos veem Admins e Jogadores.
            return (data || []).filter((p: any) => {
                const requested = p.intended_role;
                if (profile.role === 'presidente') {
                    // Presidente vê tudo que for pendente
                    return true;
                }
                if (profile.role === 'vice-presidente') {
                    // Vice vê Presidente (solicitação), Admins e Jogadores.
                    return true; // Simplificado: eles veem todos os pendentes do time
                }
                return false;
            }) as Profile[];
        }
    },
    finance: {
        list: async (): Promise<LegacyTransaction[]> => {
            const teamId = await getCurrentTeamId();

            let query = supabase
                .from('transactions')
                .select('*')
                .order('created_at', { ascending: false });

            if (teamId) {
                query = query.eq('team_id', teamId);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching transactions:', error);
                return [];
            }

            // Convert to legacy format
            return (data || []).map((t: Transaction) => ({
                id: parseInt(t.id.replace(/-/g, '').slice(0, 10), 16),
                type: t.type,
                amount: Number(t.amount),
                description: t.description,
                category: t.category,
                date: t.transaction_date,
                status: t.status,
                createdAt: t.created_at
            }));
        },

        add: async (transaction: Omit<LegacyTransaction, 'id' | 'createdAt'>): Promise<LegacyTransaction> => {
            const { data: { user } } = await supabase.auth.getUser();
            const teamId = await getCurrentTeamId();

            const { data, error } = await supabase
                .from('transactions')
                .insert({
                    type: transaction.type,
                    amount: transaction.amount,
                    description: transaction.description,
                    category: transaction.category,
                    transaction_date: transaction.date,
                    status: transaction.status,
                    team_id: teamId,
                    creator_id: user?.id
                })
                .select()
                .single();

            if (error) {
                throw new Error(error.message);
            }

            return {
                id: parseInt(data.id.replace(/-/g, '').slice(0, 10), 16),
                type: data.type,
                amount: Number(data.amount),
                description: data.description,
                category: data.category,
                date: data.transaction_date,
                status: data.status,
                createdAt: data.created_at
            };
        },

        updateStatus: async (id: number, status: 'paid' | 'pending' | 'rejected'): Promise<void> => {
            // Find the transaction by legacy ID
            const { data: transactions } = await supabase
                .from('transactions')
                .select('id')
                .limit(100);

            const transaction = transactions?.find(t =>
                parseInt(t.id.replace(/-/g, '').slice(0, 10), 16) === id
            );

            if (transaction) {
                const { error } = await supabase
                    .from('transactions')
                    .update({ status: status as any })
                    .eq('id', transaction.id);

                if (error) throw new Error(error.message);
            } else {
                throw new Error('Transação não encontrada');
            }
        },

        delete: async (id: number): Promise<void> => {
            // For legacy compatibility, we need to find by partial ID match
            // In production, you'd want to use the UUID directly
            const { data: transactions } = await supabase
                .from('transactions')
                .select('id')
                .limit(100);

            const transaction = transactions?.find(t =>
                parseInt(t.id.replace(/-/g, '').slice(0, 10), 16) === id
            );

            if (transaction) {
                await supabase
                    .from('transactions')
                    .delete()
                    .eq('id', transaction.id);
            }
        }
    },

    inventory: {
        list: async (): Promise<LegacyInventoryItem[]> => {
            const teamId = await getCurrentTeamId();

            let query = supabase
                .from('inventory')
                .select('*')
                .order('created_at', { ascending: false });

            if (teamId) {
                query = query.eq('team_id', teamId);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching inventory:', error);
                return [];
            }

            return (data || []).map((item: InventoryItem) => ({
                id: parseInt(item.id.replace(/-/g, '').slice(0, 10), 16),
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                maxQuantity: item.max_quantity,
                status: item.status,
                image: item.image || undefined,
                color: item.color || undefined,
                createdAt: item.created_at
            }));
        },

        save: async (item: Omit<LegacyInventoryItem, 'id' | 'createdAt'> & { id?: number }): Promise<LegacyInventoryItem> => {
            const { data: { user } } = await supabase.auth.getUser();
            const teamId = await getCurrentTeamId();

            if (item.id) {
                // Update - find by legacy ID
                const { data: items } = await supabase
                    .from('inventory')
                    .select('id')
                    .limit(100);

                const existingItem = items?.find(i =>
                    parseInt(i.id.replace(/-/g, '').slice(0, 10), 16) === item.id
                );

                if (existingItem) {
                    const { data, error } = await supabase
                        .from('inventory')
                        .update({
                            name: item.name,
                            category: item.category,
                            quantity: item.quantity,
                            max_quantity: item.maxQuantity,
                            status: item.status,
                            image: item.image,
                            color: item.color
                        })
                        .eq('id', existingItem.id)
                        .select()
                        .single();

                    if (error) throw new Error(error.message);

                    return {
                        id: parseInt(data.id.replace(/-/g, '').slice(0, 10), 16),
                        name: data.name,
                        category: data.category,
                        quantity: data.quantity,
                        maxQuantity: data.max_quantity,
                        status: data.status,
                        image: data.image || undefined,
                        color: data.color || undefined,
                        createdAt: data.created_at
                    };
                }
            }

            // Create new
            const { data, error } = await supabase
                .from('inventory')
                .insert({
                    name: item.name,
                    category: item.category,
                    quantity: item.quantity,
                    max_quantity: item.maxQuantity,
                    status: item.status,
                    image: item.image,
                    color: item.color,
                    team_id: teamId,
                    creator_id: user?.id
                })
                .select()
                .single();

            if (error) throw new Error(error.message);

            return {
                id: parseInt(data.id.replace(/-/g, '').slice(0, 10), 16),
                name: data.name,
                category: data.category,
                quantity: data.quantity,
                maxQuantity: data.max_quantity,
                status: data.status,
                image: data.image || undefined,
                color: data.color || undefined,
                createdAt: data.created_at
            };
        },

        delete: async (id: number): Promise<void> => {
            const { data: items } = await supabase
                .from('inventory')
                .select('id')
                .limit(100);

            const item = items?.find(i =>
                parseInt(i.id.replace(/-/g, '').slice(0, 10), 16) === id
            );

            if (item) {
                await supabase
                    .from('inventory')
                    .delete()
                    .eq('id', item.id);
            }
        }
    },

    players: {
        list: async (): Promise<Player[]> => {
            const teamId = await getCurrentTeamId();

            let query = supabase
                .from('profiles')
                .select('*')
                .not('position', 'is', null)
                .order('created_at', { ascending: false });

            if (teamId) {
                query = query.eq('team_id', teamId).eq('is_approved', true);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching players:', error);
                return [];
            }

            return (data || []).map((p: Profile) => ({
                id: p.id,
                name: p.name,
                position: p.position || 'MEI',
                avatar: p.avatar || '',
                teamId: p.team_id || '',
                phone: p.phone || undefined,
                birthDate: p.birth_date || undefined,
                address: p.address || undefined,
                stats: p.stats,
                ovr: p.ovr,
                maxScout: p.max_scout,
                voteCount: p.vote_count,
                hasVoted: p.has_voted,
                isPublic: p.is_public,
                heartTeamId: p.heart_team,
                cardAvatar: p.card_avatar,
                role: p.role,
                is_approved: p.is_approved,
                is_first_manager: p.is_first_manager,
                createdAt: p.created_at
            }));
        },

        getById: async (id: number | string): Promise<Player | undefined> => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', String(id))
                .single();

            if (error || !data) return undefined;

            return {
                id: data.id,
                name: data.name,
                position: data.position || 'MEI',
                avatar: data.avatar || '',
                teamId: data.team_id || '',
                phone: data.phone || undefined,
                birthDate: data.birth_date || undefined,
                address: data.address || undefined,
                stats: data.stats,
                ovr: data.ovr,
                maxScout: data.max_scout,
                voteCount: data.vote_count,
                hasVoted: data.has_voted,
                isPublic: data.is_public,
                heartTeamId: data.heart_team,
                cardAvatar: data.card_avatar,
                role: data.role,
                createdAt: data.created_at
            };
        },

        save: async (player: Partial<Player> & { id?: number | string }): Promise<Player> => {
            const { data: { user } } = await supabase.auth.getUser();

            if (player.id && typeof player.id === 'string') {
                // Update existing profile
                const { data, error } = await supabase
                    .from('profiles')
                    .update({
                        name: player.name,
                        position: player.position,
                        avatar: player.avatar,
                        phone: player.phone,
                        birth_date: player.birthDate,
                        address: player.address,
                        stats: player.stats,
                        ovr: player.ovr,
                        max_scout: player.maxScout,
                        vote_count: player.voteCount,
                        has_voted: player.hasVoted,
                        is_public: player.isPublic,
                        heart_team: player.heartTeamId,
                        card_avatar: player.cardAvatar
                    })
                    .eq('id', player.id)
                    .select()
                    .single();

                if (error) throw new Error(error.message);

                return {
                    id: data.id,
                    name: data.name,
                    position: data.position || 'MEI',
                    avatar: data.avatar || '',
                    teamId: data.team_id || '',
                    phone: data.phone || undefined,
                    birthDate: data.birth_date || undefined,
                    address: data.address || undefined,
                    stats: data.stats,
                    ovr: data.ovr,
                    maxScout: data.max_scout,
                    voteCount: data.vote_count,
                    hasVoted: data.has_voted,
                    isPublic: data.is_public,
                    createdAt: data.created_at
                };
            }

            // Update current user's profile
            if (!user) throw new Error('Usuário não autenticado');

            const { data, error } = await supabase
                .from('profiles')
                .update({
                    name: player.name,
                    position: player.position,
                    avatar: player.avatar,
                    phone: player.phone,
                    birth_date: player.birthDate,
                    address: player.address,
                    stats: player.stats,
                    ovr: player.ovr,
                    max_scout: player.maxScout,
                    vote_count: player.voteCount,
                    has_voted: player.hasVoted,
                    is_public: player.isPublic,
                    heart_team: player.heartTeamId,
                    card_avatar: player.cardAvatar
                })
                .eq('id', user.id)
                .select()
                .single();

            if (error) throw new Error(error.message);

            return {
                id: data.id,
                name: data.name,
                position: data.position || 'MEI',
                avatar: data.avatar || '',
                teamId: data.team_id || '',
                phone: data.phone || undefined,
                birthDate: data.birth_date || undefined,
                address: data.address || undefined,
                stats: data.stats,
                ovr: data.ovr,
                maxScout: data.max_scout,
                voteCount: data.vote_count,
                hasVoted: data.has_voted,
                isPublic: data.is_public,
                createdAt: data.created_at
            };
        },

        seed: async (_initialPlayers: Player[]) => {
            // No-op for Supabase - seeding is done through migrations
            console.log('Seeding not needed with Supabase');
        }
    },

    events: {
        list: async (): Promise<LegacyGameEvent[]> => {
            const { data: { user } } = await supabase.auth.getUser();
            const teamId = await getCurrentTeamId();

            let query = supabase
                .from('events')
                .select('*')
                .order('event_date', { ascending: true });

            if (teamId) {
                query = query.eq('team_id', teamId);
            }

            const { data: events, error } = await query;

            if (error) {
                console.error('Error fetching events:', error);
                return [];
            }

            // Get user's participation status for each event
            const eventIds = events?.map(e => e.id) || [];
            let participations: EventParticipant[] = [];

            if (user && eventIds.length > 0) {
                const { data: parts } = await supabase
                    .from('event_participants')
                    .select('*')
                    .eq('user_id', user.id)
                    .in('event_id', eventIds);

                participations = parts || [];
            }

            return (events || []).map((e: GameEvent) => {
                const participation = participations.find(p => p.event_id === e.id);
                return {
                    id: e.id,
                    type: e.type,
                    title: e.title,
                    opponent: e.opponent || undefined,
                    date: e.event_date,
                    time: e.event_time,
                    location: e.location,
                    confirmedCount: e.confirmed_count,
                    myStatus: (participation?.status as 'pending' | 'confirmed' | 'declined') || 'pending',
                    creatorId: e.creator_id || 0,
                    createdAt: e.created_at
                };
            });
        },

        getParticipants: async (eventId: string | number): Promise<{ name: string, avatar: string, status: 'confirmed' | 'declined' }[]> => {
            // If it's a numeric ID from our legacy mapping, we might have trouble finding the real UUID.
            // But usually we use the string ID in the new code.
            const realId = typeof eventId === 'number' ? null : eventId;
            if (!realId) return [];

            const { data, error } = await supabase
                .from('event_participants')
                .select(`
                    status,
                    profiles:user_id (
                        name,
                        avatar
                    )
                `)
                .eq('event_id', realId);

            if (error) return [];

            return (data || []).map((p: any) => ({
                name: p.profiles?.name || 'Desconhecido',
                avatar: p.profiles?.avatar || '',
                status: p.status as 'confirmed' | 'declined'
            }));
        },

        add: async (event: Omit<LegacyGameEvent, 'id' | 'createdAt'>): Promise<LegacyGameEvent> => {
            const { data: { user } } = await supabase.auth.getUser();
            const teamId = await getCurrentTeamId();

            const { data, error } = await supabase
                .from('events')
                .insert({
                    type: event.type,
                    title: event.title,
                    opponent: event.opponent,
                    event_date: event.date,
                    event_time: event.time,
                    location: event.location,
                    confirmed_count: 1, // Creator confirms
                    team_id: teamId,
                    creator_id: user?.id
                })
                .select()
                .single();

            if (error) throw new Error(error.message);

            // Automatically confirm the creator
            if (user) {
                await supabase
                    .from('event_participants')
                    .upsert({
                        event_id: data.id,
                        user_id: user.id,
                        status: 'confirmed'
                    });
            }

            return {
                id: data.id,
                type: data.type,
                title: data.title,
                opponent: data.opponent || undefined,
                date: data.event_date,
                time: data.event_time,
                location: data.location,
                confirmedCount: data.confirmed_count,
                myStatus: 'confirmed',
                creatorId: data.creator_id || '',
                createdAt: data.created_at
            };
        },

        addMultiple: async (event: Omit<LegacyGameEvent, 'id' | 'createdAt'>, recurrence: 'none' | 'week' | 'month' | 'year'): Promise<boolean> => {
            const { data: { user } } = await supabase.auth.getUser();
            const teamId = await getCurrentTeamId();
            if (!user || !teamId) return false;

            const dates: string[] = [event.date];
            const [y, m, d_num] = event.date.split('-').map(Number);
            const baseDate = new Date(y, m - 1, d_num);

            if (recurrence === 'week') {
                for (let i = 1; i < 12; i++) {
                    const d = new Date(baseDate);
                    d.setDate(d.getDate() + (i * 7));
                    dates.push(d.toISOString().split('T')[0]);
                }
            } else if (recurrence === 'month') {
                for (let i = 1; i < 12; i++) {
                    const d = new Date(baseDate);
                    d.setMonth(d.getMonth() + i);
                    dates.push(d.toISOString().split('T')[0]);
                }
            } else if (recurrence === 'year') {
                for (let i = 1; i < 5; i++) {
                    const d = new Date(baseDate);
                    d.setFullYear(d.getFullYear() + i);
                    dates.push(d.toISOString().split('T')[0]);
                }
            }

            const inserts = dates.map(d => ({
                type: event.type,
                title: event.title,
                opponent: event.opponent,
                event_date: d,
                event_time: event.time,
                location: event.location,
                confirmed_count: 1,
                team_id: teamId,
                creator_id: user.id
            }));

            const { data, error } = await supabase
                .from('events')
                .insert(inserts)
                .select('id');

            if (error) throw error;

            if (data && data.length > 0) {
                const parts = data.map(ev => ({
                    event_id: ev.id,
                    user_id: user.id,
                    status: 'confirmed'
                }));
                await supabase.from('event_participants').upsert(parts, { onConflict: 'event_id,user_id' });
            }

            return true;
        },

        updateStatus: async (id: number | string, status: 'confirmed' | 'declined'): Promise<void> => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            let realId = id;
            if (typeof id === 'number') {
                const { data: events } = await supabase.from('events').select('id').limit(100);
                const found = events?.find(e => parseInt(e.id.replace(/-/g, '').slice(0, 10), 16) === id);
                if (!found) throw new Error('Evento não encontrado');
                realId = found.id;
            }

            const { data: event } = await supabase
                .from('events')
                .select('confirmed_count')
                .eq('id', realId)
                .single();

            if (!event) throw new Error('Evento não encontrado');

            const { data: existing } = await supabase
                .from('event_participants')
                .select('*')
                .eq('event_id', realId)
                .eq('user_id', user.id)
                .maybeSingle();

            const wasConfirmed = existing?.status === 'confirmed';
            const willBeConfirmed = status === 'confirmed';

            await supabase
                .from('event_participants')
                .upsert({
                    event_id: realId,
                    user_id: user.id,
                    status
                }, {
                    onConflict: 'event_id,user_id'
                });

            let newCount = event.confirmed_count || 0;
            if (!wasConfirmed && willBeConfirmed) newCount++;
            if (wasConfirmed && !willBeConfirmed) newCount--;

            await supabase
                .from('events')
                .update({ confirmed_count: Math.max(0, newCount) })
                .eq('id', realId);
        },

        delete: async (id: number): Promise<void> => {
            const { data: events } = await supabase
                .from('events')
                .select('id')
                .limit(100);

            const event = events?.find(e =>
                parseInt(e.id.replace(/-/g, '').slice(0, 10), 16) === id
            );

            if (event) {
                await supabase
                    .from('events')
                    .delete()
                    .eq('id', event.id);
            }
        }
    },

    customTeams: {
        list: async (): Promise<CustomTeam[]> => {
            const { data, error } = await supabase
                .from('teams')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching teams:', error);
                return [];
            }

            return (data || []).map((t: Team) => ({
                id: t.id,
                name: t.name,
                location: t.location || '',
                logo: t.logo || undefined,
                primaryColor: t.primary_color,
                secondaryColor: t.secondary_color,
                creatorId: t.creator_id || '',
                members: t.member_count,
                description: t.description || undefined,
                isPublic: t.is_public,
                createdAt: t.created_at
            }));
        },

        getById: async (id: number | string): Promise<CustomTeam | undefined> => {
            const { data, error } = await supabase
                .from('teams')
                .select('*')
                .eq('id', String(id))
                .single();

            if (error || !data) return undefined;

            return {
                id: data.id,
                name: data.name,
                location: data.location || '',
                logo: data.logo || undefined,
                primaryColor: data.primary_color,
                secondaryColor: data.secondary_color,
                creatorId: data.creator_id || '',
                members: data.member_count,
                description: data.description || undefined,
                isPublic: data.is_public,
                createdAt: data.created_at
            };
        },

        add: async (team: Omit<CustomTeam, 'id' | 'createdAt'>): Promise<CustomTeam> => {
            const { data: { user } } = await supabase.auth.getUser();

            const { data, error } = await supabase
                .from('teams')
                .insert({
                    name: team.name,
                    location: team.location,
                    logo: team.logo,
                    primary_color: team.primaryColor,
                    secondary_color: team.secondaryColor,
                    description: team.description,
                    is_public: team.isPublic,
                    creator_id: user?.id,
                    member_count: team.members || 1
                })
                .select()
                .single();

            if (error) throw new Error(error.message);

            // Update user's team_id
            if (user) {
                await supabase
                    .from('profiles')
                    .update({ team_id: data.id })
                    .eq('id', user.id);
            }

            return {
                id: data.id,
                name: data.name,
                location: data.location || '',
                logo: data.logo || undefined,
                primaryColor: data.primary_color,
                secondaryColor: data.secondary_color,
                creatorId: data.creator_id || '',
                members: data.member_count,
                description: data.description || undefined,
                isPublic: data.is_public,
                createdAt: data.created_at
            };
        },

        update: async (id: number | string, updates: Partial<CustomTeam>): Promise<CustomTeam> => {
            const { data, error } = await supabase
                .from('teams')
                .update({
                    name: updates.name,
                    location: updates.location,
                    logo: updates.logo,
                    primary_color: updates.primaryColor,
                    secondary_color: updates.secondaryColor,
                    description: updates.description,
                    is_public: updates.isPublic,
                    member_count: updates.members
                })
                .eq('id', String(id))
                .select()
                .single();

            if (error) throw new Error(error.message);

            return {
                id: data.id,
                name: data.name,
                location: data.location || '',
                logo: data.logo || undefined,
                primaryColor: data.primary_color,
                secondaryColor: data.secondary_color,
                creatorId: data.creator_id || '',
                members: data.member_count,
                description: data.description || undefined,
                isPublic: data.is_public,
                createdAt: data.created_at
            };
        },

        delete: async (id: number | string): Promise<void> => {
            await supabase
                .from('teams')
                .delete()
                .eq('id', String(id));
        },

        seed: async (_initialTeams: CustomTeam[]) => {
            // No-op for Supabase
            console.log('Seeding not needed with Supabase');
        }
    }
};
