import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/authService';
import { supabase, Profile } from '../services/supabase';

export type Role = 'presidente' | 'vice-presidente' | 'admin' | 'player';

interface TeamDetails {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  logo: string | null;
}

interface UserContextType {
  // User data
  userId: string | null;
  role: Role;
  setRole: (role: Role) => void;
  name: string;
  setName: (name: string) => void;
  email: string;
  avatar: string | null;
  setAvatar: (url: string | null) => void;
  cardAvatar: string | null;
  setCardAvatar: (url: string | null) => void;
  stats: {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
  };
  setStats: (stats: any) => Promise<void>;
  ovr: number;
  teamDetails: TeamDetails;
  setTeamDetails: (details: TeamDetails) => void;
  teamId: string | null;
  setTeamId: (id: string | null) => void;

  // Setup
  isSetupComplete: boolean;
  markSetupComplete: () => void;
  status: 'pending' | 'approved' | 'rejected';
  isFirstManager: boolean;

  // Auth
  login: (email: string, pass: string) => Promise<any>;
  register: (email: string, pass: string, name?: string) => Promise<any>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;

  // Team Management
  createTeam: (details: TeamDetails) => Promise<string>;
  joinTeam: (teamId: string) => Promise<void>;
  updateMemberRole: (targetUserId: string, targetCurrentRole: Role, newRole: Role) => Promise<boolean>;
  approveMember: (memberId: string) => Promise<boolean>;
  rejectMember: (memberId: string) => Promise<boolean>;

