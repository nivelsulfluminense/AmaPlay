import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const ForgotPasswordScreen = () => {
  const navigate = useNavigate();
  const { resetPassword, isLoading, clearError } = useUser();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  React.useEffect(() => {
    clearError();
  }, [clearError]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim()) return;

    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: any) {
      setLocalError(err.message || 'Erro ao enviar email de recuperação');
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background-dark">
      {/* Background */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none mix-blend-overlay">
        <div
          className="w-full h-full bg-cover bg-center"
          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCwVBdYdRgxZGweShWI5oX_h4nRIi_9npm71jy4WJRpTdjnSwomR2A281nN3Kb-lvpcKdwNvRgC3PAC4QbLl7m7Lfh6G6EJ7cwQ3g1cju9PIhpBPICvytw1GDXaQ3P8WGcMzggFZl_pmddAkjjYplVxCAswVfb_vue-AxfliEaI_4LTsOiILwCFrFu6jCXBMOSxCU6jbAUIliRpERHXb8f5-RIzgQqsSHFqiEkxTqtK7tb8eo622IDutw-1o7gqJ4Gc8E3e-lo8eDk')" }}
        ></div>
      </div>

      <header className="relative z-10 flex items-center p-4 pt-6 pb-2 justify-between">
        <button onClick={() => navigate('/')} className="text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="size-10"></div>
      </header>

      <div className="relative z-10 w-full px-6 py-8 flex flex-col flex-1 max-w-md mx-auto">
        <div className="flex justify-center mb-8">
          <div className="flex items-center justify-center size-24 rounded-full bg-surface-dark border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden p-4">
            <img src="/assets/logo/amafut_logo.png" alt="AmaFut Logo" className="w-full h-full object-contain" />
          </div>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-3">Recuperar Senha</h1>
          <p className="text-slate-400 text-base leading-relaxed">
            {!sent
              ? "Informe o e-mail associado à sua conta e enviaremos um link para você redefinir sua senha."
              : "Verifique sua caixa de entrada. Enviamos um link de recuperação para o e-mail informado."
            }
          </p>
        </div>

        {localError && (
          <div className="w-full mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500">error</span>
            <p className="text-red-200 text-sm font-medium leading-tight">{localError}</p>
          </div>
        )}

        {!sent ? (
          <form className="w-full flex flex-col gap-6" onSubmit={handleResetPassword}>
            <div className="space-y-1">
              <label className="text-white text-sm font-semibold ml-1" htmlFor="email">E-mail</label>
              <div className="relative group">
                <input
                  id="email"
                  type="email"
                  placeholder="exemplo@amafut.com"
                  className="w-full h-14 bg-surface-dark border border-white/10 rounded-xl pl-12 pr-4 text-white placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined">mail</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full h-14 font-bold text-lg rounded-xl shadow-[0_4px_20px_rgba(19,236,91,0.3)] transition-all duration-200 flex items-center justify-center gap-2 
                ${isLoading
                  ? 'bg-surface-dark border border-white/10 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-primary hover:bg-[#0fd650] active:scale-[0.98] text-background-dark'}`}
            >
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                <span>ENVIAR LINK</span>
              )}
            </button>
          </form>
        ) : (
          <div className="w-full flex flex-col gap-4">
            <div className="p-5 rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center gap-3 text-center">
              <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-2xl">check_circle</span>
              </div>
              <p className="text-sm text-slate-300">E-mail enviado com sucesso! Se não encontrar, verifique a caixa de spam.</p>
            </div>

            <button
              onClick={() => navigate('/')}
              className="w-full h-14 bg-surface-dark border border-white/10 hover:bg-white/5 active:scale-[0.98] text-white font-bold text-lg rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mt-4"
            >
              <span>VOLTAR AO LOGIN</span>
            </button>
            <button
              onClick={() => { setSent(false); clearError(); setLocalError(null); }}
              className="text-primary text-sm font-medium hover:underline p-2 mx-auto"
            >
              Tentar outro e-mail
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordScreen;