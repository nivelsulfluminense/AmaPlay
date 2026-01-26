import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, Role } from '../contexts/UserContext';
import { dataService, Player } from '../services/dataService';
import { Profile } from '../services/supabase';
import PlayerCard from '../components/PlayerCard';

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

const getFlagUrl = (code?: string) => {
    if (!code) return undefined;
    return `https://flagcdn.com/w160/${code}.png`;
};

// Mock Data for Seeding
const MOCK_PLAYERS: Player[] = [
    { id: 1, createdAt: '', name: 'Lucas Silva', position: 'ATA', avatar: 'https://i.pravatar.cc/150?u=1', ovr: 82, teamId: 101, maxScout: 14.5, stats: { pace: 85, shooting: 84, passing: 70, dribbling: 82, defending: 30, physical: 65 } },
    { id: 2, createdAt: '', name: 'Marcos Santos', position: 'MEI', avatar: 'https://i.pravatar.cc/150?u=2', ovr: 78, teamId: 101, maxScout: 9.2, stats: { pace: 75, shooting: 72, passing: 85, dribbling: 78, defending: 55, physical: 68 } },
    { id: 3, createdAt: '', name: 'Rafael Costa', position: 'ZAG', avatar: 'https://i.pravatar.cc/150?u=3', ovr: 75, teamId: 101, maxScout: 6.8, stats: { pace: 68, shooting: 40, passing: 65, dribbling: 55, defending: 82, physical: 85 } },
    { id: 4, createdAt: '', name: 'Bruno Mendes', position: 'GOL', avatar: 'https://i.pravatar.cc/150?u=4', ovr: 80, teamId: 101, maxScout: 12.0, stats: { pace: 60, shooting: 30, passing: 70, dribbling: 45, defending: 85, physical: 80 } },
    { id: 5, createdAt: '', name: 'Gabriel Jesus', position: 'ATA', avatar: 'https://i.pravatar.cc/150?u=5', ovr: 88, teamId: 102, maxScout: 18.4, stats: { pace: 89, shooting: 88, passing: 78, dribbling: 90, defending: 40, physical: 75 } }, // Different Team
    { id: 6, createdAt: '', name: 'Filipe Luis', position: 'ZAG', avatar: 'https://i.pravatar.cc/150?u=6', ovr: 79, teamId: 101, maxScout: 8.5, stats: { pace: 70, shooting: 55, passing: 82, dribbling: 75, defending: 78, physical: 72 } },
    { id: 7, createdAt: '', name: 'Diego Ribas', position: 'MEI', avatar: 'https://i.pravatar.cc/150?u=7', ovr: 81, teamId: 101, maxScout: 10.1, stats: { pace: 65, shooting: 78, passing: 88, dribbling: 84, defending: 50, physical: 60 } },
    { id: 8, createdAt: '', name: 'Pedro', position: 'ATA', avatar: 'https://i.pravatar.cc/150?u=8', ovr: 84, teamId: 101, maxScout: 15.2, stats: { pace: 78, shooting: 86, passing: 72, dribbling: 80, defending: 35, physical: 78 } },
    { id: 9, createdAt: '', name: 'Gerson', position: 'MEI', avatar: 'https://i.pravatar.cc/150?u=9', ovr: 85, teamId: 101, maxScout: 11.5, stats: { pace: 80, shooting: 75, passing: 86, dribbling: 88, defending: 70, physical: 82 } },
    { id: 10, createdAt: '', name: 'Rossi', position: 'GOL', avatar: 'https://i.pravatar.cc/150?u=10', ovr: 77, teamId: 102, maxScout: 7.5, stats: { pace: 55, shooting: 25, passing: 65, dribbling: 40, defending: 80, physical: 75 } } // Different Team
];

