import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, Role } from '../contexts/UserContext';
import { dataService, Player } from '../services/dataService';
import { Profile } from '../services/supabase';
import PlayerCard from '../components/PlayerCard';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

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

const SCOUT_RULES_STATS = [
    { id: 'gol', label: 'Gol', points: 8.0 },
    { id: 'assist', label: 'Assistência', points: 5.0 },
    { id: 'finalizacao_defendida', label: 'Fin. Defendida', points: 1.2 },
    { id: 'penalti_sofrido', label: 'Pên. Sofrido', points: 1.0 },
    { id: 'penalti_perdido_fora', label: 'Pên. Fora', points: -3.2 },
    { id: 'penalti_perdido_defesa', label: 'Pên. Defendido', points: -2.8 },
    { id: 'penalti_perdido_trave', label: 'Pên. Trave', points: -1.0 },
    { id: 'defesa_penalti', label: 'Def. Pênalti', points: 7.0 },
    { id: 'gol_contra', label: 'Gol Contra', points: -3.0 },
    { id: 'cartao_vermelho', label: 'Vermelho', points: -3.0 },
    { id: 'cartao_amarelo', label: 'Amarelo', points: -1.0 },
    { id: 'gol_sofrido', label: 'Gol Sofrido', points: -1.0 },
    { id: 'falta_cometida', label: 'Falta', points: -0.3 },
    { id: 'penalti_cometido', label: 'Pên. Cometido', points: -1.0 },
];

const calculatePoints = (stats: any) => {
    if (!stats) return 0;
    return SCOUT_RULES_STATS.reduce((acc, rule) => {
        return acc + ((stats[rule.id] || 0) * rule.points);
    }, 0);
};

const getFlagUrl = (code?: string) => {
    if (!code) return undefined;
    return `https://flagcdn.com/w160/${code}.png`;
};

// Colors for Pie Chart
const COLORS = ['#13ec5b', '#00C49F', '#FFBB28', '#FF8042'];

