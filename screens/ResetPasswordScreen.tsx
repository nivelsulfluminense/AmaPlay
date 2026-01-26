import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const ResetPasswordScreen = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // UI Logic
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            // Wait a moment for Supabase to process the hash fragment
            await new Promise(resolve => setTimeout(resolve, 500));

            const session = await authService.getSession();
            if (!session) {
                // Determine error from URL if possible
                const fullUrl = window.location.href;
                if (fullUrl.includes('error_description')) {
                    const params = new URLSearchParams(fullUrl.includes('#') ? fullUrl.split('#')[1] : fullUrl.split('?')[1]);
                    const desc = params.get('error_description');
                    setError(desc ? decodeURIComponent(desc).replace(/\+/g, ' ') : 'O link de recuperação expirou ou é inválido.');
                } else {
                    setError('Sessão inválida. Por favor, solicite um novo link de recuperação.');
                }
            } else {
                // Valid session! Clean URL to be safe
                if (window.history.replaceState) {
                    const cleanPath = window.location.pathname;
                    window.history.replaceState(null, '', cleanPath + '#/reset-password');
                }
            }
            setCheckingSession(false);
        };
        checkSession();
    }, []);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setLoading(true);
        try {
            await authService.updatePassword(password);

            // Force logout to ensure they log in with new credentials
            await authService.logout();

            setSuccess(true);
            setTimeout(() => navigate('/'), 3000);
        } catch (err: any) {
            setError(err.message || 'Erro ao redefinir a senha.');
        } finally {
            setLoading(false);
        }
    };

    if (checkingSession) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background-dark">
                <div className="flex flex-col items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
                    <p className="text-slate-400">Verificando link...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-background-dark px-6 py-12 items-center justify-center relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none mix-blend-overlay">
                <div
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCwVBdYdRgxZGweShWI5oX_h4nRIi_9npm71jy4WJRpTdjnSwomR2A281nN3Kb-lvpcKdwNvRgC3PAC4QbLl7m7Lfh6G6EJ7cwQ3g1cju9PIhpBPICvytw1GDXaQ3P8WGcMzggFZl_pmddAkjjYplVxCAswVfb_vue-AxfliEaI_4LTsOiILwCFrFu6jCXBMOSxCU6jbAUIliRpERHXb8f5-RIzgQqsSHFqiEkxTqtK7tb8eo622IDutw-1o7gqJ4Gc8E3e-lo8eDk')" }}
                ></div>
            </div>

            <div className="w-full max-w-sm relative z-10">
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-extrabold text-white mb-2">Nova Senha</h1>
                    <p className="text-slate-400">Defina sua nova senha de acesso.</p>
                </div>

                {success ? (
                    <div className="bg-primary/20 border border-primary text-primary p-6 rounded-2xl text-center flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
                        <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                            <span className="material-symbols-outlined text-4xl">check_circle</span>
                        </div>
                        <p className="font-bold text-xl">Senha Redefinida!</p>
                        <p className="text-sm opacity-90">Você será redirecionado para o login em instantes.</p>
                    </div>
                ) : (
                    <form className="flex flex-col gap-6" onSubmit={handleReset}>
                        {(error) && (
                            <div className="w-full bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3">
                                <span className="material-symbols-outlined text-red-500">error</span>
                                <p className="text-red-200 text-sm font-medium leading-tight">{error}</p>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-300 ml-1">Nova Senha</label>
                            <div className="relative group">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="w-full bg-surface-dark border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1"
                                >
                                    <span className="material-symbols-outlined text-lg">
                                        {showPassword ? "visibility" : "visibility_off"}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-300 ml-1">Confirmar Senha</label>
                            <div className="relative group">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    className="w-full bg-surface-dark border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1"
                                >
                                    <span className="material-symbols-outlined text-lg">
                                        {showConfirmPassword ? "visibility" : "visibility_off"}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !!error} // Disable if critical error (like invalid session)
                            className="w-full bg-primary text-background-dark font-bold py-4 rounded-xl shadow-lg shadow-primary/20 mt-4 flex items-center justify-center gap-2 hover:bg-[#0fd650] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                            {loading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : 'Redefinir Senha'}
                        </button>
                    </form>
                )}

                {/* Back Link if session error */}
                {error && (
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => navigate('/forgot-password')}
                            className="text-primary font-bold hover:underline"
                        >
                            Solicitar novo link
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResetPasswordScreen;
