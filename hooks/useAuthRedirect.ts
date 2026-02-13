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

        // 🚀 DECISÃO DE ROTEAMENTO SIMPLIFICADA (Conforme solicitação)

        // Se o usuário já finalizou o setup (ou banco diz que sim)
        if (isSetupComplete || (validRole && hasTeam && hasProfileData)) {

            // 1. Aprovado ou Primeiro Gestor -> Dashboard
            if (isApproved || isFirstManager) {
                // Se estiver na raiz, login ou onboarding, vai pro Dashboard
                if (currentPath === '/' ||
                    ['/register-account', '/forgot-password', '/reset-password', '/register-role', '/register-team', '/register-privacy', '/register-profile', '/pre-dash'].includes(currentPath)) {
                    navigateTo('/dashboard');
                }
                return;
            }

            // 2. Não aprovado -> Pre-Dash
            else {
                // Se estiver tentando acessar áreas restritas ou raiz
                if (currentPath === '/' ||
                    currentPath.startsWith('/dashboard') ||
                    currentPath.startsWith('/agenda') ||
                    currentPath.startsWith('/finance') ||
                    currentPath.startsWith('/inventory') ||
                    ['/register-role', '/register-team', '/register-privacy', '/register-profile'].includes(currentPath)) {

                    if (currentPath !== '/pre-dash') {
                        navigateTo('/pre-dash');
                    }
                }
                return;
            }
        }

        // CASO 2: USUÁRIO INCOMPLETO (Fluxo Sequencial)
        if (!validRole) {
            idealPath = '/register-role';
        }
        else if (!hasTeam) {
            idealPath = '/register-team';
        }
        else {
            // Se já tem time mas não setupComplete, assume que falta finalizar cadastro
            if (currentPath !== '/register-profile' && currentPath !== '/register-privacy') {
                idealPath = '/register-privacy';
            } else {
                return; // Deixa o usuário navegar entre privacy e profile
            }
        }

        if (idealPath && currentPath !== idealPath) {
            navigateTo(idealPath);
        }

    }, [userId, role, intendedRole, teamId, name, position, avatar, isSetupComplete, isApproved, isFirstManager, location.pathname, navigateTo]);

    return { isRedirecting };
};
