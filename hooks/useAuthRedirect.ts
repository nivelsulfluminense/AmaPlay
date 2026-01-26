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
        status
    } = useUser();

    const navigate = useNavigate();
    const location = useLocation();
    const [isRedirecting, setIsRedirecting] = useState(false);

    const navigateTo = useCallback((path: string) => {
        if (location.pathname === path) return;
        setIsRedirecting(true);
        navigate(path, { replace: true });
        setIsRedirecting(false);
    }, [location.pathname, navigate]);

    useEffect(() => {
        if (!isInitialized) return;
        if (isRedirecting) return;

        const currentPath = location.pathname;

        // 1. PUBLIC ROUTES (Always accessible)
        const publicRoutes = ['/', '/register-account', '/forgot-password', '/reset-password', '/player-stats'];
        const isPublicRoute = publicRoutes.includes(currentPath);

        // 2. AUTHENTICATION BARRIER
        if (!userId) {
            if (!isPublicRoute) {
                navigateTo('/');
            }
            return;
        }

        // 3. ONBOARDING & LIFECYCLE LOGIC (Sequential)

        const hasTeam = !!teamId;
        const hasRoleIntention = !!intendedRole || (role && role !== 'player');

        // Profile Data requires both name and position
        const hasProfileData = !!name && name !== 'Visitante' && !!position;

        const isManager = role === 'presidente' || role === 'vice-presidente' || intendedRole === 'presidente' || intendedRole === 'vice-presidente';
        const isPending = status === 'pending' && !isManager;

        let idealPath = '';

        if (!hasRoleIntention) {
            idealPath = '/register-role';
        } else if (!hasTeam) {
            idealPath = '/register-team';
        } else if (!hasProfileData) {
            idealPath = '/register-profile';
        } else if (isPending) {
            idealPath = '/pre-dash';
        } else {
            idealPath = '/dashboard';
        }

        // Global Exception: Manual navigation to /player-stats is allowed for any AUTH user too
        if (currentPath === '/player-stats') return;

        // Forced Redirections
        const onboardingRoutes = ['/register-role', '/register-team', '/register-privacy', '/register-profile', '/pre-dash'];
        const isAtOnboarding = onboardingRoutes.includes(currentPath);

        // Scenario A: User is on a "blocked" page (Home/Login) while authenticated
        if (currentPath === '/') {
            navigateTo(idealPath);
            return;
        }

        // Scenario B: User is on the Dashboard but lacks data or approval
        if (currentPath === '/dashboard' && idealPath !== '/dashboard') {
            navigateTo(idealPath);
            return;
        }

        // Scenario C: User is in the middle of onboarding but at the WRONG step
        if (isAtOnboarding && currentPath !== idealPath) {
            // Minor exception: allow /register-privacy as a valid alternate to /register-profile
            if (currentPath === '/register-privacy' && idealPath === '/register-profile') return;

            navigateTo(idealPath);
        }

        // Scenario D: User finished setup but is still lingering in onboarding
        if (!isAtOnboarding && currentPath !== '/dashboard' && !isPublicRoute) {
            // Allow other app routes like /finance, /inventory etc. through the ProtectedRoute guard in App.tsx
        }

    }, [userId, teamId, intendedRole, isInitialized, location.pathname, navigateTo, role, name, position, status, isRedirecting]);

    return { isRedirecting };
};
