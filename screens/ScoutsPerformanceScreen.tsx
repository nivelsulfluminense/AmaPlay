import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

interface ScoutRule {
  id: string;
  label: string;
  points: number;
  type: 'attack' | 'defense';
  description?: string;
  isNegative?: boolean;
}

const SCOUT_RULES: ScoutRule[] = [
  // Attack / General
  { id: 'gol', label: 'Gol', points: 8.0, type: 'attack' },
  { id: 'assist', label: 'Assistência', points: 5.0, type: 'attack' },
  { id: 'finalizacao_trave', label: 'Finalização na trave', points: 3.0, type: 'attack' },
  { id: 'finalizacao_defendida', label: 'Finalização defendida', points: 1.2, type: 'attack' },
  { id: 'finalizacao_fora', label: 'Finalização para fora', points: 0.8, type: 'attack' },
  { id: 'falta_sofrida', label: 'Falta sofrida', points: 0.5, type: 'attack' },
  { id: 'penalti_sofrido', label: 'Pênalti sofrido', points: 1.0, type: 'attack' },
  { id: 'penalti_perdido_fora', label: 'Pênalti perdido para fora', points: -3.2, type: 'attack', isNegative: true },
  { id: 'penalti_perdido_defesa', label: 'Pênalti perdido (defesa)', points: -2.8, type: 'attack', isNegative: true },
  { id: 'penalti_perdido_trave', label: 'Pênalti perdido na trave', points: -1.0, type: 'attack', isNegative: true },
  { id: 'impedimento', label: 'Impedimento', points: -0.1, type: 'attack', isNegative: true },

  // Defense
  { id: 'sem_sofrer_gols', label: 'SG (Sem sofrer gols)', points: 5.0, type: 'defense', description: 'Somente defensores' },
  { id: 'defesa_penalti', label: 'Defesa de pênalti', points: 7.0, type: 'defense' },
  { id: 'defesa', label: 'Defesa Difícil', points: 1.3, type: 'defense' },
  { id: 'desarme', label: 'Desarme', points: 1.5, type: 'defense' },
  { id: 'gol_contra', label: 'Gol contra', points: -3.0, type: 'defense', isNegative: true },
  { id: 'cartao_vermelho', label: 'Cartão vermelho', points: -3.0, type: 'defense', isNegative: true },
  { id: 'cartao_amarelo', label: 'Cartão amarelo', points: -1.0, type: 'defense', isNegative: true },
  { id: 'gol_sofrido', label: 'Gol sofrido', points: -1.0, type: 'defense', isNegative: true },
  { id: 'falta_cometida', label: 'Falta cometida', points: -0.3, type: 'defense', isNegative: true },
  { id: 'penalti_cometido', label: 'Pênalti cometido', points: -1.0, type: 'defense', isNegative: true },
];

