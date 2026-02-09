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
    status: 'paid' | 'pending' | 'rejected';
    createdAt: string;
    referenceMonth?: number;
    referenceYear?: number;
    chargeId?: string;
    targetUserId?: string;
    createdByName?: string;
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
    responsibleId?: string | null;
    createdAt: string;
}

export interface Charge {
    id: string;
    teamId: string;
    creatorId: string;
    title: string;
    amount: number;
    type: 'monthly' | 'extra';
    createdAt: string;
}

export interface ReceiverAccount {
    id?: string;
    teamId?: string;
    ownerName: string;
    documentNumber: string;
    agency: string;
    accountNumber: string;
    institution: string;
    accountType: string;
    pixKey: string;
}

export interface PlayerStats {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending?: number;
    physical: number;
}

export interface ScoringStats {
    lastGameScore: number;
    annualAverage: number;
    matchesCount: number;
}

export interface MatchRating {
    id: string;
    eventId: string;
    voterId: string;
    playerId: string;
    rating: number;
    createdAt: string;
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
        cardImageSettings?: {
            scale: number;
            x: number;
            y: number;
            mask: number;
        };
        [key: string]: any;
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
    endTime?: string;
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
            // Presidente vÃª VP. VP vÃª Presidente. Ambos veem Admins e Jogadores.
            return (data || []).filter((p: any) => {
                const requested = p.intended_role;
                if (profile.role === 'presidente') {
                    // Presidente vÃª tudo que for pendente
                    return true;
                }
                if (profile.role === 'vice-presidente') {
                    // Vice vÃª Presidente (solicitaÃ§Ã£o), Admins e Jogadores.
                    return true; // Simplificado: eles veem todos os pendentes do time
                }
                return false;
            }) as Profile[];
        }
    },
    finance: {
        list: async (userId?: string): Promise<LegacyTransaction[]> => {
            const teamId = await getCurrentTeamId();

            let query = supabase
                .from('transactions')
                .select('*')
                .order('created_at', { ascending: false });

            if (teamId) {
                query = query.eq('team_id', teamId);
            }

            if (userId) {
                query = query.eq('target_user_id', userId);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching transactions:', error);
                return [];
            }

            // Convert to legacy format
            return (data || []).map((t: any) => ({
                id: parseInt(t.id.replace(/-/g, '').slice(0, 10), 16),
                type: t.type,
                amount: Number(t.amount),
                description: t.description,
                category: t.category,
                date: t.transaction_date,
                status: t.status,
                createdAt: t.created_at,
                referenceMonth: t.reference_month,
                referenceYear: t.reference_year,
                chargeId: t.charge_id,
                targetUserId: t.target_user_id,
                createdByName: t.created_by_name
            }));
        },

        add: async (transaction: Omit<LegacyTransaction, 'id' | 'createdAt'> & { proof_url?: string }): Promise<LegacyTransaction> => {
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
                    creator_id: user?.id,
                    proof_url: transaction.proof_url,
                    reference_month: transaction.referenceMonth,
                    reference_year: transaction.referenceYear,
                    charge_id: transaction.chargeId,
                    target_user_id: transaction.targetUserId,
                    created_by_name: transaction.createdByName
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
                createdAt: data.created_at,
                referenceMonth: data.reference_month,
                referenceYear: data.reference_year,
                chargeId: data.charge_id,
                targetUserId: data.target_user_id,
                createdByName: data.created_by_name
            };
        },

        charges: {
            list: async (): Promise<Charge[]> => {
                const teamId = await getCurrentTeamId();
                if (!teamId) return [];

                const { data, error } = await supabase
                    .from('charges')
                    .select('*')
                    .eq('team_id', teamId)
                    .order('created_at', { ascending: false });

                if (error) return [];

                return (data || []).map(c => ({
                    id: c.id,
                    teamId: c.team_id,
                    creatorId: c.creator_id,
                    title: c.title,
                    amount: Number(c.amount),
                    type: c.type,
                    createdAt: c.created_at
                }));
            },

            add: async (charge: Omit<Charge, 'id' | 'teamId' | 'creatorId' | 'createdAt'>): Promise<Charge> => {
                const { data: { user } } = await supabase.auth.getUser();
                const teamId = await getCurrentTeamId();

                const { data, error } = await supabase
                    .from('charges')
                    .insert({
                        title: charge.title,
                        amount: charge.amount,
                        type: charge.type,
                        team_id: teamId,
                        creator_id: user?.id
                    })
                    .select()
                    .single();

                if (error) throw new Error(error.message);

                return {
                    id: data.id,
                    teamId: data.team_id,
                    creatorId: data.creator_id,
                    title: data.title,
                    amount: Number(data.amount),
                    type: data.type,
                    createdAt: data.created_at
                };
            }
        },

        receiver: {
            get: async (): Promise<ReceiverAccount | null> => {
                const teamId = await getCurrentTeamId();
                if (!teamId) return null;
                const { data, error } = await supabase
                    .from('receiver_accounts')
                    .select('*')
                    .eq('team_id', teamId)
                    .maybeSingle();
                if (error || !data) return null;
                return {
                    id: data.id,
                    teamId: data.team_id,
                    ownerName: data.owner_name,
                    documentNumber: data.document_number,
                    agency: data.agency,
                    accountNumber: data.account_number,
                    institution: data.institution,
                    accountType: data.account_type,
                    pixKey: data.pix_key
                };
            },
            update: async (details: ReceiverAccount): Promise<void> => {
                const teamId = await getCurrentTeamId();
                const { error } = await supabase
                    .from('receiver_accounts')
                    .upsert({
                        team_id: teamId,
                        owner_name: details.ownerName,
                        document_number: details.documentNumber,
                        agency: details.agency,
                        account_number: details.accountNumber,
                        institution: details.institution,
                        account_type: details.accountType,
                        pix_key: details.pixKey,
                        updated_at: new Date().toISOString()
                    });
                if (error) throw error;
            }
        },

        updateStatus: async (id: number, status: 'paid' | 'pending' | 'rejected'): Promise<void> => {
            // Find the transaction by legacy ID
            const { data: transactions } = await supabase
                .from('transactions')
                .select('id')
                .order('created_at', { ascending: false })
                .limit(1000);

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
                throw new Error('TransaÃ§Ã£o nÃ£o encontrada');
            }
        },

        delete: async (id: number): Promise<void> => {
            // For legacy compatibility, we need to find by partial ID match
            // In production, you'd want to use the UUID directly
            const { data: transactions } = await supabase
                .from('transactions')
                .select('id')
                .order('created_at', { ascending: false })
                .limit(1000);

            const transaction = transactions?.find(t =>
                parseInt(t.id.replace(/-/g, '').slice(0, 10), 16) === id
            );

            if (transaction) {
                await supabase
                    .from('transactions')
                    .delete()
                    .eq('id', transaction.id);
            }
        },

        getSettings: async () => {
            const teamId = await getCurrentTeamId();
            if (!teamId) return null;

            const { data, error } = await supabase
                .from('teams')
                .select('monthly_fee_amount, due_day, launch_day, fee_start_date')
                .eq('id', teamId)
                .single();

            if (error) return null;
            return {
                monthlyFee: Number(data.monthly_fee_amount),
                dueDay: data.due_day,
                launchDay: data.launch_day,
                feeStartDate: data.fee_start_date
            };
        },

        updateSettings: async (settings: { monthlyFee?: number, dueDay?: number, launchDay?: number, feeStartDate?: string }) => {
            const teamId = await getCurrentTeamId();
            if (!teamId) throw new Error('No team');

            const { error } = await supabase
                .from('teams')
                .update({
                    monthly_fee_amount: settings.monthlyFee,
                    due_day: settings.dueDay,
                    launch_day: settings.launchDay,
                    fee_start_date: settings.feeStartDate
                })
                .eq('id', teamId);

            if (error) throw error;
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
                responsibleId: item.responsible_id,
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
                            color: item.color,
                            responsible_id: item.responsibleId
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
                        responsibleId: data.responsible_id,
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
                    creator_id: user?.id,
                    responsible_id: item.responsibleId
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
                responsibleId: data.responsible_id,
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

    voting: {
        cast: async (targetId: string, stats: any) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { error } = await supabase
                .from('player_votes')
                .upsert({
                    voter_id: user.id,
                    target_user_id: targetId,
                    ...stats,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'voter_id,target_user_id' });

            if (error) throw error;
        },

        getMyVote: async (targetId: string) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await supabase
                .from('player_votes')
                .select('*')
                .eq('voter_id', user.id)
                .eq('target_user_id', targetId)
                .single();

            if (error || !data) return null;
            return {
                pace: data.pace,
                shooting: data.shooting,
                passing: data.passing,
                dribbling: data.dribbling,
                defending: data.defending,
                physical: data.physical
            };
        }
    },

    scoring: {
        async getRatingsAnalytics(teamId: string) {
            const { data, error } = await supabase
                .from('match_ratings')
                .select(`
                    rating,
                    player_id,
                    game_events:event_id!inner (
                        team_id,
                        event_date
                    )
                `)
                .eq('game_events.team_id', teamId);

            if (error) {
                console.error('Error fetching ratings analytics:', error);
                return [];
            }

            return data || [];
        },
        getMatchRatings: async (eventId: string): Promise<MatchRating[]> => {
            const { data, error } = await supabase
                .from('match_ratings')
                .select('*')
                .eq('event_id', eventId);

            if (error) return [];

            return data.map((r: any) => ({
                id: r.id,
                eventId: r.event_id,
                voterId: r.voter_id,
                playerId: r.player_id,
                rating: Number(r.rating),
                createdAt: r.created_at
            }));
        },

        submitRating: async (eventId: string, playerId: string, rating: number) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { error } = await supabase
                .from('match_ratings')
                .upsert({
                    event_id: eventId,
                    voter_id: user.id,
                    player_id: playerId,
                    rating: rating
                }, { onConflict: 'event_id,voter_id,player_id' });

            if (error) throw error;
        },

        submitRatingsBulk: async (eventId: string, ratings: { playerId: string, rating: number }[]) => {
            if (!eventId) throw new Error('Event ID is required');
            if (!ratings || ratings.length === 0) return;

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const rows = ratings.map(r => ({
                event_id: eventId,
                voter_id: user.id,
                player_id: r.playerId,
                rating: r.rating
            }));

            const { error } = await supabase
                .from('match_ratings')
                .upsert(rows, { onConflict: 'event_id,voter_id,player_id' });

            if (error) {
                console.error('Error in submitRatingsBulk:', error);
                if (error.code === 'PGRST204' || error.message?.includes('not found')) {
                    throw new Error('Erro de infraestrutura: A tabela de avaliações não foi encontrada. Por favor, execute o script SQL de migração.');
                }
                throw error;
            }
        },

        getMyStats: async (): Promise<ScoringStats> => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { lastGameScore: 0, annualAverage: 0, matchesCount: 0 };

            const { data: ratings } = await supabase
                .from('match_ratings')
                .select('rating, event_id, game_events(event_date)')
                .eq('player_id', user.id);

            if (!ratings || ratings.length === 0) return { lastGameScore: 0, annualAverage: 0, matchesCount: 0 };

            const ratingsByEvent: Record<string, number[]> = {};
            ratings.forEach((r: any) => {
                if (!ratingsByEvent[r.event_id]) ratingsByEvent[r.event_id] = [];
                ratingsByEvent[r.event_id].push(Number(r.rating));
            });

            const gameScores: number[] = Object.values(ratingsByEvent).map(votes => {
                const sum = votes.reduce((a, b) => a + b, 0);
                return sum / votes.length;
            });

            const totalSum = gameScores.reduce((a, b) => a + b, 0);
            const annualAverage = gameScores.length > 0 ? totalSum / gameScores.length : 0;

            const sortedRatings = [...ratings].sort((a: any, b: any) => {
                const dateA = a.game_events?.event_date || '';
                const dateB = b.game_events?.event_date || '';
                return dateB.localeCompare(dateA);
            });

            let lastGameScore = 0;
            if (sortedRatings.length > 0) {
                const lastEventId = sortedRatings[0].event_id;
                const lastGameVotes = ratingsByEvent[lastEventId];
                const sum = lastGameVotes.reduce((a, b) => a + b, 0);
                lastGameScore = sum / lastGameVotes.length;
            }

            return {
                lastGameScore: Number(lastGameScore.toFixed(1)),
                annualAverage: Number(annualAverage.toFixed(1)),
                matchesCount: gameScores.length
            };
        }
    },

    players: {
        list: async (includeIncomplete: boolean = false, forcedTeamId?: string): Promise<Player[]> => {
            const teamId = forcedTeamId || await getCurrentTeamId();

            let query = supabase
                .from('profiles')
                .select('*')
                .order('name', { ascending: true });

            if (!includeIncomplete) {
                query = query.not('position', 'is', null);
            }

            if (teamId) {
                // Suporta tanto o padrÃ£o novo (status='approved') quanto o legado (is_approved=true)
                // Usamos eq(team_id) e o or(status/is_approved)
                query = query.eq('team_id', teamId).or('status.eq.approved,is_approved.eq.true,role.eq.presidente,role.eq.vice-presidente');
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
            if (!user) throw new Error('UsuÃ¡rio nÃ£o autenticado');

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
                .from('game_events')
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
                    endTime: e.end_time || undefined,
                    location: e.location,
                    confirmedCount: e.confirmed_count,
                    myStatus: (participation?.status as 'pending' | 'confirmed' | 'declined') || 'pending',
                    creatorId: e.creator_id || 0,
                    createdAt: e.created_at
                };
            });
        },

        getParticipants: async (eventId: string | number): Promise<{ id: string, name: string, avatar: string, status: 'confirmed' | 'declined', is_pro: boolean }[]> => {
            const realId = typeof eventId === 'number' ? null : eventId;
            if (!realId) return [];

            const { data, error } = await supabase
                .from('event_participants')
                .select(`
                    status,
                    profiles:user_id (
                        id,
                        name,
                        avatar,
                        is_pro
                    )
                `)
                .eq('event_id', realId);

            if (error) return [];

            return (data || []).map((p: any) => ({
                id: p.profiles?.id || '',
                name: p.profiles?.name || 'Desconhecido',
                avatar: p.profiles?.avatar || '',
                status: p.status as 'confirmed' | 'declined',
                is_pro: !!p.profiles?.is_pro
            }));
        },

        add: async (event: Omit<LegacyGameEvent, 'id' | 'createdAt'>): Promise<LegacyGameEvent> => {
            const { data: { user } } = await supabase.auth.getUser();
            const teamId = await getCurrentTeamId();

            const { data, error } = await supabase
                .from('game_events')
                .insert({
                    type: event.type,
                    title: event.title,
                    opponent: event.opponent,
                    event_date: event.date,
                    event_time: event.time,
                    end_time: event.endTime,
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
                const { error: confirmError } = await supabase
                    .from('event_participants')
                    .upsert({
                        event_id: data.id,
                        user_id: user.id,
                        status: 'confirmed'
                    });

                if (confirmError) {
                    console.error('Error auto-confirming creator:', confirmError);
                }
            }

            return {
                id: data.id,
                type: data.type,
                title: data.title,
                opponent: data.opponent || undefined,
                date: data.event_date,
                time: data.event_time,
                endTime: data.end_time || undefined,
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
                .from('game_events')
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
            if (!user) throw new Error('UsuÃ¡rio nÃ£o autenticado');

            let realId = id;
            if (typeof id === 'number') {
                const { data: events } = await supabase.from('game_events').select('id').limit(100);
                const found = events?.find(e => parseInt(e.id.replace(/-/g, '').slice(0, 10), 16) === id);
                if (!found) throw new Error('Evento nÃ£o encontrado');
                realId = found.id;
            }

            // Upsert only the participant status. 
            // The 'confirmed_count' in the 'game_events' table is now updated automatically 
            // by a database trigger (tr_refresh_confirmed_count).
            const { error: upsertError } = await supabase
                .from('event_participants')
                .upsert({
                    event_id: realId,
                    user_id: user.id,
                    status
                }, {
                    onConflict: 'event_id,user_id'
                });

            if (upsertError) {
                console.error('Erro ao atualizar status do participante:', upsertError);
                throw new Error('Erro ao atualizar presenÃ§a: ' + upsertError.message);
            }
        },

        update: async (id: number | string, updates: Partial<LegacyGameEvent>): Promise<void> => {
            let realId = id;
            if (typeof id === 'number') {
                const { data: events } = await supabase.from('game_events').select('id').limit(100);
                const found = events?.find(e => parseInt(e.id.replace(/-/g, '').slice(0, 10), 16) === id);
                if (!found) throw new Error('Evento nÃ£o encontrado');
                realId = found.id;
            }

            const { error } = await supabase
                .from('game_events')
                .update({
                    type: updates.type,
                    title: updates.title,
                    opponent: updates.opponent,
                    event_date: updates.date,
                    event_time: updates.time,
                    location: updates.location,
                    updated_at: new Date().toISOString()
                })
                .eq('id', realId);

            if (error) throw error;
        },

        delete: async (id: number | string): Promise<void> => {
            let realId = id;
            if (typeof id === 'number') {
                const { data: events } = await supabase.from('game_events').select('id').limit(100);
                const found = events?.find(e => parseInt(e.id.replace(/-/g, '').slice(0, 10), 16) === id);
                if (!found) return;
                realId = found.id;
            }

            const { error } = await supabase
                .from('game_events')
                .delete()
                .eq('id', realId);

            if (error) throw error;
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
    },
    scouts: {
        async save(eventId: string, stats: any, totalScore: number) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user");

            const { data: existing } = await supabase
                .from('match_scouts')
                .select('id')
                .eq('event_id', eventId)
                .eq('player_id', user.id)
                .single();

            if (existing) {
                return await supabase
                    .from('match_scouts')
                    .update({
                        stats,
                        total_score: totalScore,
                        status: 'pending',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
            } else {
                return await supabase
                    .from('match_scouts')
                    .insert({
                        event_id: eventId,
                        player_id: user.id,
                        stats,
                        total_score: totalScore,
                        status: 'pending'
                    });
            }
        },

        async getMyScout(eventId: string) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data } = await supabase
                .from('match_scouts')
                .select('*, match_scout_validations(validator_id, action)')
                .eq('event_id', eventId)
                .eq('player_id', user.id)
                .single();
            return data;
        },

        async listByEvent(eventId: string) {
            const { data } = await supabase
                .from('match_scouts')
                .select('*, profiles:player_id(name, avatar, is_pro), match_scout_validations(validator_id, action, contest_data)')
                .eq('event_id', eventId)
                .order('total_score', { ascending: false });
            return data || [];
        },

        async validate(scoutId: string, action: 'approve' | 'contest', contestData?: any, totalScore?: number) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user");

            // Handle Context/Change logic
            if (action === 'contest' && contestData) {
                // If we are changing values (contesting with data), we update the main record
                // and reset the status to pending, effectively restarting the process.
                // We also need to clear previous approvals because the data changed.

                // 1. Update stats and status
                await supabase
                    .from('match_scouts')
                    .update({
                        stats: contestData,
                        total_score: totalScore !== undefined ? totalScore : 0, // Recalculated total
                        status: 'pending',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', scoutId);

                // 2. Clear previous validations (except maybe the contestant's own action if we want to track it)
                // Actually, cleaner to just wipe validations so everyone has to re-approve the new numbers.
                await supabase
                    .from('match_scout_validations')
                    .delete()
                    .eq('scout_id', scoutId);

                // 3. Add the contestation record for history/logging (optional, but good for tracking)
                return await supabase.from('match_scout_validations').upsert({
                    scout_id: scoutId,
                    validator_id: user.id,
                    action: 'contest',
                    contest_data: contestData
                }, { onConflict: 'scout_id, validator_id' });

            } else {
                // Normal Approval Logic
                const { error } = await supabase.from('match_scout_validations').upsert({
                    scout_id: scoutId,
                    validator_id: user.id,
                    action,
                    contest_data: contestData
                }, { onConflict: 'scout_id, validator_id' });

                if (error) throw error;

                // Check if we hit 5 approvals
                if (action === 'approve') {
                    const { count } = await supabase
                        .from('match_scout_validations')
                        .select('*', { count: 'exact', head: true })
                        .eq('scout_id', scoutId)
                        .eq('action', 'approve');

                    if ((count || 0) >= 2) { // MVP: Reduced to 2 for easier testing, ideally 5
                        await supabase.from('match_scouts').update({ status: 'approved' }).eq('id', scoutId);
                    }
                }
            }
        },

        async getMyValidationCount(eventId: string) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return 0;

            // Get all scouts for this event NOT belonging to me, to see how many I validated
            const { data: scouts } = await supabase
                .from('match_scouts')
                .select('id')
                .eq('event_id', eventId)
                .neq('player_id', user.id);

            if (!scouts || scouts.length === 0) return 0;
            const ids = scouts.map(s => s.id);

            const { count } = await supabase
                .from('match_scout_validations')
                .select('*', { count: 'exact', head: true })
                .in('scout_id', ids)
                .eq('validator_id', user.id);

            return { myCount: count || 0, totalToValidate: ids.length };
        },
        async getAnalytics() {
            const { data } = await supabase
                .from('match_scouts')
                .select('stats, status, profiles:player_id (id, name, position), game_events:event_id (date, type)')
                .eq('status', 'approved')
                .order('created_at', { ascending: true });
            return data || [];
        },

        async history() {
            return [];
        }
    },

    rules: {
        list: async () => {
            const teamId = await getCurrentTeamId();
            if (!teamId) return [];

            const { data, error } = await supabase
                .from('team_rules')
                .select(`
                    id,
                    title,
                    description,
                    file_url,
                    file_type,
                    created_at,
                    profiles:created_by (name, avatar)
                `)
                .eq('team_id', teamId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching rules:', error);
                return [];
            }

            return data;
        },

        create: async (title: string, description: string, file: File, type: 'pdf' | 'image') => {
            const teamId = await getCurrentTeamId();
            if (!teamId) throw new Error('User has no team');

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user logged in');

            // 1. Upload file
            const fileExt = file.name.split('.').pop();
            const fileName = `${teamId}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('team-rules')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('team-rules')
                .getPublicUrl(fileName);

            // 3. Save to DB
            const { data, error } = await supabase
                .from('team_rules')
                .insert({
                    team_id: teamId,
                    title,
                    description,
                    file_url: publicUrl,
                    file_type: type,
                    created_by: user.id
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },

        delete: async (id: string, fileUrl: string) => {
            // Extract path from URL roughly
            const parts = fileUrl.split('team-rules/');
            if (parts.length > 1) {
                await supabase.storage.from('team-rules').remove([parts[1]]);
            }

            const { error } = await supabase
                .from('team_rules')
                .delete()
                .eq('id', id);

            if (error) throw error;
        }
    },

    promotions: {
        async request(role: string) {
            const teamId = await getCurrentTeamId();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !teamId) throw new Error('Dados incompletos');

            const { data, error } = await supabase
                .from('promotion_requests')
                .insert({
                    user_id: user.id,
                    team_id: teamId,
                    requested_role: role,
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },

        async listPending() {
            const teamId = await getCurrentTeamId();
            if (!teamId) return [];

            const { data, error } = await supabase
                .from('promotion_requests')
                .select(`
                    *,
                    profiles:user_id (name, avatar, role)
                `)
                .eq('team_id', teamId)
                .eq('status', 'pending');

            if (error) throw error;
            return data;
        },

        async getOwnRequest() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await supabase
                .from('promotion_requests')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'pending')
                .maybeSingle();

            if (error) return null;
            return data;
        },

        async respond(requestId: string, status: 'approved' | 'rejected') {
            const { error } = await supabase
                .from('promotion_requests')
                .update({ status })
                .eq('id', requestId);

            if (error) throw error;
        }
    },

    notifications: {
        sendToTeam: async (teamId: string, title: string, message: string, data: any = {}) => {
            const { data: members, error: membersError } = await supabase
                .from('profiles')
                .select('id')
                .eq('team_id', teamId)
                .eq('is_approved', true);

            if (membersError || !members) {
                console.error('Error fetching team members for notification:', membersError);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            const notifications = members
                .filter(m => m.id !== user?.id) // Don't notify the sender
                .map(m => ({
                    user_id: m.id,
                    type: 'general_alert',
                    title,
                    message,
                    data,
                    status: 'pending'
                }));

            if (notifications.length > 0) {
                const { error: notifyError } = await supabase
                    .from('notifications')
                    .insert(notifications);

                if (notifyError) {
                    console.error('Error sending team notifications:', notifyError);
                }
            }
        }
    }
};