  // Status
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  clearError: () => void;
  intendedRole: Role;
  setIntendedRole: (role: Role) => Promise<void>;
  heartTeam: string | null;
  position: 'GOL' | 'ZAG' | 'MEI' | 'ATA' | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  // User state
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRoleState] = useState<Role>('player');
  const [intendedRole, setIntendedRoleState] = useState<Role>('player');
  const [name, setNameState] = useState('Visitante');
  const [avatar, setAvatarState] = useState<string | null>(null);
  const [cardAvatar, setCardAvatarState] = useState<string | null>(null);
  const [teamId, setTeamIdState] = useState<string | null>(null);
  const [teamDetails, setTeamDetailsState] = useState<TeamDetails>({
    name: '',
    primaryColor: '#13ec5b',
    secondaryColor: '#ffffff',
    logo: null
  });
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [status, setStatusState] = useState<'pending' | 'approved' | 'rejected'>('approved');
  const [isFirstManager, setIsFirstManager] = useState(false);
  const [stats, setStatsState] = useState({
    pace: 50, shooting: 50, passing: 50, dribbling: 50, defending: 50, physical: 50
  });
  const [ovr, setOvrState] = useState(50);
  const [heartTeam, setHeartTeamState] = useState<string | null>(null);
  const [position, setPositionState] = useState<'GOL' | 'ZAG' | 'MEI' | 'ATA' | null>(null);

  // Auth states
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper logic to apply profile data to various states efficiently
  const applyUserData = (userData: any) => {
    console.log('UserContext applyUserData:', userData);
    if (!userData) return;

    setUserId(userData.id || userData.userId || null);
    setEmail(userData.email || '');
    setNameState(userData.name || userData.full_name || 'Visitante');
    setRoleState(userData.role || 'player');
    setAvatarState(userData.avatar || null);
    setCardAvatarState(userData.card_avatar || null);
    setTeamIdState(userData.team_id || null);
    setIsSetupComplete(!!userData.is_setup_complete);
    setStatusState(userData.status || 'approved');
    setIsFirstManager(!!userData.is_first_manager);

    if (userData.intended_role) setIntendedRoleState(userData.intended_role as Role);
    if (userData.stats) setStatsState(userData.stats);
    if (userData.ovr) setOvrState(userData.ovr);
    if (userData.heart_team) setHeartTeamState(userData.heart_team);
    if (userData.position) setPositionState(userData.position);

    if (userData.teamDetails) {
      setTeamDetailsState({
        name: userData.teamDetails.name,
        primaryColor: userData.teamDetails.primary_color,
        secondaryColor: userData.teamDetails.secondary_color,
        logo: userData.teamDetails.logo
      });
    }
  };

  // Initialize from Supabase session
  useEffect(() => {
    let mounted = true;
    let loadingRef = false;

    const initializeAuth = async () => {
      if (loadingRef) return;
      loadingRef = true;

      try {
        const session = await authService.getSession();
        if (session?.user && mounted) {
          const fullProfile = await authService.getFullProfile(session.user.id);
          if (fullProfile && mounted) {
            applyUserData(fullProfile);
          } else if (mounted) {
            setUserId(session.user.id);
            setEmail(session.user.email || '');
            if (session.user.user_metadata?.name) {
              setNameState(session.user.user_metadata.name);
            }
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        if (mounted) {
          setIsInitialized(true);
          loadingRef = false;
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        resetState();
        setIsInitialized(true);
        return;
      }

      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        // Prevent re-fetching if we are already loading or if we already have data
        // But if it's a new SIGNED_IN event, we should probably verify
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || (!userId && !loadingRef)) {
          // If we don't have user data yet, ensure we show the loader
          if (!userId || event === 'SIGNED_IN') {
            setIsInitialized(false);
          }

          loadingRef = true;
          try {
            const fullProfile = await authService.getFullProfile(session.user.id);
            if (fullProfile && mounted) {
              applyUserData(fullProfile);
            }
          } catch (err) {
            console.error('Error fetching profile on auth change:', err);
          } finally {
            if (mounted) {
              loadingRef = false;
              setIsInitialized(true);
            }
          }
        } else {
          setIsInitialized(true);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Only once


  const resetState = () => {
    setUserId(null);
    setEmail('');
    setRoleState('player');
    setNameState('Visitante');
    setAvatarState(null);
    setCardAvatarState(null);
    setTeamIdState(null);
    setTeamDetailsState({
      name: '',
      primaryColor: '#13ec5b',
      secondaryColor: '#ffffff',
      logo: null
    });
    setIsSetupComplete(false);
    setStatusState('approved');
    setIsFirstManager(false);
    setHeartTeamState(null);
    setPositionState(null);
  };

  const setRole = async (newRole: Role) => {
    // By request: everyone starts as player in role column to avoid blocks, 
    // but we save their intended role.
    setIntendedRoleState(newRole);

    if (userId) {
      try {
        await authService.updateProfile({ intended_role: newRole });
      } catch (err) {
        console.error('Error updating intended role:', err);
      }
    }
  };

  const setIntendedRole = setRole; // Map both for clarity

  const setName = async (newName: string) => {
    setNameState(newName);

    if (userId) {
      try {
        await authService.updateProfile({ name: newName });
      } catch (err) {
        console.error('Error updating name:', err);
      }
    }
  };

  const setAvatar = async (newAvatar: string | null) => {
    setAvatarState(newAvatar);

    if (userId) {
      try {
        await authService.updateProfile({ avatar: newAvatar });
      } catch (err) {
        console.error('Error updating avatar:', err);
      }
    }
  };

  const setCardAvatar = async (newAvatar: string | null) => {
    setCardAvatarState(newAvatar);

    if (userId) {
      try {
        await authService.updateProfile({ card_avatar: newAvatar });
      } catch (err) {
        console.error('Error updating card avatar:', err);
      }
    }
  };

  const setTeamId = async (newTeamId: string | null) => {
    setTeamIdState(newTeamId);

    if (userId) {
      try {
        await authService.updateProfile({ team_id: newTeamId });
      } catch (err) {
        console.error('Error updating team:', err);
      }
    }
  };

  const setTeamDetails = async (details: TeamDetails) => {
    setTeamDetailsState(details);

    // If we have a team, update it
    if (teamId) {
      try {
        await supabase
          .from('teams')
          .update({
            name: details.name,
            primary_color: details.primaryColor,
            secondary_color: details.secondaryColor,
            logo: details.logo
          })
          .eq('id', teamId);
      } catch (err) {
        console.error('Error updating team details:', err);
      }
    }
  };

  const markSetupComplete = async () => {
    setIsSetupComplete(true);

    if (userId) {
      try {
        const isManager = role === 'presidente' || role === 'vice-presidente';
        // Logic: Managers approved by default IF they are the first ones, 
        // Players/secondary managers wait.
        const finalStatus = (isManager || status === 'approved') ? 'approved' : 'pending';

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            is_setup_complete: true,
            status: finalStatus
          })
          .eq('id', userId);

        if (profileError) throw profileError;
        setStatusState(finalStatus);
      } catch (err) {
        console.error('Error marking setup complete:', err);
      }
    }
  };

  const login = async (emailInput: string, pass: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const user = await authService.login(emailInput, pass);
      applyUserData(user);
      return user;
    } catch (err: any) {
      const message = err.message || 'Erro ao fazer login';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (emailInput: string, pass: string, nameInput?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const user = await authService.register(emailInput, pass, nameInput);
      applyUserData(user);
      return user;
    } catch (err: any) {
      const message = err.message || 'Erro ao criar conta';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.signInWithGoogle();
    } catch (err: any) {
      const message = err.message || 'Erro ao entrar com Google';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithApple = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.signInWithApple();
    } catch (err: any) {
      const message = err.message || 'Erro ao entrar com Apple';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);

    try {
      await authService.logout();
      resetState();
    } catch (err: any) {
      console.error('Error logging out:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (emailInput: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.resetPassword(emailInput);
    } catch (err: any) {
      const message = err.message || 'Erro ao enviar email de recuperação';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createTeam = async (details: TeamDetails): Promise<string> => {
    if (!userId) throw new Error('Usuário não autenticado');

    // Autenticação de função: Apenas Presidente e Vice podem criar times
    // Check both current role and intendedRole (for new users)
    const effectiveRole = role !== 'player' ? role : intendedRole;
    if (effectiveRole !== 'presidente' && effectiveRole !== 'vice-presidente') {
      throw new Error('Apenas Presidentes ou Vice-Presidentes podem criar um novo time.');
    }


    setIsLoading(true);
    setError(null);

    try {
      const { data, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: details.name,
          primary_color: details.primaryColor,
          secondary_color: details.secondaryColor,
          logo: details.logo,
          creator_id: userId,
          member_count: 1
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Update user profile with team_id
      await setTeamId(data.id);
      setTeamDetailsState(details);

      // Criar time garante aprovação automática e promoção ao primeiro gestor
      setStatusState('approved');
      setIsFirstManager(true);
      setRoleState(effectiveRole);

      await authService.updateProfile({
        status: 'approved',
        is_first_manager: true,
        role: effectiveRole,
        team_id: data.id
      });

      // Mark that team now has a first manager
      await supabase.from('teams').update({ has_first_manager: true }).eq('id', data.id);


      return data.id;
    } catch (err: any) {
      console.error('Detailed Team Creation Error:', err);
      const message = err.message || (err.error_description) || 'Erro ao criar time';
      setError(`${message}${err.code ? ` (Cod: ${err.code})` : ''}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const joinTeam = async (id: string): Promise<void> => {
    if (!userId) throw new Error('Usuário não autenticado');
    setIsLoading(true);
    setError(null);
    try {
      const effectiveRole = role !== 'player' ? role : intendedRole;

      // Check if team already has a manager
      const { data: teamCheck } = await supabase
        .from('teams')
        .select('has_first_manager')
        .eq('id', id)
        .single();

      const isManagerCandidate = (effectiveRole === 'presidente' || effectiveRole === 'vice-presidente');
      const shouldBecomeFirstManager = isManagerCandidate && !teamCheck?.has_first_manager;

      const newStatus = shouldBecomeFirstManager ? 'approved' : 'pending';
      const newIsFirstManager = shouldBecomeFirstManager;
      const newRole = shouldBecomeFirstManager ? effectiveRole : 'player';

      await authService.updateProfile({
        team_id: id,
        status: newStatus,
        is_first_manager: newIsFirstManager,
        role: newRole,
        intended_role: effectiveRole
      });

      if (shouldBecomeFirstManager) {
        await supabase.from('teams').update({ has_first_manager: true }).eq('id', id);
      }


      // Fetch team details to update state
      const { data: team, error: teamFetchError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', id)
        .single();

      if (teamFetchError) throw teamFetchError;

      if (team) {
        setTeamDetailsState({
          name: team.name,
          primaryColor: team.primary_color,
          secondaryColor: team.secondary_color,
          logo: team.logo
        });
      }

      setTeamIdState(id);
      setStatusState(newStatus);
      setIsFirstManager(newIsFirstManager);
      setRoleState(newRole);

    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar entrada no time');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateMemberRole = async (targetUserId: string, targetCurrentRole: Role, newRole: Role): Promise<boolean> => {
    if (!userId) return false;

    // Permissions: Both President and VP can manage all roles
    const isPresident = role === 'presidente';
    const isVice = role === 'vice-presidente';

    if (!isPresident && !isVice) {
      setError('Apenas Presidentes ou Vice-Presidentes podem alterar funções.');
      return false;
    }

    try {
      // Enforce "Only One" for President and VP
      if (newRole === 'presidente' || newRole === 'vice-presidente') {
        // Find existing approved person in this role
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('team_id', teamId)
          .eq('role', newRole)
          .eq('status', 'approved')
          .neq('id', targetUserId)
          .limit(1);

        // If someone else exists, demote them to admin to make room for the "new" one
        if (existing && existing.length > 0) {
          await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', existing[0].id);
        }
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', targetUserId);

      if (updateError) throw updateError;

      if (targetUserId === userId) {
        setRoleState(newRole);
      }
      return true;
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar função');
      return false;
    }
  };

  const approveMember = async (memberId: string): Promise<boolean> => {
    if (!userId) return false;

    // Permission check: President or VP
    if (role !== 'presidente' && role !== 'vice-presidente') {
      setError('Apenas Presidentes ou Vice-Presidentes podem aprovar membros.');
      return false;
    }

    try {
      // Get member's intended role
      const { data: memberData } = await supabase
        .from('profiles')
        .select('intended_role, role')
        .eq('id', memberId)
        .single();

      const finalRole = memberData?.intended_role || memberData?.role || 'player';

      // Enforce "Only One" rule during approval if they intended to be Pres/VP
      if (finalRole === 'presidente' || finalRole === 'vice-presidente') {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('team_id', teamId)
          .eq('role', finalRole)
          .eq('status', 'approved')
          .limit(1);

        if (existing && existing.length > 0) {
          // If role is taken, we can't approve them as that role.
          setError(`Não é possível aprovar como ${finalRole}, pois já existe um ocupando este cargo. Mude a função dele primeiro.`);
          return false;
        }
      }

      // 1. Update status to approved and set their role to what they intended
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          status: 'approved',
          role: finalRole
        })
        .eq('id', memberId);

      if (updateError) throw updateError;

      // 2. Increment team member count
      if (teamId) {
        const { data: team } = await supabase
          .from('teams')
          .select('member_count')
          .eq('id', teamId)
          .single();

        if (team) {
          await supabase
            .from('teams')
            .update({ member_count: (team.member_count || 0) + 1 })
            .eq('id', teamId);
        }
      }

      return true;
    } catch (err: any) {
      console.error('Error approving member:', err);
      setError(err.message || 'Erro ao aprovar membro');
      return false;
    }
  };

  const rejectMember = async (memberId: string): Promise<boolean> => {
    if (!userId) return false;

    // Permission check
    if (role !== 'presidente' && role !== 'vice-presidente') {
      setError('Apenas Presidentes ou Vice-Presidentes podem rejeitar membros.');
      return false;
    }

    try {
      // Logic for rejection: clear team_id and set status back to approved (so they can join another team)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          team_id: null,
          status: 'rejected'
        })
        .eq('id', memberId);

      if (updateError) throw updateError;

      return true;
    } catch (err: any) {
      console.error('Error rejecting member:', err);
      setError(err.message || 'Erro ao rejeitar membro');
      return false;
    }
  };

  const clearError = () => setError(null);

  const setStats = async (newStats: any): Promise<void> => {
    if (!userId) return;
    try {
      const newOvr = Math.round(
        (newStats.pace + newStats.shooting + newStats.passing + newStats.dribbling + newStats.defending + newStats.physical) / 6
      );
      await authService.updateProfile({
        stats: newStats,
        ovr: newOvr
      });
      setStatsState(newStats);
      setOvrState(newOvr);
    } catch (err) {
      console.error('Error updating stats:', err);
    }
  };

  const value: UserContextType = React.useMemo(() => ({
    userId,
    role,
    setRole,
    name,
    setName,
    email,
    avatar,
    setAvatar,
    cardAvatar,
    setCardAvatar,
    stats,
    setStats,
    ovr,
    teamDetails,
    setTeamDetails,
    teamId,
    setTeamId,
    isSetupComplete,
    markSetupComplete,
    status,
    isFirstManager,
    login,
    register,
    loginWithGoogle,
    loginWithApple,
    logout,
    resetPassword,
    createTeam,
    joinTeam,
    updateMemberRole,
    approveMember,
    rejectMember,
    intendedRole,
    setIntendedRole,
    heartTeam,
    position,
    isLoading,
    isInitialized,
    error,
    clearError
  }), [
    userId, role, name, email, avatar, cardAvatar, stats, ovr, teamDetails, teamId,
    isSetupComplete, status, isFirstManager, intendedRole, heartTeam, position, isLoading, isInitialized, error
  ]);


  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};