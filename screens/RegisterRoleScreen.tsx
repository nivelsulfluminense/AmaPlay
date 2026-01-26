import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, Role } from '../contexts/UserContext';

const RegisterRoleScreen = () => {
  const navigate = useNavigate();
  const { setRole, isLoading: isContextLoading } = useUser();
  const [selectedRole, setSelectedRole] = useState<Role>('presidente');
  const [isLocalLoading, setIsLocalLoading] = useState(false);

  const isLoading = isContextLoading || isLocalLoading;

  const roles = [
    { id: 'presidente', title: 'Presidente', desc: 'Gestão total do time, financeiro e nomeação de cargos.', icon: 'assignment_ind' },
    { id: 'vice-presidente', title: 'Vice-Presidente', desc: 'Auxilia na gestão e pode assumir a presidência.', icon: 'supervisor_account' },
    { id: 'admin', title: 'Administrador', desc: 'Nomeado pelo presidente para organizar jogos e súmulas.', icon: 'admin_panel_settings' },
    { id: 'player', title: 'Jogador', desc: 'Confirmar presença, ver estatísticas e participar das votações.', icon: 'sports_soccer' },
  ];

  const handleContinue = async () => {
    if (isLoading) return;
    setIsLocalLoading(true);
    try {
      await setRole(selectedRole);

      const isManager = selectedRole === 'presidente' || selectedRole === 'vice-presidente';
      if (isManager) {
        navigate('/register-team');
      } else {
        navigate('/register-team');
      }
    } catch (err) {
      console.error('Erro ao salvar função:', err);
    } finally {
      setIsLocalLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-screen w-full flex-col">
      <header className="flex items-center justify-between p-4 pt-6 pb-2 z-10">
        <button onClick={() => navigate('/')} className="text-white flex size-10 shrink-0 items-center justify-center rounded-full active:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-tight">AmaPlay</h2>
        <div className="size-10"></div>
      </header>

      <div className="px-6 pt-4 pb-2">
        <span className="text-primary text-sm font-medium tracking-wider uppercase opacity-80 mb-2 block">Passo 1 de 3</span>
        <h1 className="text-white text-3xl font-bold leading-tight mb-3">Qual é a sua função?</h1>
        <p className="text-gray-400 text-base font-normal leading-relaxed">
          Selecione o perfil que melhor descreve seu papel no time para personalizar sua experiência.
        </p>
      </div>

      <main className="flex-1 flex flex-col gap-4 p-6 overflow-y-auto no-scrollbar pb-32">
        {roles.map((role) => (
          <label key={role.id} className="group relative cursor-pointer">
            <input
              type="radio"
              name="role"
              value={role.id}
              checked={selectedRole === role.id}
              onChange={() => setSelectedRole(role.id as Role)}
              className="peer sr-only"
            />
            <div className="relative flex items-center gap-4 rounded-xl bg-surface-dark dark:bg-[#192b20] p-5 shadow-lg border-2 border-transparent transition-all duration-200 peer-checked:border-primary peer-checked:bg-[#15231b]">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#2a4032] text-white transition-colors group-hover:bg-primary/20 group-hover:text-primary peer-checked:bg-primary peer-checked:text-background-dark">
                <span className="material-symbols-outlined text-[28px]">{role.icon}</span>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <h3 className="text-white text-lg font-bold leading-tight group-hover:text-primary transition-colors">{role.title}</h3>
                <p className="text-gray-400 text-sm font-normal leading-snug">{role.desc}</p>
              </div>
              <div className="size-6 rounded-full border-2 border-gray-600 flex items-center justify-center peer-checked:border-primary peer-checked:bg-primary transition-all">
                <span className="material-symbols-outlined text-[16px] text-background-dark opacity-0 peer-checked:opacity-100 font-bold">check</span>
              </div>
            </div>
          </label>
        ))}
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-dark via-background-dark to-transparent pt-12 z-20">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleContinue}
            disabled={isLoading}
            className={`w-full h-14 rounded-full flex items-center justify-center gap-2 transition-all duration-200 ${isLoading
                ? 'bg-surface-dark border border-white/10 text-slate-500'
                : 'bg-primary shadow-[0_0_20px_rgba(19,236,91,0.3)] hover:shadow-[0_0_30px_rgba(19,236,91,0.5)] active:scale-[0.98]'
              }`}
          >
            {isLoading ? (
              <span className="material-symbols-outlined animate-spin text-slate-500">progress_activity</span>
            ) : (
              <>
                <span className="text-background-dark text-lg font-bold tracking-wide">Continuar</span>
                <span className="material-symbols-outlined text-background-dark font-bold">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterRoleScreen;