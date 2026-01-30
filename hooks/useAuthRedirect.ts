import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

/**
 * useAuthRedirect Hook
 * 
 * Implements "Smart Routing" logic for the AmaPlay application.
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
        position,
        status,
        isFirstManager, // 🔑 Crucial for determining first team creator
        isSetupComplete // 🔑 CRITICAL: Use DB flag instead of manual calculation
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
        // 1. GUARD: Only run once initialized
        if (!isInitialized) {
            return;
        }

        // 2. GUARD: No user logged in → Login Screen (unless already on a public page)
        if (!userId) {
            const publicRoutes = ['/', '/register-account', '/forgot-password', '/reset-password'];
            if (!publicRoutes.includes(location.pathname)) {
                navigateTo('/');
            }
            return;
        }

        // 3. FLOWCHART-BASED NAVIGATION LOGIC

        const currentPath = location.pathname;

        // ✅ Use DB flag instead of manual calculation
        const hasSetupComplete = isSetupComplete;

        let idealPath = '';

        // ONBOARDING FLOW (Setup NOT complete)
        if (!hasSetupComplete) {
            // Step 1: Selecionar Função
            if (!intendedRole || (role === 'player' && !intendedRole)) {
                idealPath = '/register-role';
            }
            // Step 2: Criar/Buscar Time
            else if (!teamId) {
                idealPath = '/register-team';
            }
            // Step 3: Privacidade (MANDATORY after team)
            else if (currentPath !== '/register-privacy' && currentPath !== '/register-profile') {
                // If we have team but haven't been to privacy yet, go there
                // We'll assume they've been to privacy if they're on profile screen
                const hasVisitedPrivacy = currentPath === '/register-profile' || (!!name && name !== 'Visitante');
                if (!hasVisitedPrivacy) {
                    idealPath = '/register-privacy';
                } else {
                    // Step 4: Dados do Atleta
                    if (!name || name === 'Visitante' || !position) {
                        idealPath = '/register-profile';
                    }
                }
            }
            // If on privacy screen, that's fine (don't redirect)
            else if (currentPath === '/register-privacy') {
                idealPath = '/register-privacy';
            }
            // Step 4: Dados do Atleta
            else if (!name || name === 'Visitante' || !position) {
                idealPath = '/register-profile';
            }
        }


        // SETUP COMPLETE - Verificar Status
        if (hasSetupComplete) {
            // 🔑 REGRA CRÍTICA DO FLUXOGRAMA:
            // - Primeiro Pres/Vice que CRIA o time (isFirstManager=true) → Dashboard direto
            // - Todos os demais (mesmo Pres/Vice que ENTRAM depois) → Pre-Dash até aprovação

            if (status === 'approved' || isFirstManager) {
                // Aprovado OU primeiro gestor que criou o time
                idealPath = '/dashboard';
            }
            else if (status === 'pending') {
                // Aguardando aprovação (Admin/Jogador ou Pres/Vice que entrou depois)
                idealPath = '/pre-dash';
            }
            // Fallback
            else {
                idealPath = '/dashboard';
            }
        }

        // Exception: Allow /player-stats for authenticated users
        if (currentPath === '/player-stats') return;

        // FORCED REDIRECTIONS
        const onboardingRoutes = ['/register-role', '/register-team', '/register-privacy', '/register-profile', '/pre-dash'];
        const isAtOnboarding = onboardingRoutes.includes(currentPath);

        // Scenario A: User on login page while authenticated
        if (currentPath === '/') {
            navigateTo(idealPath);
            return;
        }

        // Scenario B: User on dashboard but should be elsewhere
        if (currentPath === '/dashboard' && idealPath !== '/dashboard') {
            navigateTo(idealPath);
            return;
        }

        // Scenario C: User on wrong onboarding step
        if (isAtOnboarding && currentPath !== idealPath && idealPath !== '') {
            // Exception: Allow register-privacy as valid if that's current path
            // (don't bounce between privacy and profile)
            if (currentPath === '/register-privacy' && idealPath === '/register-profile') {
                return; // Stay on privacy, user hasn't clicked continue yet
            }

            navigateTo(idealPath);
        }

        // Scenario D: User finished setup but lingering in onboarding
        if (hasSetupComplete && isAtOnboarding) {
            navigateTo(idealPath);
        }

    }, [userId, teamId, intendedRole, isInitialized, location.pathname, navigateTo, role, name, position, status, isFirstManager, isSetupComplete]);


    return { isRedirecting };
};