const TeamStatsScreen = () => {
    const navigate = useNavigate();
    const { teamId, teamDetails, role, approveMember, rejectMember, updateMemberRole, isFirstManager } = useUser();
    const isManager = role === 'presidente' || role === 'vice-presidente' || isFirstManager;
    const [activeTab, setActiveTab] = useState<'scouts' | 'cards' | 'management' | 'charts'>('scouts');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPos, setFilterPos] = useState<string>('all');
    const [filterPro, setFilterPro] = useState(false);
    const [sortBy, setSortBy] = useState<'ovr' | 'name' | 'scout'>('ovr');
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [selectedEvolutionIds, setSelectedEvolutionIds] = useState<string[]>([]);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);


    // Async Data
    const [loading, setLoading] = useState(true);
    const [allPlayers, setAllPlayers] = useState<Player[]>([]);
    const [pendingPlayers, setPendingPlayers] = useState<Profile[]>([]);
    const [analyticsData, setAnalyticsData] = useState<any[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!teamId) return; // Wait for teamId to be available
        setLoading(true);
        try {
            const [playersData, pendingData, analytics] = await Promise.all([
                dataService.players.list(true, teamId as string),
                isManager ? dataService.team.getPendingRequests() : Promise.resolve([]),
                dataService.scouts.getAnalytics().catch(() => []) // Handle error if service not ready
            ]);
            setAllPlayers(playersData);
            setPendingPlayers(pendingData as Profile[]);
            setAnalyticsData(analytics as any[]);
        } catch (err) {
            console.error("Falha ao carregar dados do time", err);
        } finally {
            setLoading(false);
        }
    }, [teamId, isManager]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (allPlayers.length > 0 && selectedEvolutionIds.length === 0) {
            const top5 = [...allPlayers]
                .sort((a, b) => (b.maxScout || 0) - (a.maxScout || 0))
                .slice(0, 5)
                .map(p => String(p.id));
            setSelectedEvolutionIds(top5);
        }
    }, [allPlayers, selectedEvolutionIds]);

    const handleTogglePlayerEvolution = (id: string) => {
        setSelectedEvolutionIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleApprove = async (id: string) => {

        setActionLoading(id);
        const success = await approveMember(id);
        if (success) await loadData();
        setActionLoading(null);
    };

    const handleReject = async (id: string) => {
        setActionLoading(id);
        const success = await rejectMember(id);
        if (success) await loadData();
        setActionLoading(null);
    };

    const handleRoleUpdate = async (id: string, currentRole: Role, newRole: Role) => {
        setActionLoading(id);
        const success = await updateMemberRole(id, currentRole, newRole);
        if (success) await loadData();
        setActionLoading(null);
    };

    // Filter Logic
    const filteredPlayers = useMemo(() => {
        let list = [...allPlayers];

        // Remove redundant teamId filter if allPlayers is already filtered by service
        // But if allPlayers came back mixed (e.g. from a null teamId fetch), we might want it.
        // Let's keep it but make it case-insensitive and safer.
        if (teamId) {
            const tid = String(teamId).toLowerCase();
            list = list.filter(p => String(p.teamId).toLowerCase() === tid);
        }

        // Hide players without stats from Scouts/Cards tabs (incomplete profiles)
        if (activeTab === 'scouts' || activeTab === 'cards') {
            list = list.filter(p => p.stats !== null && p.stats !== undefined);
        }

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(lower));
        }

        if (filterPos !== 'all') {
            list = list.filter(p => p.position === filterPos);
        }

        if (filterPro) {
            list = list.filter(p => p.isPro === true);
        }

        list.sort((a, b) => {
            if (activeTab === 'scouts') {
                if (sortBy === 'name') return a.name.localeCompare(b.name);
                return (b.maxScout || 0) - (a.maxScout || 0);
            } else {
                if (sortBy === 'name') return a.name.localeCompare(b.name);
                if (sortBy === 'scout') return (b.maxScout || 0) - (a.maxScout || 0);
                return b.ovr - a.ovr;
            }
        });

        return list;
    }, [searchTerm, filterPos, sortBy, activeTab, teamId, allPlayers]);

    // Analytics Processing
    const chartsData = useMemo(() => {
        if (!analyticsData.length && !allPlayers.length) return null;

        // 1. Evolution Data (Date vs Total Points)
        const evolutionMap: Record<string, number> = {};
        const topScorers: Record<string, { name: string, goals: number, assists: number }> = {};

        analyticsData.forEach((scout: any) => {
            const rawDate = scout.game_events?.date;
            if (rawDate) {
                // Formatting date to DD/MM
                const dateObj = new Date(rawDate);
                const dateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
                const points = calculatePoints(scout.stats);

                evolutionMap[dateStr] = (evolutionMap[dateStr] || 0) + points;
            }

            const playerName = scout.profiles?.name || 'Unknown';
            const goals = scout.stats?.gol || 0;
            const assists = scout.stats?.assist || 0;

            if (!topScorers[playerName]) topScorers[playerName] = { name: playerName, goals: 0, assists: 0 };
            topScorers[playerName].goals += goals;
            topScorers[playerName].assists += assists;
        });

        const evolutionChart = Object.entries(evolutionMap)
            .map(([date, total]) => ({ date, total }))
            .sort((a, b) => {
                // Simple sort for DD/MM is tricky without year, but data usually comes ordered.
                // Assuming data comes ordered from backend.
                return 0;
            });

        const topPlayersChart = Object.values(topScorers)
            .sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists))
            .slice(0, 7);

        // 2. Position Distribution
        const posCounts: Record<string, number> = { 'GOL': 0, 'ZAG': 0, 'MEI': 0, 'ATA': 0 };
        allPlayers.forEach(p => {
            if (posCounts[p.position] !== undefined) posCounts[p.position]++;
        });
        const posChart = Object.entries(posCounts).map(([name, value]) => ({ name, value }));

        // 3. Heart Team Distribution
        const heartTeamMap: Record<string, number> = {};
        allPlayers.forEach(p => {
            if (p.heartTeamId) {
                heartTeamMap[p.heartTeamId] = (heartTeamMap[p.heartTeamId] || 0) + 1;
            }
        });
        const heartTeamChart = Object.entries(heartTeamMap)
            .map(([id, value]) => ({
                id,
                name: PRO_TEAMS.find(t => t.id === id)?.name || id,
                value
            }))
            .sort((a, b) => b.value - a.value);

        // 4. Individual Player Evolution
        // We want data in format: { date: 'DD/MM', 'Player Name 1': score, 'Player Name 2': score }
        const playerEvolutionMap: Record<string, any> = {};
        const activeIds = selectedEvolutionIds.length > 0
            ? selectedEvolutionIds
            : allPlayers.slice(0, 5).map(p => p.id);

        analyticsData.forEach(scout => {
            const pid = scout.profile_id;
            if (!activeIds.includes(pid)) return;

            const rawDate = scout.game_events?.date;
            if (rawDate) {
                const dateObj = new Date(rawDate);
                const dateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
                const points = calculatePoints(scout.stats);
                const playerName = scout.profiles?.name || 'Unknown';

                if (!playerEvolutionMap[dateStr]) playerEvolutionMap[dateStr] = { date: dateStr };
                playerEvolutionMap[dateStr][playerName] = (playerEvolutionMap[dateStr][playerName] || 0) + points;
            }
        });

        const playerEvolutionChart = Object.values(playerEvolutionMap).sort((a, b) => {
            // Sorting by date is still tricky, but let's assume chronological
            return 0;
        });

        return { evolutionChart, topPlayersChart, posChart, heartTeamChart, playerEvolutionChart };
    }, [analyticsData, allPlayers, selectedEvolutionIds]);


    return (
        <div className="flex flex-col h-full min-h-screen w-full bg-background-dark">
            <header className="flex flex-col sticky top-0 z-20 bg-background-dark/95 backdrop-blur-sm shadow-md">
                <div className="flex items-center p-4 justify-between">
                    <button onClick={() => navigate(-1)} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-dark shadow-sm hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined text-white">arrow_back</span>
                    </button>
                    <h2 className="text-white text-lg font-bold leading-tight">Estatísticas do Time</h2>
                    <div className="size-10"></div>
                </div>

                {/* Tabs */}
                <div className="flex px-4 border-b border-white/5 overflow-x-auto no-scrollbar">
                    <button onClick={() => { setActiveTab('scouts'); setSortBy('scout'); }} className={`flex-1 min-w-[80px] pb-3 text-xs font-bold uppercase tracking-wider transition-colors relative ${activeTab === 'scouts' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}>
                        Scouts
                        {activeTab === 'scouts' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                    <button onClick={() => { setActiveTab('cards'); setSortBy('ovr'); }} className={`flex-1 min-w-[80px] pb-3 text-xs font-bold uppercase tracking-wider transition-colors relative ${activeTab === 'cards' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}>
                        Cards
                        {activeTab === 'cards' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                    <button onClick={() => setActiveTab('charts')} className={`flex-1 min-w-[80px] pb-3 text-xs font-bold uppercase tracking-wider transition-colors relative ${activeTab === 'charts' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}>
                        Gráficos
                        {activeTab === 'charts' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                    {isManager && (
                        <button onClick={() => setActiveTab('management')} className={`flex-1 min-w-[80px] pb-3 text-xs font-bold uppercase tracking-wider transition-colors relative ${activeTab === 'management' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}>
                            Gestão
                            {activeTab === 'management' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                        </button>
                    )}
                </div>

                {/* Filters (Hidden in Management/Charts Tab) */}
                {(activeTab === 'scouts' || activeTab === 'cards') && (
                    <div className="p-4 flex flex-col gap-3">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">search</span>
                                <input
                                    type="text"
                                    placeholder="Buscar jogador..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-surface-dark border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-primary focus:ring-0"
                                />
                            </div>
                            <button
                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                className={`size-11 rounded-xl border flex items-center justify-center transition-all ${showAdvancedFilters ? 'bg-primary border-primary text-background-dark' : 'bg-surface-dark border-white/10 text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined">tune</span>
                            </button>
                        </div>

                        {/* Position Pill Filters */}
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            <button onClick={() => setFilterPos('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-colors ${filterPos === 'all' ? 'bg-primary/20 text-primary border-primary/30' : 'bg-surface-dark text-slate-400 border-white/5'}`}>Todos</button>
                            {['GOL', 'ZAG', 'MEI', 'ATA'].map(pos => (
                                <button key={pos} onClick={() => setFilterPos(pos)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-colors ${filterPos === pos ? 'bg-primary/20 text-primary border-primary/30' : 'bg-surface-dark text-slate-400 border-white/5'}`}>{pos}</button>
                            ))}
                        </div>

                        {/* Advanced Intelligent Filters */}
                        {showAdvancedFilters && (
                            <div className="flex flex-col gap-3 bg-surface-dark/50 p-3 rounded-2xl border border-white/5 animate-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Ordenar por:</span>
                                    <div className="flex gap-1.5">
                                        {[
                                            { id: 'scout', label: 'Pontos', icon: 'grade' },
                                            { id: 'ovr', label: 'Overall', icon: 'hexagon' },
                                            { id: 'name', label: 'Nome', icon: 'sort_by_alpha' }
                                        ].map(option => (
                                            <button
                                                key={option.id}
                                                onClick={() => setSortBy(option.id as any)}
                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${sortBy === option.id ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'}`}
                                            >
                                                <span className="material-symbols-outlined text-sm">{option.icon}</span>
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="h-px bg-white/5 w-full"></div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm text-primary">military_tech</span>
                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Apenas Atletas Pro:</span>
                                    </div>
                                    <button
                                        onClick={() => setFilterPro(!filterPro)}
                                        className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${filterPro ? 'bg-primary' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 size-3 rounded-full bg-white transition-transform duration-200 ${filterPro ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </header>

            <main className="flex-1 px-4 pb-28 pt-2 overflow-y-auto no-scrollbar">

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col gap-3">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-surface-dark rounded-xl animate-pulse" />)}
                    </div>
                )}

                {/* SCOUTS VIEW */}
                {!loading && activeTab === 'scouts' && (
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => navigate('/scouts-performance')}
                            className="mb-2 w-full py-3 bg-primary/10 border border-primary/30 text-primary font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/20 transition-all"
                        >
                            <span className="material-symbols-outlined">gavel</span>
                            Validar Scouts da Partida
                        </button>
                        <div className="flex justify-between items-center px-2 mb-1">
                            <span className="text-xs font-bold text-slate-500 uppercase">Ranking de Pontuação</span>
                            <span className="text-xs font-bold text-slate-500 uppercase">Máx. Scout</span>
                        </div>
                        {filteredPlayers.map((player, index) => (
                            <div key={player.id} className="bg-surface-dark border border-white/5 rounded-xl p-3 flex items-center gap-3 relative overflow-hidden group hover:border-primary/20 transition-all">
                                {/* Rank Medal/Shadow */}
                                <div className="relative size-8 flex items-center justify-center shrink-0">
                                    <span className={`text-lg font-black italic ${index === 0 ? 'text-yellow-500 scale-125' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-orange-400' : 'text-slate-600 opacity-50'}`}>
                                        {index + 1}
                                    </span>
                                </div>

                                <div className="size-12 rounded-full overflow-hidden border border-white/10 relative shrink-0">
                                    <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                                    {player.isPro && (
                                        <div className="absolute inset-0 border-2 border-primary rounded-full pointer-events-none"></div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <h3 className="text-white font-bold truncate">{player.name}</h3>
                                        {player.isPro && (
                                            <span className="material-symbols-outlined text-primary text-[14px]" title="Atleta Pro">military_tech</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase px-1.5 py-0.5 rounded bg-white/5 border border-white/5">{player.position}</span>
                                        {player.maxScout > 0 && (
                                            <span className="text-[9px] text-primary/70 font-bold uppercase px-1.5 py-0.5 rounded bg-primary/5 border border-primary/5">Ativo</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col items-end pr-2 shrink-0">
                                    <div className="flex items-center gap-1">
                                        <span className={`text-xl font-black ${player.maxScout > 0 ? 'text-primary' : 'text-slate-600'}`}>
                                            {(player.maxScout || 0).toFixed(1)}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Pontos</span>
                                </div>

                                {/* Hover Glow */}
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                            </div>
                        ))}
                    </div>
                )}

                {/* CARDS VIEW */}
                {!loading && activeTab === 'cards' && (
                    <div className="grid grid-cols-2 gap-x sm:gap-x 10 gap-y-6 px-1">
                        {filteredPlayers.map(player => (
                            <div key={player.id} className="flex justify-center overflow-hidden" style={{ height: 250 }}>
                                <PlayerCard
                                    name={player.name}
                                    ovr={player.ovr}
                                    position={player.position}
                                    avatar={player.cardAvatar || player.avatar}
                                    stats={player.stats}
                                    countryFlag={getFlagUrl(player.address?.country)}
                                    teamLogo={teamDetails?.logo || undefined}
                                    heartTeamLogo={PRO_TEAMS.find(t => t.id === player.heartTeamId)?.logo}
                                    birthDate={player.birthDate}
                                    scale={0.4}
                                    className="shadow-lg origin-top"
                                    onClick={() => setSelectedPlayer(player)}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* CHARTS VIEW */}
                {!loading && activeTab === 'charts' && chartsData && (
                    <div className="flex flex-col gap-6 pb-6">

                        {/* Evolution Chart */}
                        <div className="bg-surface-dark border border-white/5 rounded-2xl p-4">
                            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">trending_up</span>
                                Evolução de Pontos do Time
                            </h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartsData.evolutionChart}>
                                        <defs>
                                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#13ec5b" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#13ec5b" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                        <XAxis dataKey="date" stroke="#92c9a4" fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#102216', border: '1px solid #13ec5b20', borderRadius: '8px' }}
                                            itemStyle={{ color: '#13ec5b' }}
                                            labelStyle={{ color: '#92c9a4' }}
                                        />
                                        <Area type="monotone" dataKey="total" stroke="#13ec5b" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Individual Player Evolution */}
                        <div className="bg-surface-dark border border-white/5 rounded-2xl p-4">
                            <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-400">person_trending_up</span>
                                Evolução de Atletas
                            </h3>
                            <p className="text-[10px] text-slate-500 mb-4 uppercase font-bold">Selecione até 7 jogadores para comparar</p>

                            {/* Player Selector Chips */}
                            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-1">
                                {allPlayers.map(p => {
                                    const isSelected = selectedEvolutionIds.includes(String(p.id));
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => handleTogglePlayerEvolution(String(p.id))}
                                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-all border ${isSelected
                                                ? 'bg-primary border-primary text-background-dark shadow-[0_0_10px_rgba(19,236,91,0.3)]'
                                                : 'bg-white/5 border-white/10 text-slate-400 hover:border-slate-500'}`}
                                        >
                                            {p.name.split(' ')[0]}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartsData.playerEvolutionChart}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                        <XAxis dataKey="date" stroke="#92c9a4" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#92c9a4" fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#102216', border: '1px solid #ffffff20', borderRadius: '8px' }}
                                            itemStyle={{ fontSize: '11px', padding: '2px 0' }}
                                            labelStyle={{ color: '#92c9a4', marginBottom: '4px', fontWeight: 'bold' }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '15px' }} />
                                        {selectedEvolutionIds.map((id, index) => {
                                            const player = allPlayers.find(p => String(p.id) === id);
                                            if (!player) return null;
                                            const COLORS = ['#13ec5b', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#06b6d4'];
                                            return (
                                                <Line
                                                    key={id}
                                                    type="monotone"
                                                    dataKey={player.name}
                                                    stroke={COLORS[index % COLORS.length]}
                                                    strokeWidth={2}
                                                    dot={{ r: 3, fill: COLORS[index % COLORS.length], strokeWidth: 0 }}
                                                    activeDot={{ r: 5, strokeWidth: 0 }}
                                                    animationDuration={1000}
                                                />
                                            );
                                        })}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Scorers */}
                        <div className="bg-surface-dark border border-white/5 rounded-2xl p-4">
                            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-yellow-500">emoji_events</span>
                                Top Goleadores & Assistentes
                            </h3>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={chartsData.topPlayersChart} margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                                        <XAxis type="number" stroke="#92c9a4" fontSize={10} hide />
                                        <YAxis dataKey="name" type="category" stroke="#fff" fontSize={10} width={80} tickLine={false} axisLine={false} />
                                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#102216', border: '1px solid #ffffff20', borderRadius: '8px' }} />
                                        <Bar dataKey="goals" name="Gols" stackId="a" fill="#13ec5b" radius={[0, 4, 4, 0]} />
                                        <Bar dataKey="assists" name="Assists" stackId="a" fill="#00C49F" radius={[0, 4, 4, 0]} />
                                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Heart Team Histogram */}
                        <div className="bg-surface-dark border border-white/5 rounded-2xl p-4">
                            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-500">favorite</span>
                                Times do Coração
                            </h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartsData.heartTeamChart}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                        <XAxis dataKey="name" stroke="#92c9a4" fontSize={9} tickLine={false} axisLine={false} />
                                        <YAxis allowDecimals={false} stroke="#92c9a4" fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{ backgroundColor: '#102216', border: '1px solid #ffffff20', borderRadius: '8px' }}
                                        />
                                        <Bar dataKey="value" name="Torcedores" fill="#ef4444" radius={[4, 4, 0, 0]}>
                                            {chartsData.heartTeamChart.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={entry.id === 'fla' ? '#e11d48' : entry.id === 'pal' ? '#16a34a' : entry.id === 'cor' ? '#4b5563' : '#ef4444'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Position Distribution */}

                        <div className="bg-surface-dark border border-white/5 rounded-2xl p-4">
                            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-purple-400">donut_small</span>
                                Distribuição de Posições
                            </h3>
                            <div className="h-64 w-full flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartsData.posChart}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {chartsData.posChart.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.2)" />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#102216', border: '1px solid #ffffff20', borderRadius: '8px' }} />
                                        <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>
                )}

                {!loading && activeTab === 'charts' && (!analyticsData.length && !allPlayers.length) && (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                        <span className="material-symbols-outlined text-4xl mb-2">bar_chart</span>
                        <p>Dados insuficientes para gráficos.</p>
                    </div>
                )}

                {/* MANAGEMENT VIEW */}
                {!loading && activeTab === 'management' && (
                    <div className="flex flex-col gap-8">
                        {/* Pending Requests Section */}
                        <section>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="size-2 bg-yellow-500 rounded-full animate-pulse"></span>
                                Solicitações Pendentes ({pendingPlayers.length})
                            </h3>
                            {pendingPlayers.length > 0 ? (
                                <div className="flex flex-col gap-3">
                                    {pendingPlayers.map(p => (
                                        <div key={p.id} className="bg-surface-dark border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-12 rounded-full overflow-hidden border border-white/10">
                                                    <img src={p.avatar || 'https://via.placeholder.com/150'} alt={p.name} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-white font-bold">{p.name}</h4>
                                                    <p className="text-xs text-slate-400">Pede para entrar como: <span className="text-primary font-bold uppercase">{p.intended_role || 'jogador'}</span></p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button disabled={actionLoading === p.id} onClick={() => handleApprove(p.id)} className="flex-1 bg-primary text-background-dark font-black py-2.5 rounded-xl text-sm uppercase flex items-center justify-center gap-2 disabled:opacity-50">
                                                    {actionLoading === p.id ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">check_circle</span>} Aprovar
                                                </button>
                                                <button disabled={actionLoading === p.id} onClick={() => handleReject(p.id)} className="flex-1 bg-white/5 text-danger font-black py-2.5 rounded-xl text-sm uppercase flex items-center justify-center gap-2 disabled:opacity-50">
                                                    {actionLoading === p.id ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">cancel</span>} Recusar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white/5 rounded-2xl p-8 border border-dashed border-white/10 text-center">
                                    <span className="material-symbols-outlined text-slate-500 text-3xl mb-2">person_search</span>
                                    <p className="text-slate-500 text-sm">Nenhuma solicitação pendente.</p>
                                </div>
                            )}
                        </section>

                        {/* Approved Members Management */}
                        <section>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Integrantes do Time ({allPlayers.length})</h3>
                            <div className="flex flex-col gap-3">
                                {allPlayers.map((player) => (
                                    <div key={player.id} className="bg-surface-dark border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="size-12 rounded-full overflow-hidden border border-white/10">
                                                <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-white font-bold">{player.name}</h4>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${player.role === 'presidente' ? 'bg-yellow-500/20 text-yellow-500' : player.role === 'vice-presidente' ? 'bg-blue-500/20 text-blue-500' : 'bg-white/10 text-slate-400'}`}>
                                                        {allPlayers.find(ap => ap.id === player.id)?.position || 'MEI'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Nível {player.ovr}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase">Alterar Função:</span>
                                            <div className="flex gap-1">
                                                {['player', 'admin', 'vice-presidente'].map((r) => (
                                                    <button key={r} disabled={actionLoading === player.id} onClick={() => handleRoleUpdate(String(player.id), 'player', r as Role)} className="px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-colors bg-white/5 text-slate-400 hover:bg-primary/20 hover:text-primary">
                                                        {r.replace('-presidente', '').replace('player', 'jog')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}
            </main>

            {/* FULL CARD MODAL */}
            {selectedPlayer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setSelectedPlayer(null)}>
                    <div className="relative flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <PlayerCard
                            name={selectedPlayer.name}
                            ovr={selectedPlayer.ovr}
                            position={selectedPlayer.position}
                            avatar={selectedPlayer.cardAvatar || selectedPlayer.avatar}
                            stats={selectedPlayer.stats}
                            countryFlag={getFlagUrl(selectedPlayer.address?.country)}
                            teamLogo={teamDetails?.logo || undefined}
                            heartTeamLogo={PRO_TEAMS.find(t => t.id === selectedPlayer.heartTeamId)?.logo}
                            birthDate={selectedPlayer.birthDate}
                            scale={0.85}
                            className="shadow-2xl"
                        />
                        <button onClick={() => setSelectedPlayer(null)} className="mt-12 bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-8 rounded-full border border-white/10 transition-colors flex items-center gap-2">
                            <span className="material-symbols-outlined">close</span>
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamStatsScreen;