const TeamStatsScreen = () => {
    const navigate = useNavigate();
    const { teamId, teamDetails, role, approveMember, rejectMember, updateMemberRole } = useUser();
    const isManager = role === 'presidente' || role === 'vice-presidente';
    const [activeTab, setActiveTab] = useState<'scouts' | 'cards' | 'management'>('scouts');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPos, setFilterPos] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'ovr' | 'name' | 'scout'>('ovr');
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

    // Async Data
    const [loading, setLoading] = useState(true);
    const [allPlayers, setAllPlayers] = useState<Player[]>([]);
    const [pendingPlayers, setPendingPlayers] = useState<Profile[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null); // To show loading on specific buttons

    const loadData = async () => {
        setLoading(true);
        try {
            const [playersData, pendingData] = await Promise.all([
                dataService.players.list(),
                isManager ? dataService.team.getPendingRequests() : Promise.resolve([])
            ]);
            setAllPlayers(playersData);
            setPendingPlayers(pendingData as Profile[]);
        } catch (err) {
            console.error("Falha ao carregar dados do time", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [isManager]);

    const handleApprove = async (id: string) => {
        setActionLoading(id);
        const success = await approveMember(id);
        if (success) {
            await loadData();
        }
        setActionLoading(null);
    };

    const handleReject = async (id: string) => {
        setActionLoading(id);
        const success = await rejectMember(id);
        if (success) {
            await loadData();
        }
        setActionLoading(null);
    };

    const handleRoleUpdate = async (id: string, currentRole: Role, newRole: Role) => {
        setActionLoading(id);
        const success = await updateMemberRole(id, currentRole, newRole);
        if (success) {
            await loadData();
        }
        setActionLoading(null);
    };

    // Filter Logic
    const filteredPlayers = useMemo(() => {
        let list = [...allPlayers];

        // Filter by Team ID (Matches current user)
        if (teamId) {
            list = list.filter(p => p.teamId === teamId);
        }

        // Search
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(lower));
        }

        // Position Filter
        if (filterPos !== 'all') {
            list = list.filter(p => p.position === filterPos);
        }

        // Sort
        list.sort((a, b) => {
            if (activeTab === 'scouts') {
                // Default sort by Max Scout for Scouts tab
                if (sortBy === 'name') return a.name.localeCompare(b.name);
                return (b.maxScout || 0) - (a.maxScout || 0);
            } else {
                // Default sort for Cards
                if (sortBy === 'name') return a.name.localeCompare(b.name);
                if (sortBy === 'scout') return (b.maxScout || 0) - (a.maxScout || 0);
                return b.ovr - a.ovr;
            }
        });

        return list;
    }, [searchTerm, filterPos, sortBy, activeTab, teamId, allPlayers]);

    const getCardColor = (ovr: number) => {
        if (ovr >= 80) return 'from-[#fbeea5] via-[#dbb660] to-[#8d6e2e] border-[#fbeea5] text-[#3e2b12]'; // Gold
        if (ovr >= 75) return 'from-[#ffffff] via-[#c0c0c0] to-[#707070] border-[#e0e0e0] text-[#1a1a1a]'; // Silver
        return 'from-[#ebdccb] via-[#cfa682] to-[#8a6042] border-[#ebdccb] text-[#3d2411]'; // Bronze
    };

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
                <div className="flex px-6 border-b border-white/5">
                    <button
                        onClick={() => { setActiveTab('scouts'); setSortBy('scout'); }}
                        className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative ${activeTab === 'scouts' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Scouts (Pontuação)
                        {activeTab === 'scouts' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                    <button
                        onClick={() => { setActiveTab('cards'); setSortBy('ovr'); }}
                        className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative ${activeTab === 'cards' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Cards & Overall
                        {activeTab === 'cards' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                    {isManager && (
                        <button
                            onClick={() => { setActiveTab('management'); }}
                            className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative ${activeTab === 'management' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Gestão
                            {activeTab === 'management' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                        </button>
                    )}
                </div>

                {/* Filters (Hidden in Management Tab) */}
                {activeTab !== 'management' && (
                    <div className="p-4 flex flex-col gap-3">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">search</span>
                            <input
                                type="text"
                                placeholder="Buscar jogador..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-surface-dark border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-primary focus:ring-0"
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            <button
                                onClick={() => setFilterPos('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-colors ${filterPos === 'all' ? 'bg-primary text-background-dark border-primary' : 'bg-surface-dark text-slate-400 border-white/5'}`}
                            >
                                Todos
                            </button>
                            {['GOL', 'ZAG', 'MEI', 'ATA'].map(pos => (
                                <button
                                    key={pos}
                                    onClick={() => setFilterPos(pos)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-colors ${filterPos === pos ? 'bg-primary text-background-dark border-primary' : 'bg-surface-dark text-slate-400 border-white/5'}`}
                                >
                                    {pos}
                                </button>
                            ))}
                        </div>
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
                        <div className="flex justify-between items-center px-2 mb-1">
                            <span className="text-xs font-bold text-slate-500 uppercase">Ranking de Pontuação</span>
                            <span className="text-xs font-bold text-slate-500 uppercase">Máx. Scout</span>
                        </div>
                        {filteredPlayers.map((player, index) => (
                            <div key={player.id} className="bg-surface-dark border border-white/5 rounded-xl p-3 flex items-center gap-3 relative overflow-hidden group">
                                <span className="text-lg font-black text-slate-600 w-6 text-center">{index + 1}</span>
                                <div className="size-12 rounded-full overflow-hidden border border-white/10 relative">
                                    <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-bold truncate">{player.name}</h3>
                                    <span className="text-xs text-slate-400 font-medium px-1.5 py-0.5 rounded bg-white/5">{player.position}</span>
                                </div>
                                <div className="flex flex-col items-end pr-2">
                                    <span className="text-xl font-black text-primary">{(player.maxScout || 0).toFixed(1)}</span>
                                    <span className="text-[10px] text-slate-400 uppercase">Pontos</span>
                                </div>
                                <div className="absolute left-0 bottom-0 top-0 w-1 bg-gradient-to-b from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                        ))}
                    </div>
                )}

                {/* CARDS VIEW */}
                {!loading && activeTab === 'cards' && (
                    <div className="grid grid-cols-2 gap-x-2 gap-y-4">
                        {filteredPlayers.map(player => {
                            const heartTeamLogo = PRO_TEAMS.find(t => t.id === player.heartTeamId)?.logo;
                            const countryFlag = getFlagUrl(player.address?.country);

                            return (
                                <div key={player.id} className="flex justify-center overflow-hidden" style={{ height: 260 }}>
                                    <PlayerCard
                                        name={player.name}
                                        ovr={player.ovr}
                                        position={player.position}
                                        avatar={player.cardAvatar || player.avatar}
                                        stats={player.stats}
                                        countryFlag={countryFlag}
                                        teamLogo={teamDetails?.logo || undefined}
                                        heartTeamLogo={heartTeamLogo}
                                        scale={0.42}
                                        className="shadow-lg origin-top"
                                        onClick={() => setSelectedPlayer(player)}
                                    />
                                </div>
                            );
                        })}
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
                                                <button
                                                    disabled={actionLoading === p.id}
                                                    onClick={() => handleApprove(p.id)}
                                                    className="flex-1 bg-primary text-background-dark font-black py-2.5 rounded-xl text-sm uppercase flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    {actionLoading === p.id ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">check_circle</span>}
                                                    Aprovar
                                                </button>
                                                <button
                                                    disabled={actionLoading === p.id}
                                                    onClick={() => handleReject(p.id)}
                                                    className="flex-1 bg-white/5 text-danger font-black py-2.5 rounded-xl text-sm uppercase flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    {actionLoading === p.id ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">cancel</span>}
                                                    Recusar
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
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${player.role === 'presidente' ? 'bg-yellow-500/20 text-yellow-500' :
                                                        player.role === 'vice-presidente' ? 'bg-blue-500/20 text-blue-500' :
                                                            'bg-white/10 text-slate-400'
                                                        }`}>
                                                        {allPlayers.find(ap => ap.id === player.id)?.position || 'MEI'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Nível {player.ovr}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row of quick role updates for players (don't allow changing Pres from here) */}
                                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase">Alterar Função:</span>
                                            <div className="flex gap-1">
                                                {['player', 'admin', 'vice-presidente'].map((r) => (
                                                    <button
                                                        key={r}
                                                        disabled={actionLoading === player.id}
                                                        onClick={() => handleRoleUpdate(String(player.id), 'player', r as Role)}
                                                        className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-colors ${
                                                            // We need to know current role to highlight it
                                                            // Currently Player interface doesn't have role. 
                                                            // In a real app we'd need it. For now let's just show buttons.
                                                            'bg-white/5 text-slate-400 hover:bg-primary/20 hover:text-primary'
                                                            }`}
                                                    >
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

                {!loading && filteredPlayers.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                        <span className="material-symbols-outlined text-4xl mb-2">person_search</span>
                        <p>Nenhum jogador encontrado.</p>
                    </div>
                )}

            </main>

            {/* FULL CARD MODAL */}
            {selectedPlayer && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedPlayer(null)}
                >
                    <div
                        className="relative flex flex-col items-center"
                        onClick={e => e.stopPropagation()}
                    >
                        <PlayerCard
                            name={selectedPlayer.name}
                            ovr={selectedPlayer.ovr}
                            position={selectedPlayer.position}
                            avatar={selectedPlayer.cardAvatar || selectedPlayer.avatar}
                            stats={selectedPlayer.stats}
                            countryFlag={getFlagUrl(selectedPlayer.address?.country)}
                            teamLogo={teamDetails?.logo || undefined}
                            heartTeamLogo={PRO_TEAMS.find(t => t.id === selectedPlayer.heartTeamId)?.logo}
                            scale={0.85} // Large size
                            className="shadow-2xl"
                        />

                        <button
                            onClick={() => setSelectedPlayer(null)}
                            className="mt-12 bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-8 rounded-full border border-white/10 transition-colors flex items-center gap-2"
                        >
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
