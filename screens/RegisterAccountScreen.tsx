import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const RegisterScreen = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useUser();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user types
    if (localError) setLocalError(null);
    if (error) clearError();
  };

  const validateForm = () => {
    // Clear previous errors
    setLocalError(null);

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setLocalError('Por favor, insira um e-mail válido');
      return false;
    }



    // Password validation
    if (formData.password.length < 6) {
      setLocalError('A senha deve ter pelo menos 6 caracteres');
      return false;
    }

    // Password match validation
    if (formData.password !== formData.confirmPassword) {
      setLocalError('As senhas não coincidem');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      // Call register function from UserContext
      await register(formData.email, formData.password);

      // Success message
      setSuccessMessage('Conta criada com sucesso! Verifique seu e-mail para confirmar sua conta.');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (err: any) {
      console.error('Registration error:', err);

      // Handle Supabase specific errors
      if (err.message?.includes('User already registered')) {
        setLocalError('Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.');
      } else if (err.message?.includes('Invalid email')) {
        setLocalError('Formato de e-mail inválido');
      } else if (err.message?.includes('weak_password')) {
        setLocalError('A senha é muito fraca. Use pelo menos 6 caracteres com letras e números');
      } else {
        setLocalError(err.message || 'Erro ao criar conta. Tente novamente.');
      }
    }
  };

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
          <div className="flex items-center justify-center size-20 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm shadow-[0_0_30px_rgba(19,236,91,0.2)] overflow-hidden p-2">
            <img src="/assets/logo/amafut_logo.png" alt="AmaFut Logo" className="w-full h-full object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white font-display">AmaFut</h1>
            <p className="text-text-muted mt-2 text-sm font-light">Crie sua conta para começar a jogar</p>
          </div>
        </div>

        {/* Error/Success Messages */}
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

        {/* Registration Form */}
        <form className="w-full flex flex-col gap-5" onSubmit={handleSubmit}>


          {/* Email Field */}
          <div className="space-y-1">
            <label className="sr-only" htmlFor="email">E-mail</label>
            <div className="relative group">
              <input
                id="email"
                name="email"
                type="email"
                placeholder="exemplo@amafut.com"
                className="w-full h-14 bg-input-bg border border-input-border rounded-xl pl-12 pr-4 text-white placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                required
                autoComplete="email"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined">mail</span>
              </div>
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1">
            <label className="sr-only" htmlFor="password">Senha</label>
            <div className="relative group">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Crie uma senha (mínimo 6 caracteres)"
                className="w-full h-14 bg-input-bg border border-input-border rounded-xl pl-12 pr-12 text-white placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                required
                autoComplete="new-password"
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

          {/* Confirm Password Field */}
          <div className="space-y-1">
            <label className="sr-only" htmlFor="confirmPassword">Confirmar Senha</label>
            <div className="relative group">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirme sua senha"
                className="w-full h-14 bg-input-bg border border-input-border rounded-xl pl-12 pr-12 text-white placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
                required
                autoComplete="new-password"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined">lock_reset</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1"
              >
                <span className="material-symbols-outlined text-xl">
                  {showConfirmPassword ? "visibility" : "visibility_off"}
                </span>
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          <div className="text-xs text-text-muted space-y-1">
            <p className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">check_circle</span>
              Mínimo 6 caracteres
            </p>
            <p className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">check_circle</span>
              Letras e números recomendados
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !formData.email || !formData.password || !formData.confirmPassword}
            className={`w-full h-14 font-bold text-lg rounded-xl flex items-center justify-center gap-2 transition-all duration-200 
                        ${(!isLoading && formData.email && formData.password && formData.confirmPassword)
                ? 'bg-primary text-background-dark hover:bg-[#0fd650] active:scale-[0.98] shadow-glow'
                : 'bg-surface-dark border border-white/10 text-slate-500 cursor-not-allowed'}`}
          >
            {isLoading ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <>
                <span>CRIAR CONTA</span>
                <span className="material-symbols-outlined text-xl font-bold">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center w-full py-8 gap-4">
          <div className="h-px bg-white/10 flex-1"></div>
          <span className="text-xs uppercase tracking-wider text-slate-500">ou</span>
          <div className="h-px bg-white/10 flex-1"></div>
        </div>

        {/* Social Login */}
        <div className="grid grid-cols-2 w-full gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            disabled={isLoading}
            className="h-12 bg-input-bg border border-input-border hover:bg-input-border/50 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-white">login</span>
            <span className="text-sm font-medium text-white">Já tenho conta</span>
          </button>

          <button
            onClick={() => navigate('/')}
            disabled={isLoading}
            className="h-12 bg-input-bg border border-input-border hover:bg-input-border/50 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-white">home</span>
            <span className="text-sm font-medium text-white">Voltar</span>
          </button>
        </div>

        {/* Terms and Privacy */}
        <div className="text-center text-xs text-text-muted mt-8">
          <p className="mb-2">
            Ao criar uma conta, você concorda com nossos{' '}
            <a href="/terms" className="text-primary hover:underline">Termos de Serviço</a>
            {' '}e{' '}
            <a href="/privacy" className="text-primary hover:underline">Política de Privacidade</a>
          </p>
          <p>
            Já tem uma conta?{' '}
            <button
              onClick={() => navigate('/')}
              className="text-primary font-bold hover:underline decoration-2 underline-offset-4 transition-all"
            >
              Faça login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;