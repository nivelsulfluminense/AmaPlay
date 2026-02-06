import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { dataService, LegacyGameEvent } from '../services/dataService';
import { supabase } from '../services/supabase';

// Simple debounce implementation
function useDebounce<T extends (...args: any[]) => void>(func: T, wait: number) {
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    return useCallback((...args: Parameters<T>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            func(...args);
        }, wait);
    }, [func, wait]);
}

interface Participant {
    id: string;
    name: string;
    avatar: string;
}

const ScoringScreen = () => {
    const navigate = useNavigate();
    const { id: currentUserId } = useUser();

    const [loading, setLoading] = useState(true);
    const [lastGame, setLastGame] = useState<LegacyGameEvent | null>(null);
    const [nextGame, setNextGame] = useState<LegacyGameEvent | null>(null);
    const [canVote, setCanVote] = useState(false);
    const [isVoteOpen, setIsVoteOpen] = useState(false);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [userRatings, setUserRatings] = useState<Record<string, number>>({});
    const [savingStatus, setSavingStatus] = useState<Record<string, 'saved' | 'saving' | 'error' | null>>({});
    const [stats, setStats] = useState({ lastGameScore: 0, annualAverage: 0, matchesCount: 0 });

    useEffect(() => {
        loadData();
    }, [currentUserId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const events = await dataService.events.list();
            const now = new Date();

            const games = events
                .filter(e => e.type === 'game' || e.type === 'match')
                .sort((a, b) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime());

            // Games that have already happened (or started at least)
            const passedGames = games.filter(e => new Date(e.date + 'T' + e.time) <= now);
            const futureGames = games.filter(e => new Date(e.date + 'T' + e.time) > now);

            // Last game is the most recent past game (first in desc list)
            const last = passedGames.length > 0 ? passedGames[0] : null;

            // Nearest next game is the first in asc list (last in desc list if we reverse)
            // Or just sort futureGames ASC
            const futureGamesAsc = [...futureGames].sort((a, b) => new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime());
            const next = futureGamesAsc.length > 0 ? futureGamesAsc[0] : null;

            setLastGame(last);
            setNextGame(next);

            // Check if voting window is open (now < nextGame.date) or always open if no next game
            const isOpen = next ? now < new Date(next.date + 'T' + next.time) : true;
            setIsVoteOpen(isOpen);

            if (last) {
                // Check if I participated
                const lastGameWithStatus = events.find(e => e.id === last.id);
                const didParticipate = lastGameWithStatus?.myStatus === 'confirmed';
                setCanVote(didParticipate);

                if (didParticipate) {
                    // Load participants
                    const { data: parts } = await supabase
                        .from('event_participants')
                        .select('user_id, status, profiles(name, avatar)')
                        .eq('event_id', last.id)
                        .eq('status', 'confirmed');

                    if (parts) {
                        const formattedParts = parts.map((p: any) => ({
                            id: p.user_id,
                            name: p.profiles?.name || 'Desconhecido',
                            avatar: p.profiles?.avatar || 'https://via.placeholder.com/150'
                        }));
                        setParticipants(formattedParts);
                    }

                    // Load my existing votes
                    const ratings = await dataService.scoring.getMatchRatings(String(last.id));
                    const myVotes: Record<string, number> = {};
                    ratings.forEach(r => {
                        if (r.voterId === currentUserId) {
                            myVotes[r.playerId] = r.rating;
                        }
                    });
                    setUserRatings(myVotes);
                }

                // Load my stats
                const myStats = await dataService.scoring.getMyStats();
                setStats(myStats);
            }
        } catch (e) {
            console.error("Error loading data", e);
        } finally {
            setLoading(false);
        }
    };

    const saveRating = async (playerId: string, rating: number) => {
        if (!lastGame) return;
        setSavingStatus(prev => ({ ...prev, [playerId]: 'saving' }));
        try {
            await dataService.scoring.submitRating(String(lastGame.id), playerId, rating);
            setSavingStatus(prev => ({ ...prev, [playerId]: 'saved' }));
            setTimeout(() => {
                setSavingStatus(prev => ({ ...prev, [playerId]: null }));
            }, 2000);
        } catch (error) {
            console.error(error);
            setSavingStatus(prev => ({ ...prev, [playerId]: 'error' }));
        }
    };

    // Debounce the save function
    const debouncedSave = useDebounce((playerId: string, rating: number) => saveRating(playerId, rating), 1000);

    const handleRatingChange = (playerId: string, value: string) => {
        // Allow empty string to clear
        if (value === '') {
            const newRatings = { ...userRatings };
            delete newRatings[playerId];
            setUserRatings(newRatings);
            return;
        }

        let numVal = parseFloat(value);
        if (isNaN(numVal)) return;
        if (numVal < 0) numVal = 0;
        if (numVal > 10) numVal = 10;

        // Limit to 1 decimal place logic is often handled on blur or rendering, 
        // but for input control let's allow typing then clamp.
        // Actually, just update state directly for smooth typing.

        setUserRatings(prev => ({ ...prev, [playerId]: numVal }));
        debouncedSave(playerId, numVal);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    };

    return (
        <div className="bg-background-dark min-h-screen pb-10 relative">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-background-dark/95 backdrop-blur-sm border-b border-white/5 p-4 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="size-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-white">arrow_back</span>
                </button>
                <div className="flex-1">
                    <h2 className="text-white font-black italic uppercase text-lg leading-none">Scoring</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Avaliação Pós-Jogo</p>
                </div>
            </div>

            <div className="p-4 space-y-6">

                {/* My Stats Card - Top/Center */}
                <div className="bg-surface-dark border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
                    <div className="absolute -right-10 -top-10 size-40 bg-yellow-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute -left-10 -bottom-10 size-40 bg-primary/10 rounded-full blur-3xl"></div>

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 border border-white/5">
                            Meu Desempenho
                        </span>

                        <div className="grid grid-cols-2 gap-8 w-full max-w-xs">
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-4xl font-black text-white">{stats.lastGameScore.toFixed(1)}</span>
                                <span className="text-xs font-bold text-yellow-500 uppercase tracking-tight">Último Jogo</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 border-l border-white/5">
                                <span className="text-4xl font-black text-white">{stats.annualAverage.toFixed(1)}</span>
                                <span className="text-xs font-bold text-primary uppercase tracking-tight">Média Anual</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                {!loading && (
                    <>
                        {!lastGame ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center opacity-50">
                                <span className="material-symbols-outlined text-4xl mb-2">sports_soccer</span>
                                <p>Nenhum jogo realizado ainda.</p>
                            </div>
                        ) : !canVote ? (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
                                <span className="material-symbols-outlined text-red-500 text-3xl mb-2">block</span>
                                <h3 className="text-white font-bold mb-1">Você não participou</h3>
                                <p className="text-red-200 text-sm">O quadro de votação é exclusivo para os atletas relacionados no último jogo.</p>
                            </div>
                        ) : !isVoteOpen ? (
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 text-center">
                                <span className="material-symbols-outlined text-blue-500 text-3xl mb-2">lock</span>
                                <h3 className="text-white font-bold mb-1">Votação Encerrada</h3>
                                <p className="text-blue-200 text-sm">A votação para este jogo já foi encerrada pois um novo jogo já está agendado.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-white font-bold uppercase italic text-sm">Atletas Relacionados</h3>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                                        {formatDate(lastGame.date)} {lastGame.opponent ? `vs ${lastGame.opponent}` : ''}
                                    </span>
                                </div>

                                <div className="bg-surface-dark border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5">
                                    {participants.map(player => (
                                        <div key={player.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-full border border-white/10 overflow-hidden">
                                                    <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-white font-bold text-sm">{player.name}</span>
                                                    {player.id === currentUserId && (
                                                        <span className="text-[10px] text-primary uppercase font-bold tracking-wider">Você</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        inputMode="decimal"
                                                        step="0.1"
                                                        min="0"
                                                        max="10"
                                                        value={userRatings[player.id] !== undefined ? userRatings[player.id] : ''}
                                                        onChange={(e) => handleRatingChange(player.id, e.target.value)}
                                                        placeholder="-"
                                                        className="w-16 bg-background-dark border border-white/10 rounded-xl py-2 px-1 text-center font-black text-lg text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all placeholder:text-slate-600"
                                                    />
                                                </div>
                                                <div className="size-6 flex items-center justify-center">
                                                    {savingStatus[player.id] === 'saving' && (
                                                        <div className="size-4 rounded-full border-2 border-slate-500 border-t-white animate-spin"></div>
                                                    )}
                                                    {savingStatus[player.id] === 'saved' && (
                                                        <span className="material-symbols-outlined text-primary text-lg animate-in zoom-in">check</span>
                                                    )}
                                                    {savingStatus[player.id] === 'error' && (
                                                        <span className="material-symbols-outlined text-red-500 text-lg">error</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-center text-xs text-slate-500 mt-4 px-8">
                                    As notas são salvas automaticamente. A média final será calculada com base na nota de todos os participantes.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ScoringScreen;
