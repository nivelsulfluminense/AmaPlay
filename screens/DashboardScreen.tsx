import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { dataService, LegacyGameEvent } from '../services/dataService';
import { authService } from '../services/authService';
import { supabase } from '../services/supabase';

const DashboardScreen = () => {
  const { role, name, avatar, logout, teamId, isApproved, teamDetails, intendedRole, isFirstManager, unreadCount, fetchNotifications, isPro } = useUser();

  const isManager = role === 'presidente' || role === 'vice-presidente' || intendedRole === 'presidente' || intendedRole === 'vice-presidente';
  const isUserApproved = isApproved || isManager; // Presidentes/Vices são considerados aprovados automaticamente

  const isPlayer = role === 'player' && !isManager;
  const isAdmin = role === 'admin' || isManager;
  const navigate = useNavigate();


  const handleLogout = async () => {
    await logout();
    window.location.href = '#/';
    window.location.reload();
  };

  // Dados Assíncronos
  const [loading, setLoading] = useState(true);
  const [nextGame, setNextGame] = useState<LegacyGameEvent | null>(null);
  const [balance, setBalance] = useState(0);
  const [monthlyDiff, setMonthlyDiff] = useState(0);
  const [nextBirthday, setNextBirthday] = useState<{ name: string, date: Date, avatar: string } | null>(null);
  const [pendingActionCount, setPendingActionCount] = useState(0);

  useEffect(() => {
    fetchNotifications(); // Busca notificações ao carregar o dashboard

    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const events = await dataService.events.list();

        // Normalize comparison date to start of current day to include events later today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const futureEvents = events
          .filter(e => {
            const eventDate = new Date(e.date + 'T00:00:00');
            return eventDate >= today;
          })
          .sort((a, b) => new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime());

        if (futureEvents.length > 0) {
          setNextGame(futureEvents[0]);
        }

        if (!isPlayer) {
          const trans = await dataService.finance.list();
          const total = trans.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
          setBalance(total);

          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const recent = trans.filter(t => new Date(t.date) > thirtyDaysAgo);
          const diff = recent.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
          setMonthlyDiff(diff);
        }

        const players = await dataService.players.list();
        const now = new Date();
        const currentYear = now.getFullYear();

        const upcomingBirthdays = players
          .filter(p => p.birthDate)
          .map(p => {
            const [year, month, day] = (p.birthDate as string).split('-').map(Number);
            let bday = new Date(currentYear, month - 1, day);
            if (bday < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
              bday = new Date(currentYear + 1, month - 1, day);
            }
            return { name: p.name, avatar: p.avatar, date: bday };
          })
          .sort((a, b) => a.date.getTime() - b.date.getTime());

        if (upcomingBirthdays.length > 0) {
          setNextBirthday(upcomingBirthdays[0]);
        }

        // Busca ações pendentes para administradores
        if (isAdmin && isApproved) {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            const [requests, transactions] = await Promise.all([
              dataService.team.getPendingRequests(),
              dataService.finance.list()
            ]);

            // Filtra solicitações excluindo o próprio usuário (não pode se auto-aprovar)
            const otherPendingRequests = requests.filter(r => r.id !== user?.id).length;
            const pendingPayments = transactions.filter(t => t.status === 'pending').length;

            setPendingActionCount(otherPendingRequests + pendingPayments);
          } catch (e) {
            console.error("Error fetching pending actions:", e);
          }
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    if (teamId) {
      loadDashboardData();
    }
  }, [isPlayer, teamId, fetchNotifications]);


  const openMap = (e: React.MouseEvent, location: string) => {
    e.stopPropagation();
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank');
  };

  const defaultAvatar = "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA9CdnaU42JXMfnXGWyJWdV9dFCGHcnZKGBNvb_trvrdaASZj2hu1PkTwHMs62H4JzdweDgLmUIATzssgR3oRn0M22sWWiiMccTvQgHc5UJIjsXlvw2Z-H9nsnk-8Eh9KEDP125KqUQvtKxCliJUkGrZsohY6LMuyN7Xa2TmKLfzuIxut2lGNY6N1Eu3Eh7v-oSIO8zteb-pfgaNshQ8RmXDlv7ThIGGvyZmVrjroPp91i7NOFity34HlgKZuCPfiZOdVtMif4Q0Uw')";
  const userAvatarStyle = avatar ? `url('${avatar}')` : defaultAvatar;

  const formatDate = (dateStr: string) => {
    // Add time component to prevent timezone shift when parsing YYYY-MM-DD
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  const getDaysUntil = (dateStr: string) => {
    const eventDate = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diff = eventDate.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Hoje';
    if (days < 0) return 'Concluído';
    return `Faltam ${days} ${days === 1 ? 'dia' : 'dias'}`;
  };

  return (
    <div className="pb-28">
      {/* Sticky Header */}
      <div className="flex items-center px-6 py-4 pt-8 justify-between sticky top-0 z-20 bg-background-dark/90 backdrop-blur-lg border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="bg-center bg-no-repeat bg-cover rounded-full size-12 border-2 border-primary ring-2 ring-primary/20" style={{ backgroundImage: userAvatarStyle }}></div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-400">Bem-vindo,</span>
            <h2 className="text-white text-lg font-bold leading-tight tracking-tight">{name}</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/notifications')}
            className="relative flex items-center justify-center size-10 rounded-full bg-white/5 text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2.5 size-2 bg-primary rounded-full ring-2 ring-background-dark animate-pulse"></span>
            )}
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center justify-center size-10 rounded-full bg-white/5 text-white hover:bg-white/10 transition-colors"
            title="Configurações"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center size-10 rounded-full bg-white/5 text-danger hover:bg-danger/20 transition-colors"
            title="Sair"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </div>

      <main className="flex flex-col gap-6 pt-4">
        {!teamId && (
          <section className="px-4">
            <div
              onClick={() => navigate('/register-team')}
              className="bg-primary/10 border-2 border-dashed border-primary/30 rounded-[2rem] p-6 flex flex-col gap-4 cursor-pointer hover:bg-primary/20 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-1">Passo 2 de 3</span>
                  <h3 className="text-white text-xl font-black italic uppercase">Vincule-se a um <span className="text-primary">Time!</span></h3>
                </div>
                <div className="size-12 rounded-full bg-primary flex items-center justify-center text-background-dark shadow-[0_0_20px_rgba(19,236,91,0.4)] group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined font-black">add_circle</span>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Você ainda não faz parte de nenhum esquadrão. Clique aqui para buscar seu time ou criar um novo!
              </p>
              <div className="flex gap-2">
                <div className="h-1.5 flex-1 bg-primary rounded-full"></div>
                <div className="h-1.5 flex-1 bg-white/10 rounded-full"></div>
              </div>
            </div>
          </section>
        )}

        {nextBirthday && (
          <section className="px-4">
            <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-2xl p-4 flex items-center gap-4">
              <div className="size-12 rounded-full border-2 border-pink-500/30 p-0.5 overflow-hidden shrink-0">
                <img src={nextBirthday.avatar || 'https://via.placeholder.com/150'} alt={nextBirthday.name} className="w-full h-full object-cover rounded-full" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-sm flex items-center gap-2">
                  Próximo Aniversário
                  <span className="material-symbols-outlined text-pink-500 text-sm filled">cake</span>
                </h4>
                <p className="text-slate-300 text-xs">
                  <span className="text-pink-400 font-bold">{nextBirthday.name}</span> em {nextBirthday.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                </p>
              </div>
              <button
                onClick={() => {
                  const text = encodeURIComponent(`Parabéns pelo seu aniversário, ${nextBirthday.name}! 🎉 Desejamos tudo de bom pra você no nosso esquadrão!`);
                  window.open(`https://wa.me/?text=${text}`, '_blank');
                }}
                className="bg-white/5 hover:bg-white/10 p-2 rounded-full text-pink-500 transition-colors"
                title="Parabenizar no WhatsApp"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </section>
        )}

        {isAdmin && pendingActionCount > 0 && (
          <section className="px-4">
            <div
              onClick={() => navigate('/finance')}
              className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-orange-500/20 transition-colors"
            >
              <div className="size-10 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 animate-pulse">
                <span className="material-symbols-outlined">priority_high</span>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-sm">Ação Necessária</h4>
                <p className="text-orange-200 text-xs text-balance">Verifique novas solicitações e pagamentos pendentes.</p>
              </div>
              <span className="material-symbols-outlined text-orange-400">chevron_right</span>
            </div>
          </section>
        )}

        {!isPlayer && (
          <section className="px-4">
            <div
              onClick={() => navigate('/finance')}
              className="relative flex flex-col gap-4 rounded-[2rem] p-6 bg-surface-dark bg-gradient-to-br from-[#1a3023] to-[#122419] border border-white/5 shadow-xl overflow-hidden group cursor-pointer transition-transform active:scale-[0.99]"
            >
              <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/15 transition-all duration-700"></div>
              <div className="absolute bottom-0 right-0 w-full h-24 bg-gradient-to-t from-primary/5 to-transparent opacity-50"></div>

              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <p className="text-slate-400 text-sm font-medium tracking-wide uppercase mb-1">Saldo Financeiro</p>
                  <h3 className="text-white text-4xl font-bold tracking-tight">
                    R$ {balance.toLocaleString('pt-BR')}<span className="text-primary/80 text-2xl">,00</span>
                  </h3>
                </div>
                <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/10">
                  <span className="material-symbols-outlined">account_balance_wallet</span>
                </div>
              </div>

              <div className="relative z-10 flex items-center gap-2 mt-2">
                <div className={`flex items-center px-2.5 py-1 rounded-full text-xs font-bold shadow-lg shadow-primary/20 ${monthlyDiff >= 0 ? 'bg-primary text-background-dark' : 'bg-red-500 text-white'}`}>
                  <span className="material-symbols-outlined text-sm mr-0.5" style={{ fontSize: '16px' }}>{monthlyDiff >= 0 ? 'trending_up' : 'trending_down'}</span>
                  {monthlyDiff >= 0 ? '+' : ''}R$ {Math.abs(monthlyDiff)}
                </div>
                <p className="text-slate-400 text-sm font-medium">últimos 30 dias</p>
              </div>
            </div>
          </section>
        )}

        <section className="px-4">
          <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-4 px-2">Ações Rápidas</h3>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => navigate(isPro ? '/pro-selection' : '/scouts')}
              className="flex flex-col items-center gap-3 group"
            >
              <div className="size-16 rounded-full bg-surface-dark border border-white/10 flex items-center justify-center text-white group-active:scale-95 transition-all hover:bg-white/10 hover:border-primary/50">
                <span className="material-symbols-outlined text-3xl text-primary">military_tech</span>
              </div>
              <span className="text-xs font-medium text-slate-300 text-center leading-tight">AmaFut<br />Pro</span>
            </button>

            <button
              onClick={() => navigate('/player-stats')}
              className="flex flex-col items-center gap-3 group"
            >
              <div className="size-16 rounded-full bg-surface-dark border border-white/10 flex items-center justify-center text-white group-active:scale-95 transition-all hover:bg-white/10 hover:border-primary/50">
                <span className="material-symbols-outlined text-3xl">hexagon</span>
              </div>
              <span className="text-xs font-medium text-slate-300 text-center leading-tight">Overall</span>
            </button>

            <button
              onClick={() => navigate('/team-stats')}
              className="flex flex-col items-center gap-3 group"
            >
              <div className="size-16 rounded-full bg-surface-dark border border-white/10 flex items-center justify-center text-white group-active:scale-95 transition-all hover:bg-white/10 hover:border-primary/50">
                <span className="material-symbols-outlined text-3xl">query_stats</span>
              </div>
              <span className="text-xs font-medium text-slate-300 text-center leading-tight">Estatísticas<br />Jogadores</span>
            </button>

            <button
              onClick={() => navigate('/scoring')}
              className="flex flex-col items-center gap-3 group"
            >
              <div className="size-16 rounded-full bg-surface-dark border border-white/10 flex items-center justify-center text-white group-active:scale-95 transition-all hover:bg-white/10 hover:border-yellow-500/50">
                <span className="material-symbols-outlined text-3xl text-yellow-500">stars</span>
              </div>
              <span className="text-xs font-medium text-slate-300 text-center leading-tight">Scoring</span>
            </button>

            {role === 'presidente' && (
              <button
                onClick={() => navigate('/agenda')}
                className="flex flex-col items-center gap-3 group"
              >
                <div className="size-16 rounded-full bg-primary flex items-center justify-center text-background-dark shadow-lg shadow-primary/25 group-active:scale-95 transition-transform duration-200 ring-4 ring-transparent hover:ring-primary/20">
                  <span className="material-symbols-outlined text-3xl filled">outdoor_grill</span>
                </div>
                <span className="text-xs font-medium text-slate-300 text-center leading-tight">Agendar<br />Churrasco</span>
              </button>
            )}

            {!isPlayer && (
              <>
                <button
                  onClick={() => navigate('/agenda')}
                  className="flex flex-col items-center gap-3 group"
                >
                  <div className="size-16 rounded-full bg-surface-dark border border-white/10 flex items-center justify-center text-white group-active:scale-95 transition-all hover:bg-white/10 hover:border-primary/50">
                    <span className="material-symbols-outlined text-3xl">fact_check</span>
                  </div>
                  <span className="text-xs font-medium text-slate-300 text-center leading-tight">Lista de<br />Presença</span>
                </button>
                <button
                  onClick={() => navigate('/finance', { state: { action: 'add_expense' } })}
                  className="flex flex-col items-center gap-3 group"
                >
                  <div className="size-16 rounded-full bg-surface-dark border border-white/10 flex items-center justify-center text-white group-active:scale-95 transition-all hover:bg-white/10 hover:border-primary/50">
                    <span className="material-symbols-outlined text-3xl">payments</span>
                  </div>
                  <span className="text-xs font-medium text-slate-300 text-center leading-tight">Lançar<br />Gasto</span>
                </button>
              </>
            )}

            {isPlayer && (
              <button
                onClick={() => navigate('/player-payments')}
                className="flex flex-col items-center gap-3 group"
              >
                <div className="size-16 rounded-full bg-primary flex items-center justify-center text-background-dark shadow-lg shadow-primary/25 group-active:scale-95 transition-transform duration-200 ring-4 ring-transparent hover:ring-primary/20">
                  <span className="material-symbols-outlined text-3xl filled">account_balance_wallet</span>
                </div>
                <span className="text-xs font-medium text-slate-300 text-center leading-tight">Meus<br />Pagamentos</span>
              </button>
            )}
          </div>
        </section>

        <section className="px-4">
          <div className="flex items-center justify-between mb-3 px-2">
            <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase">Próximo Jogo</h3>
            {nextGame && (
              <span className="text-primary text-[10px] uppercase font-bold bg-primary/10 border border-primary/20 px-2 py-1 rounded-full">
                {nextGame.type === 'game' ? 'Partida' : 'Evento'}
              </span>
            )}
          </div>

          {nextGame ? (
            <div
              onClick={() => navigate('/agenda')}
              className="rounded-[2rem] bg-surface-dark overflow-hidden border border-white/5 shadow-lg relative group cursor-pointer"
            >
              <div className="h-36 w-full bg-cover bg-center relative" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAor5X-aVJYC_HaXfa0WHiArEKDV-kbPsTSP8hg8ApqWwc-KGjyn_PO4TsbP6AIitM5A8cGJI2yIeFNfZ2iBeCYvNJdu7-VDCfJsx3jEzE3eMe3elZq-8272XhGKjDo47R0RQx9mrTBF5UouadcOCBTl55XoMx3SkdYaYz1jaJgRYfDnmYtUrOPct6zUBGtaes9C7pSqnjqbzX9uZmt2u5ULIiyKBtr8HuaThuD0oYdmPZGumLp6y4KJuGbWWuKGFXRGPSy6HmLs64')" }}>
                <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-surface-dark/60 to-transparent"></div>
                <div className="absolute top-4 right-4 bg-background-dark/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-primary filled">timer</span>
                  {getDaysUntil(nextGame.date)}
                </div>
                <div className="absolute bottom-4 left-5 w-full pr-10 text-pretty">
                  <p className="text-primary text-xs font-bold tracking-wider mb-1 uppercase drop-shadow-md">
                    {teamDetails?.name || 'Meu Time'}
                  </p>
                  <h4 className="text-2xl font-bold text-white leading-none">
                    {nextGame.type === 'game' ? `vs. ${nextGame.opponent || 'Adversário'}` : nextGame.title}
                  </h4>
                </div>
              </div>
              <div className="p-5 pt-1 grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Data e Hora</span>
                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    <span className="material-symbols-outlined text-primary text-lg">calendar_month</span>
                    <span className="font-medium whitespace-pre">
                      {formatDate(nextGame.date)}<br />
                      <span className="text-xs text-slate-400 font-normal">{nextGame.time}</span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 pl-4 border-l border-white/10">
                  <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Local</span>
                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    <span className="material-symbols-outlined text-primary text-lg">location_on</span>
                    <span className="font-medium">
                      {nextGame.location}<br />
                      <button onClick={(e) => openMap(e, nextGame.location)} className="text-xs text-primary font-normal underline cursor-pointer hover:text-white transition-colors">Abrir Mapa</button>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => navigate('/agenda')}
              className="rounded-[2rem] bg-surface-dark/50 border border-dashed border-white/10 p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-dark transition-colors"
            >
              <span className="material-symbols-outlined text-slate-500 text-4xl mb-2">event_busy</span>
              <p className="text-slate-400 text-sm">Nenhum jogo agendado.</p>
              {isAdmin && <p className="text-primary text-xs font-bold mt-2">Clique para agendar</p>}
            </div>
          )}
        </section>

        {!isPlayer && (
          <section className="px-4 pb-6">
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase">Estoque</h3>
              <button
                onClick={() => navigate('/inventory')}
                className="text-primary text-xs font-bold hover:underline"
              >
                Ver Tudo
              </button>
            </div>
            <div
              onClick={() => navigate('/inventory')}
              className="bg-surface-dark rounded-[2rem] p-5 border border-white/5 flex flex-col gap-5 shadow-lg cursor-pointer hover:border-primary/20 transition-colors"
            >
              <div className="flex items-center gap-4 group">
                <div className="size-11 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-primary/30 transition-colors">
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">checkroom</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-2 items-end">
                    <p className="text-white font-bold text-sm">Coletes</p>
                    <p className="text-primary text-[10px] font-bold uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full">Completo</p>
                  </div>
                  <div className="h-2 w-full bg-background-dark rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-primary w-full rounded-full shadow-[0_0_10px_rgba(19,236,91,0.5)]"></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="size-11 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-yellow-400/30 transition-colors">
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-yellow-400 transition-colors">sports_soccer</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-2 items-end">
                    <p className="text-white font-bold text-sm">Bolas</p>
                    <p className="text-yellow-400 text-[10px] font-bold uppercase tracking-wider">5/6 Disponíveis</p>
                  </div>
                  <div className="h-2 w-full bg-background-dark rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-yellow-400 w-5/6 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default DashboardScreen;