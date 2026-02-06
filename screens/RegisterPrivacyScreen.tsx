import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const RegisterPrivacyScreen = () => {
  const navigate = useNavigate();
  const { role } = useUser();
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleBack = () => {
    // Se for Presidente, volta para a tela de criar time.
    // Caso contrário (Admin, Vice, Player), volta para a seleção de função.
    if (role === 'presidente') {
      navigate('/register-team');
    } else {
      navigate('/register-role');
    }
  };

  return (
    <div className="flex h-full min-h-screen w-full flex-col bg-mesh-pattern">
      {/* Header with Back Button */}
      <div className="flex items-center p-4 pt-6 pb-2 justify-between z-10">
        <button onClick={handleBack} className="text-white flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-dark/50 hover:bg-white/10 transition-colors shadow-sm">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="size-10"></div>
      </div>

      {/* Progress Section */}
      <div className="flex flex-col items-center justify-center px-6 pb-2 z-10">
        <div className="flex w-full max-w-sm flex-row items-center justify-between gap-2 mb-3">
          <div className="h-1.5 flex-1 rounded-full bg-primary/80"></div>
          <div className="h-1.5 flex-1 rounded-full bg-primary/80"></div>
          <div className="h-1.5 flex-1 rounded-full bg-primary shadow-[0_0_10px_rgba(19,236,91,0.5)]"></div>
        </div>
        <p className="text-primary text-sm font-semibold tracking-wide uppercase">Etapa 3 de 3</p>
      </div>

      <main className="flex-1 w-full max-w-md mx-auto flex flex-col px-6 pb-32 overflow-y-auto no-scrollbar z-10">
        <div className="mb-2 mt-2">
          <h1 className="text-white text-[32px] font-bold leading-tight tracking-tight">Quase lá!</h1>
          <p className="text-slate-400 text-base font-normal leading-relaxed mt-3">
            Configure sua privacidade e aceite os termos para finalizar seu cadastro no AmaFut.
          </p>
        </div>

        <div className="mt-8">
          <h3 className="text-white text-lg font-bold leading-tight mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">visibility</span>
            Quem pode ver seu perfil?
          </h3>
          <div className="flex flex-col gap-3">
            <label
              className={`group relative flex items-start gap-4 rounded-2xl border bg-surface-dark p-4 cursor-pointer transition-all hover:shadow-lg ${privacy === 'public' ? 'border-primary bg-surface-dark/80' : 'border-[#326744] hover:border-primary/50'}`}
              onClick={() => setPrivacy('public')}
            >
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-base font-semibold ${privacy === 'public' ? 'text-white' : 'text-slate-300'}`}>Público</p>
                  <span className={`material-symbols-outlined ${privacy === 'public' ? 'text-primary' : 'text-[#92c9a4]'}`}>public</span>
                </div>
                <p className="text-[#92c9a4] text-sm leading-normal">Qualquer pessoa pode ver suas estatísticas e histórico de jogos.</p>
              </div>
              <input
                checked={privacy === 'public'}
                onChange={() => setPrivacy('public')}
                className="mt-1 h-5 w-5 border-2 border-[#326744] bg-transparent text-primary focus:ring-offset-0 focus:ring-0 checked:border-primary checked:bg-none checked:before:bg-primary"
                name="privacy"
                type="radio"
              />
            </label>

            <label
              className={`group relative flex items-start gap-4 rounded-2xl border bg-surface-dark p-4 cursor-pointer transition-all hover:shadow-lg ${privacy === 'private' ? 'border-primary bg-surface-dark/80' : 'border-[#326744] hover:border-primary/50'}`}
              onClick={() => setPrivacy('private')}
            >
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-base font-semibold ${privacy === 'private' ? 'text-white' : 'text-slate-300'}`}>Privado</p>
                  <span className={`material-symbols-outlined ${privacy === 'private' ? 'text-primary' : 'text-[#92c9a4]'}`}>lock</span>
                </div>
                <p className="text-[#92c9a4] text-sm leading-normal">Apenas membros dos seus times confirmados podem ver seu perfil completo.</p>
              </div>
              <input
                checked={privacy === 'private'}
                onChange={() => setPrivacy('private')}
                className="mt-1 h-5 w-5 border-2 border-[#326744] bg-transparent text-primary focus:ring-offset-0 focus:ring-0 checked:border-primary checked:bg-none"
                name="privacy"
                type="radio"
              />
            </label>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-white text-lg font-bold leading-tight mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">notifications</span>
            Preferências
          </h3>
          <div className="flex items-center justify-between rounded-2xl border border-[#326744] bg-surface-dark p-4">
            <div className="flex flex-col">
              <p className="text-white text-base font-medium">Alertas de Jogos</p>
              <p className="text-[#92c9a4] text-xs">Receber convites e lembretes via push</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input defaultChecked className="sr-only peer" type="checkbox" />
              <div className="w-11 h-6 rounded-full peer bg-[#326744] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

        <div className="mt-8 mb-4">
          <label className="flex items-start gap-3 p-2 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                className="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border-2 border-[#326744] bg-transparent transition-all checked:border-primary checked:bg-primary hover:border-primary focus:ring-0 focus:ring-offset-0"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <span className="material-symbols-outlined absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-background-dark opacity-0 transition-opacity peer-checked:opacity-100 text-[18px] font-bold">check</span>
            </div>
            <div className="flex flex-col text-sm text-slate-300 select-none">
              <span>
                Eu li e concordo com os <a className="text-primary font-medium hover:underline" href="#">Termos de Uso</a> e a <a className="text-primary font-medium hover:underline" href="#">Política de Privacidade</a>.
              </span>
            </div>
          </label>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-background-dark via-background-dark to-transparent pt-12">
        <div className="max-w-md mx-auto w-full">
          <button
            onClick={() => navigate('/register-profile')}
            disabled={!termsAccepted}
            className={`w-full h-14 rounded-full transition-all flex items-center justify-center gap-2 group ${termsAccepted
                ? 'bg-primary hover:bg-green-400 active:scale-[0.98] shadow-[0_4px_20px_rgba(19,236,91,0.3)] cursor-pointer'
                : 'bg-surface-dark border border-white/10 text-slate-500 cursor-not-allowed opacity-60'
              }`}
          >
            <span className={`text-lg font-bold tracking-tight ${termsAccepted ? 'text-background-dark' : 'text-slate-500'}`}>Concluir Cadastro</span>
            <span className={`material-symbols-outlined transition-transform ${termsAccepted ? 'text-background-dark group-hover:translate-x-1' : 'text-slate-500'}`}>arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterPrivacyScreen;