import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useAuthRedirect } from '../hooks/useAuthRedirect';

const LoginScreen = () => {
  const navigate = useNavigate();
  const {
    login,
    loginWithGoogle,
    loginWithApple,
    isLoading,
    error,
    clearError,
    isInitialized,
    userId
  } = useUser();

  // 🔑 Enable smart routing after login
  useAuthRedirect();


  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Internal state for UI feedback
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isValid = email.trim().length > 0 && password.trim().length > 0;

  useEffect(() => {
    // Check for email confirmation success in URL
    const fullUrl = window.location.href;
    if (fullUrl.includes('type=signup') || fullUrl.includes('account_confirmed')) {
      setSuccessMessage('E-mail confirmado com sucesso! Agora você pode entrar na sua conta.');
      if (window.history.replaceState) {
        const cleanPath = window.location.pathname;
        window.history.replaceState(null, '', cleanPath + '#/');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isLoading) return;

    setLocalError(null);
    clearError();

    try {
      await login(email, password);
    } catch (err: any) {
      setLocalError(err.message || "Falha no login");
      if (navigator.vibrate) navigator.vibrate(200);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setLocalError(null);
    try {
      if (provider === 'google') await loginWithGoogle();
      else await loginWithApple();
    } catch (err: any) {
      setLocalError(err.message || `Falha ao entrar com ${provider}`);
    }
  };

  // Do not render anything while initializing or if already logged in (let redirect work)
  if (!isInitialized || userId) return null;

  return (
    <div className="relative flex min-h-screen w-full flex-col justify-center overflow-hidden bg-background-dark">
      {/* Background Texture */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none mix-blend-overlay">
        <div
          className="w-full h-full bg-cover bg-center"
          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCwVBdYdRgxZGweShWI5oX_h4nRIi_9npm71jy4WJRpTdjnSwomR2A281nN3Kb-lvpcKdwNvRgC3PAC4QbLl7m7Lfh6G6EJ7cwQ3g1cju9PIhpBPICvytw1GDXaQ3P8WGcMzggFZl_pmddAkjjYplVxCAswVfb_vue-AxfliEaI_4LTsOiILwCFrFu6jCXBMOSxCU6jbAUIliRpERHXb8f5-RIzgQqsSHFqiEkxTqtK7tb8eo622IDutw-1o7gqJ4Gc8E3e-lo8eDk')" }}
        ></div>
      </div>

      <div className="relative z-10 w-full px-6 py-8 flex flex-col items-center max-w-md mx-auto">
        {/* Logo Section */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="flex items-center justify-center size-24 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm shadow-[0_0_30px_rgba(19,236,91,0.2)] overflow-hidden p-2">
            <img src="/assets/logo/amafut_logo.png" alt="AmaFut Logo" className="w-full h-full object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white font-display">AmaFut</h1>
            <p className="text-text-muted mt-2 text-sm font-light">Entre você também para o nosso time.</p>
            <p className="text-text-muted text-xs font-bold uppercase tracking-[0.2em] mt-1 opacity-80">Nunca foi só futebol</p>
          </div>
        </div>

        {/* Messaging Banners */}
        {(error || localError) && (
          <div className="w-full mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <span className="material-symbols-outlined text-red-500 shrink-0">error</span>
            <p className="text-red-200 text-sm font-medium leading-tight">{error || localError}</p>
          </div>
        )}

        {successMessage && (
          <div className="w-full mb-6 bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <span className="material-symbols-outlined text-primary shrink-0">check_circle</span>
            <p className="text-primary text-sm font-medium leading-tight">{successMessage}</p>
          </div>
        )}

        {/* Login Form */}
        <form className="w-full flex flex-col gap-5" onSubmit={handleLogin}>
          <div className="space-y-1">
            <label className="sr-only" htmlFor="email">E-mail</label>
            <div className="relative group">
              <input
                id="email"
                type="email"
                placeholder="exemplo@amafut.com"
                className="w-full h-14 bg-input-bg border border-input-border rounded-xl pl-12 pr-4 text-white placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined">mail</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="sr-only" htmlFor="password">Senha</label>
            <div className="relative group">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full h-14 bg-input-bg border border-input-border rounded-xl pl-12 pr-12 text-white placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined">lock</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1"
              >
                <span className="material-symbols-outlined text-xl">
                  {showPassword ? "visibility" : "visibility_off"}
                </span>
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-text-muted text-sm hover:text-primary transition-colors font-medium"
            >
              Esqueci minha senha
            </button>
          </div>

          <button
            type="submit"
            disabled={!isValid || isLoading}
            className={`w-full h-14 font-bold text-lg rounded-xl flex items-center justify-center gap-2 transition-all duration-200 
                            ${isValid && !isLoading
                ? 'bg-primary text-background-dark hover:bg-[#0fd650] active:scale-[0.98] shadow-glow'
                : 'bg-surface-dark border border-white/10 text-slate-500 cursor-not-allowed'}`}
          >
            {isLoading ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <>
                <span>ENTRAR</span>
                <span className="material-symbols-outlined text-xl font-bold">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        {/* Social Login Section */}
        <div className="flex items-center w-full py-8 gap-4">
          <div className="h-px bg-white/10 flex-1"></div>
          <span className="text-xs uppercase tracking-wider text-slate-500">ou entre com</span>
          <div className="h-px bg-white/10 flex-1"></div>
        </div>

        <div className="grid grid-cols-2 w-full gap-4 mb-8">
          <button
            onClick={() => handleSocialLogin('google')}
            disabled={isLoading}
            className="h-12 bg-input-bg border border-input-border hover:bg-input-border/50 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="text-sm font-medium text-white">Google</span>
          </button>
          <button
            onClick={() => handleSocialLogin('apple')}
            disabled={isLoading}
            className="h-12 bg-input-bg border border-input-border hover:bg-input-border/50 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <span className="text-sm font-medium text-white">Apple</span>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-text-muted text-sm">
            Ainda não faz parte?
            <button
              onClick={() => navigate('/register-account')}
              className="text-primary font-bold hover:underline decoration-2 underline-offset-4 ml-1.5 transition-all"
            >
              Crie sua conta
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;