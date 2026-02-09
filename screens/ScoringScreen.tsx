import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { dataService, LegacyGameEvent } from '../services/dataService';
import { supabase } from '../services/supabase';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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


const PRO_TEAMS = [
    { id: 'fla', name: 'Flamengo', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Clube_de_Regatas_do_Flamengo_logo.svg' },
    { id: 'pal', name: 'Palmeiras', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/10/Palmeiras_logo.svg' },
    { id: 'bot', name: 'Botafogo', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Botafogo_de_Futebol_e_Regatas_logo.svg' },
    { id: 'cam', name: 'Atlético-MG', logo: 'https://cdn.worldvectorlogo.com/logos/atletico-mineiro-mg-1.svg' },
    { id: 'gre', name: 'Grêmio', logo: 'https://cdn.worldvectorlogo.com/logos/gremio.svg' },
    { id: 'bah', name: 'Bahia', logo: 'https://logodownload.org/wp-content/uploads/2017/02/bahia-ec-logo-02.png' },
    { id: 'sp', name: 'São Paulo', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Brasao_do_Sao_Paulo_Futebol_Clube.svg' },
    { id: 'flu', name: 'Fluminense', logo: 'https://cdn.worldvectorlogo.com/logos/fluminense-rj.svg' },
    { id: 'int', name: 'Internacional', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Escudo_do_Sport_Club_Internacional.svg' },
    { id: 'cor', name: 'Corinthians', logo: 'https://cdn.worldvectorlogo.com/logos/corinthians-paulista-1.svg' },
    { id: 'vas', name: 'Vasco', logo: 'https://cdn.worldvectorlogo.com/logos/vasco-da-gama-rj.svg' },
    { id: 'san', name: 'Santos', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Santos_Logo.png' },
    { id: 'others', name: 'Outro', logo: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png' }
];

interface Participant {
    id: string;
    name: string;
    avatar: string;
}

const ScoringScreen = () => {
    const navigate = useNavigate();
    const { userId: currentUserId } = useUser();

    const [loading, setLoading] = useState(true);
    const [lastGame, setLastGame] = useState<LegacyGameEvent | null>(null);
    const [nextGame, setNextGame] = useState<LegacyGameEvent | null>(null);
    const [canVote, setCanVote] = useState(false);
    const [isVoteOpen, setIsVoteOpen] = useState(false);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [userRatings, setUserRatings] = useState<Record<string, number>>({});
    const [savingStatus, setSavingStatus] = useState<Record<string, 'saved' | 'saving' | 'error' | null>>({});
    const [stats, setStats] = useState({ lastGameScore: 0, annualAverage: 0, matchesCount: 0 });
    const [showChart, setShowChart] = useState(false);
    const [filterPosition, setFilterPosition] = useState<'ALL' | 'ATA' | 'MEI' | 'ZAG' | 'GOL'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSavingAll, setIsSavingAll] = useState(false);
    const [hasVotedForAll, setHasVotedForAll] = useState(false);
    const [showUnlockTooltip, setShowUnlockTooltip] = useState(false);
    const [filterHeartTeam, setFilterHeartTeam] = useState<string | null>(null);
    const [showHeartTeamFilter, setShowHeartTeamFilter] = useState(false);
    // Extended sort type to handle toggles
    type SortType = 'NAME_ASC' | 'NAME_DESC' | 'RATING_DESC' | 'RATING_ASC' | 'POSITION_ASC' | 'POSITION_DESC';
    const [sortBy, setSortBy] = useState<SortType>('NAME_ASC');
    const [showSortFilter, setShowSortFilter] = useState(false);

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

            // Check if voting window is open (until 3 hours before next game)
            let deadline = new Date();
            if (next) {
                deadline = new Date(next.date + 'T' + next.time);
                // Subtrai 3 horas da hora de início do próximo jogo
                deadline.setHours(deadline.getHours() - 3);
            } else {
                // Se não houver próximo jogo agendado, mantém aberto por um longo período (ex: 1 ano)
                deadline.setFullYear(deadline.getFullYear() + 1);
            }
            setIsVoteOpen(now < deadline);

            if (last) {
                // Check if I participated
                const lastGameWithStatus = events.find(e => e.id === last.id);
                const didParticipate = lastGameWithStatus?.myStatus === 'confirmed';
                setCanVote(didParticipate);

                if (didParticipate) {
                    // Load participants
                    const { data: parts } = await supabase
                        .from('event_participants')
                        .select('user_id, status, profiles(name, avatar, position, heart_team)')
                        .eq('event_id', last.id)
                        .eq('status', 'confirmed');

                    if (parts) {
                        // Load ALL ratings to calculate current averages
                        const ratings = await dataService.scoring.getMatchRatings(String(last.id));

                        const ratingMap: Record<string, number> = {};
                        const voteCounts: Record<string, number> = {};

                        ratings.forEach(r => {
                            if (!voteCounts[r.playerId]) voteCounts[r.playerId] = 0;
                            if (!ratingMap[r.playerId]) ratingMap[r.playerId] = 0;

                            voteCounts[r.playerId]++;
                            ratingMap[r.playerId] += r.rating;
                        });

                        const formattedParts = parts.map((p: any) => ({
                            id: p.user_id,
                            name: p.profiles?.name || 'Desconhecido',
                            avatar: p.profiles?.avatar || 'https://via.placeholder.com/150',
                            position: p.profiles?.position || 'MEA',
                            heartTeamId: p.profiles?.heart_team,
                            averageRating: voteCounts[p.user_id] ? (ratingMap[p.user_id] / voteCounts[p.user_id]) : null
                        }));
                        setParticipants(formattedParts);

                        // Load my existing votes
                        // Load my existing votes (using already fetched ratings)
                        const myVotes: Record<string, number> = {};
                        ratings.forEach(r => {
                            if (r.voterId === currentUserId) {
                                myVotes[r.playerId] = r.rating;
                            }
                        });
                        setUserRatings(myVotes);

                        // Check completion (exclude self)
                        const others = formattedParts.filter((p: any) => p.id !== currentUserId);
                        const votedCount = others.reduce((acc: number, p: any) => acc + (myVotes[p.id] ? 1 : 0), 0);
                        setHasVotedForAll(votedCount === others.length);
                    }
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

    const handleBulkSave = async () => {
        if (!lastGame) return;
        setIsSavingAll(true);
        try {
            // Prepare ratings array
            const ratingsArray = Object.entries(userRatings).map(([playerId, rating]) => ({
                playerId,
                rating
            }));

            if (ratingsArray.length === 0) {
                alert("Nenhuma nota para salvar.");
                return;
            }

            // @ts-ignore - added via dynamic service
            await dataService.scoring.submitRatingsBulk(String(lastGame.id), ratingsArray);

            // Reload to update averages
            await loadData();

            // Feedback for UI
            const successToast = document.createElement('div');
            successToast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-primary text-background-dark px-6 py-3 rounded-full font-bold shadow-2xl animate-in fade-in slide-in-from-bottom-4 z-[999]';
            successToast.innerText = '✅ Notas salvas com sucesso!';
            document.body.appendChild(successToast);
            setTimeout(() => {
                successToast.classList.add('fade-out');
                setTimeout(() => successToast.remove(), 500);
            }, 3000);

        } catch (error: any) {
            console.error("Error bulk saving ratings", error);
            const errorMsg = error.message || "Erro ao salvar notas. Tente novamente.";
            alert(errorMsg);
        } finally {
            setIsSavingAll(false);
        }
    };

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

        setUserRatings(prev => {
            const nextState = { ...prev, [playerId]: numVal };

            // Check completion immediately for UI feedback
            const others = participants.filter(p => p.id !== currentUserId);
            const votedCount = others.reduce((acc, p) => {
                const val = p.id === playerId ? numVal : nextState[p.id];
                return acc + (val !== undefined ? 1 : 0);
            }, 0);
            setHasVotedForAll(votedCount === others.length);

            return nextState;
        });

        // Option: we can keep debounced save OR remove it. 
        // Given user asked for a button, making it explicit might be better.
        // I'll keep it for "safety" but the button is the main UI element now.
        debouncedSave(playerId, numVal);
    };

    const formatDate = (dateStr: string) => {
        // Appending T12:00:00 to ensure we don't fall back to previous day due to timezone
        // when parsing pure YYYY-MM-DD strings
        return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    };

    return (
        <div className="bg-background-dark min-h-screen pb-32 relative">
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
                            <div
                                className="flex flex-col items-center gap-1 relative cursor-help"
                                onClick={() => !hasVotedForAll && setShowUnlockTooltip(true)}
                            >
                                {showUnlockTooltip && !hasVotedForAll && (
                                    <div className="absolute bottom-full mb-2 w-48 bg-black/90 text-white text-[10px] p-2 rounded-lg text-center animate-in zoom-in z-50">
                                        Vote em todos os amigos para liberar a visualização do seu scoring
                                        <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 size-2 border-4 border-transparent border-t-black/90"></div>
                                    </div>
                                )}

                                <span className={`text-4xl font-black text-white ${!hasVotedForAll ? 'blur-md select-none opacity-50' : ''}`}>
                                    {hasVotedForAll ? stats.lastGameScore.toFixed(1) : '?.?'}
                                </span>
                                <span className="text-xs font-bold text-yellow-500 uppercase tracking-tight">
                                    {hasVotedForAll ? 'Último Jogo' : 'Completar Votação'}
                                </span>
                            </div>
                            <div className="flex flex-col items-center gap-1 border-l border-white/5">
                                <span className="text-4xl font-black text-white">{stats.annualAverage.toFixed(1)}</span>
                                <span className="text-xs font-bold text-primary uppercase tracking-tight">Média Anual</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowChart(true)}
                            className="mt-6 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <span className="material-symbols-outlined text-purple-400">show_chart</span>
                            <span className="text-xs font-bold text-white uppercase">Ver Evolução</span>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="w-full max-w-md mt-6">
                    <input
                        type="text"
                        placeholder="Buscar jogador..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-surface-dark border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 text-sm mb-4"
                    />

                    <div className="flex items-center gap-2">
                        <div className="flex bg-surface-dark p-1 rounded-xl">
                            {['ALL', 'ATA', 'MEI', 'ZAG', 'GOL'].map(pos => (
                                <button
                                    key={pos}
                                    onClick={() => setFilterPosition(pos as any)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterPosition === pos
                                        ? 'bg-primary text-black shadow-lg shadow-primary/20'
                                        : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    {pos === 'ALL' ? 'Todos' : pos}
                                </button>
                            ))}
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setShowHeartTeamFilter(!showHeartTeamFilter)}
                                className={`h-10 w-10 rounded-xl flex items-center justify-center border transition-all ${filterHeartTeam
                                    ? 'bg-primary text-black border-primary shadow-lg shadow-primary/20'
                                    : 'bg-surface-dark text-slate-400 border-white/10 hover:border-white/30'
                                    }`}
                            >
                                {filterHeartTeam ? (
                                    <img
                                        src={PRO_TEAMS.find(t => t.id === filterHeartTeam)?.logo}
                                        className="w-6 h-6 object-contain"
                                        alt="Team"
                                    />
                                ) : (
                                    <span className="material-symbols-outlined text-[20px]">security</span>
                                )}
                            </button>

                            {/* Heart Team Popover */}
                            {showHeartTeamFilter && (
                                <div className="absolute right-0 top-12 z-50 bg-surface-dark border border-white/10 rounded-2xl p-3 shadow-2xl w-[280px] max-w-[calc(100vw-32px)] flex flex-wrap gap-2 justify-center animate-in fade-in zoom-in duration-200">
                                    <button
                                        onClick={() => { setFilterHeartTeam(null); setShowHeartTeamFilter(false); }}
                                        className={`w-full text-[10px] font-black uppercase tracking-widest py-2.5 mb-1 rounded-xl border-2 border-dashed transition-all ${!filterHeartTeam ? 'border-primary text-primary bg-primary/5' : 'border-white/5 text-slate-500 hover:border-white/20 hover:text-slate-300'}`}
                                    >
                                        Todos os times
                                    </button>
                                    <div className="flex flex-wrap gap-2 justify-center max-h-[220px] overflow-y-auto p-1 custom-scrollbar">
                                        {Array.from(new Set(participants.map((p: any) => p.heartTeamId).filter(Boolean))).map((tid: any) => {
                                            const team = PRO_TEAMS.find(t => t.id === tid);
                                            if (!team) return null;
                                            return (
                                                <button
                                                    key={tid}
                                                    onClick={() => { setFilterHeartTeam(tid); setShowHeartTeamFilter(false); }}
                                                    className={`size-12 rounded-xl flex items-center justify-center transition-all border ${filterHeartTeam === tid ? 'bg-primary/10 border-primary' : 'bg-white/5 border-transparent hover:border-white/10 hover:bg-white/10'}`}
                                                    title={team.name}
                                                >
                                                    <img src={team.logo} className="w-8 h-8 object-contain" alt={team.name} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sort Filter */}
                        <div className="relative">
                            <button
                                onClick={() => setShowSortFilter(!showSortFilter)}
                                className={`h-10 w-10 rounded-xl flex items-center justify-center border transition-all ${sortBy !== 'NAME_ASC'
                                    ? 'bg-primary text-black border-primary shadow-lg shadow-primary/20'
                                    : 'bg-surface-dark text-slate-400 border-white/10 hover:border-white/30'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[20px]">sort</span>
                            </button>

                            {showSortFilter && (
                                <div className="absolute right-0 top-12 z-50 bg-surface-dark border border-white/10 rounded-xl p-2 shadow-xl w-48 flex flex-col gap-1 animate-in mb-32">
                                    <button onClick={() => { setSortBy(sortBy === 'NAME_ASC' ? 'NAME_DESC' : 'NAME_ASC'); setShowSortFilter(false); }} className={`text-left px-3 py-2 rounded-lg text-xs font-bold hover:bg-white/5 ${(sortBy === 'NAME_ASC' || sortBy === 'NAME_DESC') ? 'text-primary' : 'text-slate-400'}`}>
                                        Nome {(sortBy === 'NAME_DESC') && '(Z-A)'}
                                    </button>
                                    <button onClick={() => { setSortBy(sortBy === 'RATING_DESC' ? 'RATING_ASC' : 'RATING_DESC'); setShowSortFilter(false); }} className={`text-left px-3 py-2 rounded-lg text-xs font-bold hover:bg-white/5 ${(sortBy === 'RATING_DESC' || sortBy === 'RATING_ASC') ? 'text-primary' : 'text-slate-400'}`}>
                                        Nota {(sortBy === 'RATING_ASC') && '(Menor)'}
                                    </button>
                                    <button onClick={() => { setSortBy(sortBy === 'POSITION_ASC' ? 'POSITION_DESC' : 'POSITION_ASC'); setShowSortFilter(false); }} className={`text-left px-3 py-2 rounded-lg text-xs font-bold hover:bg-white/5 ${(sortBy === 'POSITION_ASC' || sortBy === 'POSITION_DESC') ? 'text-primary' : 'text-slate-400'}`}>
                                        Posição {(sortBy === 'POSITION_DESC') && '(Inv)'}
                                    </button>
                                </div>
                            )}
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
                                <p className="text-blue-200 text-sm">A votação foi encerrada. O prazo limite é de até 3 horas antes do início da próxima partida.</p>
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
                                    {participants
                                        .filter(p => {
                                            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
                                            const matchesPos = filterPosition === 'ALL' || (p as any).position === filterPosition;
                                            const matchesHeart = !filterHeartTeam || (p as any).heartTeamId === filterHeartTeam;
                                            return matchesSearch && matchesPos && matchesHeart;
                                        })
                                        .sort((a, b) => {
                                            if (sortBy === 'NAME_ASC') return a.name.localeCompare(b.name);
                                            if (sortBy === 'NAME_DESC') return b.name.localeCompare(a.name);
                                            if (sortBy === 'RATING_DESC') return ((b as any).averageRating || 0) - ((a as any).averageRating || 0);
                                            if (sortBy === 'RATING_ASC') return ((a as any).averageRating || 0) - ((b as any).averageRating || 0);

                                            // Handling position sorts
                                            const order = { 'GOL': 1, 'ZAG': 2, 'LAT': 3, 'MEI': 4, 'ATA': 5 }; // Extended positions just in case
                                            const posA = (a as any).position || 'MEA';
                                            const posB = (b as any).position || 'MEA';
                                            const rankA = order[posA as keyof typeof order] || 99;
                                            const rankB = order[posB as keyof typeof order] || 99;

                                            if (sortBy === 'POSITION_ASC') return rankA - rankB;
                                            if (sortBy === 'POSITION_DESC') return rankB - rankA;

                                            return 0;
                                        })
                                        .map(player => (
                                            <div key={player.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="size-10 rounded-full border border-white/10 overflow-hidden shrink-0">
                                                        <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex flex-col truncate">
                                                        <span className="text-white font-bold text-sm truncate">{player.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-slate-500 font-bold uppercase">{(player as any).position || 'MEA'}</span>
                                                            {/* Heart Team Icon Small */}
                                                            {(player as any).heartTeamId && (
                                                                <img
                                                                    src={PRO_TEAMS.find(t => t.id === (player as any).heartTeamId)?.logo}
                                                                    className="w-3.5 h-3.5 object-contain opacity-70"
                                                                    alt="Team"
                                                                />
                                                            )}
                                                            {player.id === currentUserId && (
                                                                <span className="text-[10px] text-primary uppercase font-bold tracking-wider">• Você</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Current Average Rating - Center Right */}
                                                <div className="flex flex-col items-center justify-center w-14 mx-2">
                                                    <span className={`text-base font-black ${(player as any).averageRating ? 'text-white' : 'text-slate-700'}`}>
                                                        {(player as any).averageRating ? (player as any).averageRating.toFixed(1) : '-'}
                                                    </span>
                                                    <span className="text-[8px] text-slate-600 uppercase tracking-tighter font-bold">Média</span>
                                                </div>

                                                {/* Vote Input */}
                                                <div className="w-24 flex justify-end items-center gap-2 shrink-0">
                                                    {player.id === currentUserId ? (
                                                        <span className="text-[10px] font-bold text-red-500/80 uppercase tracking-wider bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                                                            Não vota
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    inputMode="decimal"
                                                                    step="0.1"
                                                                    min="0"
                                                                    max="10"
                                                                    disabled={!isVoteOpen}
                                                                    value={userRatings[player.id] !== undefined ? userRatings[player.id] : ''}
                                                                    onChange={(e) => handleRatingChange(player.id, e.target.value)}
                                                                    placeholder="-"
                                                                    className={`w-16 bg-background-dark border border-white/10 rounded-xl py-2 px-1 text-center font-black text-lg text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all placeholder:text-slate-700 ${!isVoteOpen && 'opacity-50 cursor-not-allowed'}`}
                                                                />
                                                            </div>
                                                            <div className="size-4 flex items-center justify-center">
                                                                {savingStatus[player.id] === 'saving' && (
                                                                    <div className="size-3 rounded-full border-2 border-slate-500 border-t-white animate-spin"></div>
                                                                )}
                                                                {savingStatus[player.id] === 'saved' && (
                                                                    <span className="material-symbols-outlined text-primary text-sm animate-in zoom-in">check</span>
                                                                )}
                                                                {savingStatus[player.id] === 'error' && (
                                                                    <span className="material-symbols-outlined text-red-500 text-sm">error</span>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                                <div className="pt-4 pb-8 flex flex-col items-center gap-4">
                                    <button
                                        onClick={handleBulkSave}
                                        disabled={isSavingAll || Object.keys(userRatings).length === 0}
                                        className={`w-full max-w-xs h-14 rounded-2xl bg-primary text-background-dark font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(19,236,91,0.2)] active:scale-95 transition-all ${isSavingAll ? 'opacity-50' : ''}`}
                                    >
                                        {isSavingAll ? (
                                            <div className="size-5 border-3 border-background-dark/30 border-t-background-dark rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined">save</span>
                                                Salvar Notas
                                            </>
                                        )}
                                    </button>
                                    <p className="text-center text-xs text-slate-500 px-8">
                                        As notas também são salvas conforme você digita. Clique em salvar para confirmar todas as avaliações.
                                    </p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Chart Modal */}
            {showChart && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-surface-dark border border-white/10 rounded-3xl w-full max-w-lg p-6 relative">
                        <button
                            onClick={() => setShowChart(false)}
                            className="absolute top-4 right-4 size-8 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <h3 className="text-white font-black italic uppercase text-lg mb-6">Evolução</h3>

                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={[
                                    // Mock data for now, ideally fetch history
                                    { game: '1', score: 6.5 },
                                    { game: '2', score: 7.0 },
                                    { game: '3', score: 6.8 },
                                    { game: '4', score: 7.5 },
                                    { game: '5', score: stats.lastGameScore || 7.2 }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                    <XAxis dataKey="game" stroke="#ffffff50" tick={{ fontSize: 10 }} />
                                    <YAxis domain={[0, 10]} stroke="#ffffff50" tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="score"
                                        stroke="#13ec5b"
                                        strokeWidth={3}
                                        dot={{ fill: '#13ec5b', strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: '#fff' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScoringScreen;
