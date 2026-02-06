import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { supabase, Profile } from '../services/supabase';

export type Role = 'presidente' | 'vice-presidente' | 'admin' | 'player' | null;

interface TeamDetails {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  logo: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'promotion_invite' | 'general_alert';
  title: string;
  message: string;
  data: any;
  status: 'pending' | 'accepted' | 'rejected' | 'read';
  created_at: string;
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
  deleteAccount: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;

  // Team Management
  createTeam: (details: TeamDetails) => Promise<string>;
  joinTeam: (teamId: string) => Promise<void>;
  updateMemberRole: (targetUserId: string, targetCurrentRole: Role, newRole: Role) => Promise<boolean>;
  approveMember: (memberId: string) => Promise<boolean>;
  rejectMember: (memberId: string) => Promise<boolean>;
  removeMember: (memberId: string) => Promise<boolean>;

  // Promotions & Notifications
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  promoteMember: (targetUserId: string, newRole: Role) => Promise<void>;
  respondToPromotion: (notificationId: string, accept: boolean) => Promise<void>;

  // Status
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  clearError: () => void;
  intendedRole: Role;
  setIntendedRole: (role: Role) => Promise<void>;
  heartTeam: string | null;
  position: 'GOL' | 'ZAG' | 'MEI' | 'ATA' | null;
  isApproved: boolean; // Agora booleano
  isPro: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  // User state
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRoleState] = useState<Role>(null);
  const [intendedRole, setIntendedRoleState] = useState<Role>(null);
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
  const [isApproved, setIsApprovedState] = useState(false);
  const [isPro, setIsProState] = useState(false);
  const [isFirstManager, setIsFirstManager] = useState(false);
  const [stats, setStatsState] = useState({
    pace: 50, shooting: 50, passing: 50, dribbling: 50, defending: 50, physical: 50
  });
  const [ovr, setOvrState] = useState(50);
  const [heartTeam, setHeartTeamState] = useState<string | null>(null);
  const [position, setPositionState] = useState<'GOL' | 'ZAG' | 'MEI' | 'ATA' | null>(null);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lógica auxiliar para aplicar dados do perfil em vários estados de forma eficiente
  const applyUserData = (userData: any) => {
    if (!userData) return;

    setUserId(userData.id || userData.userId || null);
    setEmail(userData.email || '');
    setNameState(userData.name || userData.full_name || 'Visitante');

    // 🛡️ SEGURANÇA: Ignorar o papel padrão "authenticated" do Supabase Auth
    // Queremos apenas os papéis personalizados da nossa tabela 'profiles'.
    if (userData.is_first_manager) {
      setRoleState('presidente');
    } else if (userData.role && userData.role !== 'authenticated') {
      setRoleState(userData.role);
    }

    setAvatarState(userData.avatar || null);
    setCardAvatarState(userData.card_avatar || null);
    // 🛡️ SEGURANÇA: Garante que team_id seja aplicado INDEPENDENTE de detalhes do time
    const dbTeamId = userData.team_id || userData.teamId || null;
    setTeamIdState(dbTeamId);

    // Prioridade máxima para a flag do banco
    const dbIsSetupComplete = !!userData.is_setup_complete;
    setIsSetupComplete(dbIsSetupComplete);

    setIsApprovedState(!!userData.is_approved);
    setIsProState(!!userData.is_pro);
    setIsFirstManager(!!userData.is_first_manager);

    // Status para compatibilidade com telas de aguardando aprovação
    const currentStatus = userData.status || (userData.is_approved ? 'approved' : 'pending');
    setStatus(currentStatus as any);

    if (userData.intended_role && userData.intended_role !== 'authenticated') {
      setIntendedRoleState(userData.intended_role as Role);
    }
    if (userData.stats) setStatsState(userData.stats);
    if (userData.ovr) setOvrState(userData.ovr);
    if (userData.heart_team) setHeartTeamState(userData.heart_team);
    if (userData.position) setPositionState(userData.position);

    const rawTeamDetails = userData.teamDetails;
    if (rawTeamDetails) {
      // Lida com objeto ou array vindo do join do Supabase
      const details = Array.isArray(rawTeamDetails) ? rawTeamDetails[0] : rawTeamDetails;
      if (details) {
        setTeamDetailsState({
          name: details.name || '',
          primaryColor: details.primary_color || '#13ec5b',
          secondaryColor: details.secondary_color || '#ffffff',
          logo: details.logo || null
        });
      }
    } else if (dbTeamId) {
      // Caso crítico: Tem ID mas não veio detalhes (join falhou ou não feito)
      // Vamos tentar manter o estado limpo ou buscar depois, mas o ID já está setado.
      console.warn('⚠️ UserContext: team_id existe mas teamDetails veio vazio. O ID foi preservado.');
    }
  };

  const isProcessingRef = React.useRef(false);
  const lastSessionId = React.useRef<string | null>(null);

  // Inicializa a partir da sessão do Supabase
  useEffect(() => {
    let mounted = true;

    // Escuta mudanças no estado de autenticação (Login, Logout, User Updated)
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        resetState();
        setIsInitialized(true);
        lastSessionId.current = null;
        return;
      }

      const currentSessionId = session?.user?.id || null;

      if (session?.user) {
        // Checking for session change using Ref to avoid stale closure issues
        const sessionChanged = currentSessionId !== lastSessionId.current;
        const needsProfile = lastSessionId.current === null;

        if (sessionChanged || needsProfile || event === 'USER_UPDATED') {
          // IMPORTANT: Only set isInitialized(false) if we truly have no data 
          // to avoid "hanging" or "flashing" the loader on tab switches.
          // If we already have a session recorded and it's the same, don't show the global loader.
          if (needsProfile || sessionChanged) {
            setIsInitialized(false);
          }

          // Prevent duplicate requests
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;

          try {
            const fullProfile = await authService.getFullProfile(session.user.id);
            if (fullProfile && mounted) {
              applyUserData(fullProfile);
              lastSessionId.current = currentSessionId;
            }
          } catch (err) {
            console.error('Erro ao buscar perfil na mudança de auth:', err);
          } finally {
            if (mounted) {
              setIsInitialized(true);
              isProcessingRef.current = false;
            }
          }
        } else {
          // If session hasn't changed and we already have it, just make sure we are initialized
          setIsInitialized(true);
        }
      } else {
        setIsInitialized(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Executa apenas uma vez na montagem


  const resetState = () => {
    setUserId(null);
    setEmail('');
    setRoleState(null);
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
    setIsSetupComplete(false);
    setIsApprovedState(false);
    setIsProState(false);
    setIsFirstManager(false);
    setHeartTeamState(null);
    setPositionState(null);
    setError(null);
  };

  const setRole = async (newRole: Role) => {
    // Por solicitação: todos começam como 'player' na coluna role para evitar bloqueios de RLS,
    // mas salvamos o papel pretendido (intended_role) para o fluxo de aprovação.
    setIntendedRoleState(newRole);

    if (userId) {
      try {
        await authService.updateProfile({ intended_role: newRole });
      } catch (err) {
        console.error('Erro ao atualizar papel pretendido:', err);
      }
    }
  };

  const setIntendedRole = setRole; // Mapeia ambos para clareza no uso

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
        // 🔑 FLOWCHART: Setup completo = fim do cadastro (Dados do Atleta)
        // Status JÁ foi definido no createTeam/joinTeam
        // Aqui só marcamos que o onboarding acabou
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            is_setup_complete: true
            // ❌ NÃO alteramos status aqui! Já foi definido antes
          })
          .eq('id', userId);

        if (profileError) throw profileError;
      } catch (err) {
        console.error('Error marking setup complete:', err);
      }
    }
  };

  const login = async (emailInput: string, pass: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const userRaw = await authService.login(emailInput, pass);
      // 🛡️ FIX: Busca o perfil completo (com team_id) antes de atualizar o estado
      // Evita sobrescrever teamId com null por usar apenas o objeto de Auth
      const fullProfile = await authService.getFullProfile(userRaw.id);
      if (fullProfile) {
        applyUserData(fullProfile);
        return fullProfile;
      }
      return userRaw;
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
      // Register já retorna o perfil construído manualmente no authService
      // mas vamos garantir buscando o fullProfile para consistência e incluir teamDetails se houver
      const userRaw = await authService.register(emailInput, pass, nameInput);

      const fullProfile = await authService.getFullProfile(userRaw.id);
      if (fullProfile) {
        applyUserData(fullProfile);
        return fullProfile;
      }

      applyUserData(userRaw);
      return userRaw;
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

  const deleteAccount = async () => {
    setIsLoading(true);
    setError(null); // Limpa erros anteriores
    try {
      const { error: rpcError } = await supabase.rpc('delete_own_account');
      if (rpcError) throw rpcError;

      await authService.logout();
      resetState();
    } catch (err: any) {
      console.error('Erro ao excluir conta:', err);
      const message = err.message || 'Erro ao excluir conta';
      setError(message);
      throw err;
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

    // Autenticação de função: Se criar time, assume cargo de gestão
    let effectiveRole = (role && role !== 'player' && role !== 'authenticated') ? role : intendedRole;

    // Se não for pres/vice, promove automaticamente para Presidente ao criar time
    if (effectiveRole !== 'presidente' && effectiveRole !== 'vice-presidente') {
      effectiveRole = 'presidente';
    }


    setIsLoading(true);
    setError(null);

    try {
      // 🛡️ GARANTIA DE INTEGRIDADE: Força a criação do perfil antes do time
      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: userId,
        email: email,
        name: name || 'Presidente',
        role: effectiveRole,
        intended_role: effectiveRole,
        is_approved: true,
        is_setup_complete: false
      }, { onConflict: 'id' });

      if (upsertError) {
        console.error('Erro ao garantir perfil:', upsertError);
        throw new Error(`Não foi possível validar seu perfil de gestor: ${upsertError.message}`);
      }

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

      // 🔑 FLOWCHART: Criar time = Auto-Aprova Pres/Vice
      // MAS ainda não marca setup_complete (falta Privacidade + Perfil)
      setIsApprovedState(true);
      setIsFirstManager(true);
      setRoleState(effectiveRole);
      setStatus('approved');

      await authService.updateProfile({
        is_approved: true,
        status: 'approved',
        is_first_manager: true,
        role: effectiveRole,
        team_id: data.id,
        is_setup_complete: true
      });

      // Mark that team now has a first manager
      await supabase.from('teams').update({ has_first_manager: true }).eq('id', data.id);

      // 🔑 Popula tabela team_members, evitando duplicações
      await supabase.from('team_members').upsert({
        team_id: data.id,
        profile_id: userId,
        role: effectiveRole,
        is_team_approved: true
      }, { onConflict: 'team_id,profile_id' });


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
      const effectiveRole = (role && role !== 'player') ? role : intendedRole;

      // Check if team has any approved members
      const { count: approvedCount, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', id)
        .eq('is_approved', true);

      if (countError) console.error('Error checking team members:', countError);

      // 🔑 CRITICAL: Se o time não tem ninguém aprovado, vira Presidente independente da intenção
      const isAbandoned = approvedCount === 0;
      const isManagerCandidate = (effectiveRole === 'presidente' || effectiveRole === 'vice-presidente');
      const shouldBecomeFirstManager = isManagerCandidate || isAbandoned;

      // 🔑 FLOWCHART: Buscar Time
      // - Se virou 1° gestor ou time está abandonado: aprovado como Presidente
      // - Se Admin/Jogador em time ativo: status = pending
      const newRole = shouldBecomeFirstManager ? (isAbandoned ? 'presidente' : effectiveRole) : 'player';
      const newStatus = shouldBecomeFirstManager ? 'approved' : 'pending';

      await authService.updateProfile({
        team_id: id,
        is_approved: shouldBecomeFirstManager,
        status: newStatus as any,
        is_first_manager: shouldBecomeFirstManager,
        role: newRole,
        intended_role: effectiveRole,
        is_setup_complete: false
      });

      // Recarrega o perfil para garantir que pegamos as decisões do banco (triggers)
      const fullProfile = await authService.getFullProfile(userId);
      if (fullProfile) {
        applyUserData(fullProfile);
      }

      // 🔑 Popula ou atualiza a tabela team_members 
      // Usamos os dados do perfil recarregado
      const finalRole = fullProfile?.role || newRole;
      const finalIsApproved = fullProfile?.is_approved || shouldBecomeFirstManager;

      await supabase.from('team_members').upsert({
        team_id: id,
        profile_id: userId,
        role: finalRole as any,
        is_team_approved: finalIsApproved
      }, { onConflict: 'team_id,profile_id' });

      if (finalIsApproved) {
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
      setIsApprovedState(shouldBecomeFirstManager);
      setIsFirstManager(shouldBecomeFirstManager);
      setRoleState(newRole);
      setStatus(newStatus as any);

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

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', targetUserId);

      if (profileError) throw profileError;

      // 🔑 Sync with team_members
      if (teamId) {
        await supabase
          .from('team_members')
          .update({ role: newRole })
          .eq('team_id', teamId)
          .eq('profile_id', targetUserId);
      }

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
        .select('intended_role, role, team_id')
        .eq('id', memberId)
        .single();

      const intended = memberData?.intended_role;
      // 🛡️ SECURITY: Prevent 'authenticated' role from leaking
      const finalRole = (intended && intended !== 'authenticated') ? (intended as Role) : (memberData?.role || 'player');
      const mTeamId = memberData?.team_id;

      // Enforce "Only One" rule during approval if they intended to be Pres/VP
      if (finalRole === 'presidente' || finalRole === 'vice-presidente') {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('team_id', teamId)
          .eq('role', finalRole)
          .eq('status', 'approved')
          .neq('id', memberId) // Don't count the member themselves if they are already approved (though they shouldn't be)
          .limit(1);

        if (existing && existing.length > 0) {
          setError(`Não é possível aprovar como ${finalRole}, pois já existe um ocupando este cargo. Mude a função dele primeiro.`);
          return false;
        }
      }

      // 1. Atualiza aprovação e define o cargo pretendido no Perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          is_approved: true,
          status: 'approved',
          role: finalRole,
          intended_role: null // 🧹 Limpa cargo pretendido pois já foi aprovado
        })
        .eq('id', memberId);

      if (profileError) throw profileError;

      // 2. Sincronização com a tabela team_members - atualizando cargo e aprovação
      if (mTeamId) {
        await supabase
          .from('team_members')
          .upsert({
            team_id: mTeamId,
            profile_id: memberId,
            role: finalRole,
            is_team_approved: true
          }, { onConflict: 'team_id,profile_id' });
      }

      // 3. Increment team member count
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

  const removeMember = async (memberId: string): Promise<boolean> => {
    if (!userId) return false;

    // Permission check
    if (role !== 'presidente' && role !== 'vice-presidente') {
      setError('Apenas Presidentes ou Vice-Presidentes podem remover membros.');
      return false;
    }

    try {
      // 1. Get member team info
      const { data: memberData } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', memberId)
        .single();

      const mTeamId = memberData?.team_id;

      // 2. Update profile: clear team_id and set status back to pending
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          team_id: null,
          status: 'pending', // Volta para o limbo de busca de time
          is_approved: false,
          role: 'player', // Volta a ser jogador comum
          intended_role: null
        })
        .eq('id', memberId);

      if (profileError) throw profileError;

      // 3. Remove from team_members
      if (mTeamId) {
        await supabase
          .from('team_members')
          .delete()
          .eq('team_id', mTeamId)
          .eq('profile_id', memberId);
      }

      return true;
    } catch (err: any) {
      console.error('Error removing member:', err);
      setError(err.message || 'Erro ao remover membro');
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
      // 1. Get member team info
      const { data: memberData } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', memberId)
        .single();

      const mTeamId = memberData?.team_id;

      // 2. Update profile: clear team_id and set status to rejected
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          team_id: null,
          status: 'rejected',
          is_approved: false,
          intended_role: null // Limpa o cargo pretendido ao rejeitar
        })
        .eq('id', memberId);

      if (profileError) throw profileError;

      // 3. Remove from team_members
      if (mTeamId) {
        await supabase
          .from('team_members')
          .delete()
          .eq('team_id', mTeamId)
          .eq('profile_id', memberId);
      }

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

  // --- NOTIFICATIONS & PROMOTION LOGIC ---

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => n.status === 'pending' || n.status === 'read').length || 0); // Simplified count
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [userId]);

  const promoteMember = async (targetUserId: string, newRole: Role) => {
    if (!userId || !teamId) return;

    // Apenas Presidente/Vice podem promover
    if (role !== 'presidente' && role !== 'vice-presidente') {
      throw new Error('Permissão insuficiente para promover membros.');
    }

    try {
      // Cria notificação para o usuário alvo
      const { error } = await supabase.from('notifications').insert({
        user_id: targetUserId,
        type: 'promotion_invite',
        title: 'Você recebeu uma promoção!',
        message: `Você foi convidado para assumir o cargo de ${newRole?.toUpperCase()}. Aceita o desafio?`,
        data: { new_role: newRole, promoter_name: name, team_id: teamId },
        status: 'pending'
      });

      if (error) throw error;
      // Não atualiza role diretamente - espera aceite
    } catch (err: any) {
      console.error('Error prompting promotion:', err);
      throw new Error(err.message || 'Erro ao enviar convite de promoção');
    }
  };

  const respondToPromotion = async (notificationId: string, accept: boolean) => {
    try {
      if (!accept) {
        // Apenas rejeita
        await supabase
          .from('notifications')
          .update({ status: 'rejected' })
          .eq('id', notificationId);

        // Atualiza estado local
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, status: 'rejected' } : n));
        return;
      }

      // Se aceitar, chama a RPC segura
      const { data, error } = await supabase.rpc('confirm_promotion', {
        notification_id: notificationId
      });

      if (error) throw error;

      if (data && data.success) {
        // Atualiza estado local se for o próprio usuário (deve ser)
        setRoleState(data.new_role as Role);
        setIntendedRoleState(data.new_role as Role);

        // Atualiza notificações locais
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, status: 'accepted' } : n));

        // Se virou presidente/vice, pode precisar recarregar infos do time ou membros, 
        // mas o RLS deve se ajustar automaticamente na próxima query
      } else {
        throw new Error(data?.error || 'Erro desconhecido ao processar promoção');
      }

    } catch (err: any) {
      console.error('Error responding to promotion:', err);
      throw new Error(err.message || 'Erro ao processar resposta');
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
    isApproved, // Added missing export
    isPro,
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
    removeMember,
    notifications,
    unreadCount,
    fetchNotifications,
    promoteMember,
    respondToPromotion,
    deleteAccount,
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
    isSetupComplete, status, isFirstManager, isApproved, isPro, intendedRole, heartTeam, position, isLoading, isInitialized, error,
    notifications, unreadCount
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