import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

/**
 * useAuthRedirect Hook
 * 
 * Implements "Smart Routing" logic for the AmaFut application.
 * Ensures users are always on the correct page based on their profile data and lifecycle state.
 */
export const useAuthRedirect = () => {
    const {
        userId,
        teamId,
        intendedRole,
        isInitialized,
        role,
        name,
        avatar,
        position,
        isApproved,
        isFirstManager, // 🔑 Crucial for determinar o primeiro criador do time
        isSetupComplete // 🔑 CRITICAL: Use a flag do banco em vez de cálculo manual
    } = useUser();

    const navigate = useNavigate();
    const location = useLocation();
    const [isRedirecting, setIsRedirecting] = useState(false);

    const navigateTo = useCallback((path: string) => {
        if (location.pathname === path) return;
        setIsRedirecting(true);
        navigate(path);
        setTimeout(() => setIsRedirecting(false), 300);
    }, [location.pathname, navigate]);

    useEffect(() => {
        // 0. Aguarda inicialização
        if (!isInitialized) return;

        // 1. Logado?
        if (!userId) {
            const publicRoutes = ['/', '/register-account', '/forgot-password', '/reset-password'];
            if (!publicRoutes.includes(location.pathname)) {
                navigateTo('/');
            }
            return;
        }

        const currentPath = location.pathname;
        let idealPath = '';

        // 📊 ANÁLISE PROFUNDA DO PERFIL (Para suportar usuários novos e antigos)

        // A. Tem Função Definida? (Ignora 'authenticated' padrão do supabase)
        // const hasRole = (role && role !== 'authenticated') && role !== 'player' || (intendedRole && intendedRole !== 'authenticated');

        // B. Tem Time?
        const hasTeam = !!teamId;

        // C. Tem Dados de Perfil? (Consideramos "Completo" se tiver Nome real, Posição e Foto)
        const hasProfileData =
            (name && name !== 'Visitante') &&
            !!position &&
            !!avatar;

        // D. Setup está marcado como completo no banco?
        const isOfficiallyComplete = isSetupComplete;

        // E. Tem papel válido?
        const validRole = (role && role !== 'authenticated') || (intendedRole && intendedRole !== 'authenticated');

        // 🚀 DECISÃO DE ROTEAMENTO

        // CASO 1: USUÁRIO COMPLETO (Oficial ou Legado)
        // Se tiver tudo preenchido OU a flag oficial true, vai pro Dashboard.
        if (isOfficiallyComplete || (validRole && hasTeam && hasProfileData)) {
            // Define o destino final
            const dashboardTarget = (isApproved || isFirstManager) ? '/dashboard' : '/pre-dash';

            // Se tentar ir para a raiz, manda pro dashboard
            if (currentPath === '/') {
                navigateTo(dashboardTarget);
                return;
            }

            // Bloqueia volta para onboarding
            const onboardingRoutes = ['/register-role', '/register-team', '/register-privacy', '/register-profile'];
            if (onboardingRoutes.includes(currentPath)) {
                navigateTo(dashboardTarget);
            }
            return;
        }

        // CASO 2: USUÁRIO INCOMPLETO (Fluxo Sequencial)

        // Etapa 1: Função
        if (!validRole) {
            idealPath = '/register-role';
        }
        // Etapa 2: Time
        else if (!hasTeam) {
            idealPath = '/register-team';
        }
        // Etapa 3: Dados Finais (Privacidade -> Perfil)
        else {
            if (currentPath === '/register-profile') {
                idealPath = '/register-profile';
            } else {
                idealPath = '/register-privacy';
            }
        }

        // Exceção: Permitir visualização de stats para autenticados
        if (currentPath === '/player-stats') return;

        // Executar redirecionamento se necessário
        if (idealPath && currentPath !== idealPath) {
            if (currentPath === '/register-privacy' && idealPath === '/register-profile') return;
            navigateTo(idealPath);
        }

    }, [userId, role, intendedRole, teamId, name, position, avatar, isSetupComplete, isApproved, isFirstManager, location.pathname, navigateTo]);

    return { isRedirecting };
};