const ScoutsPerformanceScreen = () => {
  const navigate = useNavigate();
  const { name, avatar } = useUser();
  const [activeTab, setActiveTab] = useState<'attack' | 'defense'>('attack');
  const [counts, setCounts] = useState<Record<string, number>>({});

  const totalScore = useMemo(() => {
    return SCOUT_RULES.reduce((acc, rule) => {
      const count = counts[rule.id] || 0;
      return acc + (count * rule.points);
    }, 0);
  }, [counts]);

  const updateCount = (id: string, delta: number) => {
    setCounts(prev => {
      const current = prev[id] || 0;
      const newValue = Math.max(0, current + delta);
      return { ...prev, [id]: newValue };
    });
  };

  const handleSave = () => {
    // In a real app, this would send data to backend
    // For now, visualize feedback and go back
    if (navigator.vibrate) navigator.vibrate(50);
    navigate('/pro-selection');
  };

  const resetStats = () => {
     if(window.confirm("Deseja zerar toda a pontuação desta partida?")) {
        setCounts({});
     }
  };

  return (
    <div className="flex flex-col h-full min-h-screen w-full bg-background-dark relative">
       {/* Background */}
       <div className="absolute inset-0 bg-mesh-pattern opacity-30 pointer-events-none"></div>

      {/* Header */}
      <header className="flex items-center p-4 pt-6 pb-2 justify-between sticky top-0 z-30 bg-background-dark/95 backdrop-blur-md border-b border-white/5">
        <button 
          onClick={() => navigate('/pro-selection')} 
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-dark hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-white">arrow_back</span>
        </button>
        
        <div className="flex flex-col items-center">
             <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Scouts da Partida</span>
             <div className="flex items-center gap-2 bg-surface-dark/50 px-3 py-1 rounded-full border border-white/5">
                 <div className="size-6 rounded-full overflow-hidden border border-white/10 relative bg-white/5">
                     {avatar ? (
                         <img src={avatar} alt={name} className="w-full h-full object-cover" />
                     ) : (
                         <div className="w-full h-full flex items-center justify-center">
                             <span className="material-symbols-outlined text-xs text-slate-400">person</span>
                         </div>
                     )}
                 </div>
                 <span className="text-white text-sm font-bold">{name}</span>
             </div>
        </div>

        <button 
          onClick={resetStats}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-dark hover:bg-white/10 transition-colors text-danger"
          title="Zerar"
        >
          <span className="material-symbols-outlined">restart_alt</span>
        </button>
      </header>

      {/* Score Dashboard */}
      <div className="px-6 py-6 z-10 sticky top-[72px] bg-background-dark/95 backdrop-blur-md border-b border-white/5 shadow-lg">
          <div className="flex flex-col items-center justify-center gap-2">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Pontuação Parcial</span>
              <div className="relative">
                 <h1 className={`text-6xl font-black tracking-tighter transition-all duration-300 ${totalScore < 0 ? 'text-danger' : totalScore > 0 ? 'text-primary' : 'text-white'}`}>
                    {totalScore.toFixed(1)}
                 </h1>
                 {totalScore !== 0 && (
                     <span className={`absolute -right-6 top-0 text-lg font-bold ${totalScore < 0 ? 'text-danger' : 'text-primary'}`}>
                         pts
                     </span>
                 )}
              </div>
          </div>
      </div>

      {/* Tabs */}
      <div className="flex p-4 gap-4 z-10">
         <button 
           onClick={() => setActiveTab('attack')}
           className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border ${activeTab === 'attack' ? 'bg-primary text-background-dark border-primary shadow-[0_0_15px_rgba(19,236,91,0.3)]' : 'bg-surface-dark text-slate-400 border-white/5'}`}
         >
            Ataque
         </button>
         <button 
           onClick={() => setActiveTab('defense')}
           className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border ${activeTab === 'defense' ? 'bg-blue-500 text-white border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-surface-dark text-slate-400 border-white/5'}`}
         >
            Defesa
         </button>
      </div>

      <main className="flex-1 flex flex-col gap-3 px-4 pb-28 overflow-y-auto no-scrollbar z-10">
         {SCOUT_RULES.filter(r => r.type === activeTab).map((rule) => {
             const count = counts[rule.id] || 0;
             return (
                 <div key={rule.id} className="flex items-center justify-between p-4 bg-surface-dark border border-white/5 rounded-2xl">
                     <div className="flex flex-col flex-1">
                         <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-sm">{rule.label}</span>
                            {rule.description && (
                                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300">{rule.description}</span>
                            )}
                         </div>
                         <span className={`text-xs font-bold mt-1 ${rule.isNegative ? 'text-red-400' : 'text-green-400'}`}>
                             {rule.points > 0 ? '+' : ''}{rule.points} pts
                         </span>
                     </div>
                     
                     <div className="flex items-center gap-3 bg-background-dark rounded-full p-1 border border-white/10">
                         <button 
                           onClick={() => updateCount(rule.id, -1)}
                           disabled={count === 0}
                           className="size-8 rounded-full flex items-center justify-center bg-white/5 text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
                         >
                             <span className="material-symbols-outlined text-lg">remove</span>
                         </button>
                         <span className={`text-lg font-bold min-w-[20px] text-center ${count > 0 ? 'text-white' : 'text-slate-600'}`}>
                             {count}
                         </span>
                         <button 
                           onClick={() => updateCount(rule.id, 1)}
                           className={`size-8 rounded-full flex items-center justify-center transition-colors shadow-lg ${rule.isNegative ? 'bg-danger text-white hover:bg-red-600 shadow-danger/20' : 'bg-primary text-background-dark hover:bg-green-500 shadow-primary/20'}`}
                         >
                             <span className="material-symbols-outlined text-lg">add</span>
                         </button>
                     </div>
                 </div>
             );
         })}
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background-dark via-background-dark to-transparent z-20">
        <button 
          onClick={handleSave}
          className="w-full bg-primary text-primary-content font-bold text-lg rounded-full py-4 shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          Salvar Pontuação
          <span className="material-symbols-outlined text-xl">save</span>
        </button>
      </div>
    </div>
  );
};

export default ScoutsPerformanceScreen;