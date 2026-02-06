import { supabase, Profile, Team } from './supabase';

/**
 * User usado no frontend
 * - teamDetails fica null no onboarding
 * - times serão carregados depois (team_members)
 */
export interface User extends Omit<Profile, 'created_at' | 'updated_at'> {
    token?: string;
    teamDetails?: Team | null;
}

export const authService = {
    /**
     * 🔹 CARREGA APENAS O PERFIL
     * ❌ SEM JOIN COM TEAMS
     * ✔️ Seguro com RLS
     * ✔️ Usa maybeSingle() para evitar erro em primeira tentativa
     */
    getFullProfile: async (userId: string): Promise<User | null> => {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.error('Erro ao carregar perfil:', error);
            return null;
        }

        if (!profile) {
            console.warn('Perfil não encontrado para:', userId);
            return null;
        }

        if (profile.team_id) {
            const { data: team } = await supabase
                .from('teams')
                .select('*')
                .eq('id', profile.team_id)
                .maybeSingle();

            return {
                ...profile,
                teamDetails: team || null
            };
        }

        return {
            ...profile,
            teamDetails: null
        };
    },

    /**
     * 🔐 LOGIN
     * ✔️ Usa getUser() antes de buscar perfil
     * ✔️ Usa maybeSingle() 
     * ✔️ Mensagens de erro distintas
     * ❌ SEM JOIN com teams no primeiro login
     */
    login: async (email: string, pass: string): Promise<any> => {
        // 1️⃣ Autenticar
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: pass
        });

        if (error) {
            console.error('❌ Erro de Autenticação:', error);

            // Mensagens de erro distintas
            if (error.message === 'Invalid login credentials') {
                throw new Error('E-mail ou senha incorretos.');
            } else if (error.message === 'Email not confirmed') {
                throw new Error('E-mail não confirmado. Verifique sua caixa de entrada.');
            }
            throw new Error(`Erro na autenticação: ${error.message}`);
        }

        if (!data.user || !data.session) {
            throw new Error('Sessão inválida. Por favor, tente novamente.');
        }

        console.log('✅ Autenticação básica ok para:', data.user.id);
        return {
            ...data.user,
            token: data.session.access_token
        };
    },


    /**
     * 📝 REGISTRO
     * ✔️ Perfil criado por TRIGGER no banco
     * ✔️ Apenas leitura simples após signup
     */
    register: async (email: string, password: string, name?: string) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: name || '',
                        full_name: name || ''
                    },
                    emailRedirectTo: `${window.location.origin}/?type=signup`
                }
            });

            if (error) throw error;
            if (!data.user) throw new Error('Erro ao criar usuário.');

            // Pequena espera para o trigger finalizar com retentativas
            let profile = null;
            let profileError = null;

            for (let i = 0; i < 5; i++) {
                await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));

                const { data: p, error: pe } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                if (p) {
                    profile = p;
                    break;
                }
                profileError = pe;
                console.warn(`Tentativa ${i + 1} de carregar perfil falhou...`);
            }

            if (!profile) {
                console.error('Erro ao buscar perfil pós-registro:', profileError);
                throw new Error(
                    'O usuário foi criado, mas o perfil automátido demorou a responder. Por favor, tente fazer login para concluir.'
                );
            }

            return {
                id: profile.id,
                email: profile.email,
                name: profile.name,
                role: profile.role,
                intended_role: profile.intended_role,
                is_setup_complete: profile.is_setup_complete,
                is_approved: profile.is_approved,
                team_id: profile.team_id
            };
        } catch (error) {
            console.error('Erro no registro:', error);
            throw error;
        }
    },

    /**
     * 🚪 LOGOUT
     */
    logout: async () => {
        await supabase.auth.signOut();
    },

    /**
     * 🔑 SESSION (mantido por compatibilidade)
     */
    getSession: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session;
    },

    /**
     * 👤 USUÁRIO ATUAL
     */
    getCurrentUser: async (): Promise<Profile | null> => {
        const {
            data: { user }
        } = await supabase.auth.getUser();

        if (!user) return null;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Erro ao buscar perfil:', error);
            return null;
        }

        return profile;
    },

    /**
     * ✏️ ATUALIZAR PERFIL
     */
    updateProfile: async (updates: Partial<Profile>): Promise<Profile> => {
        const {
            data: { user }
        } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('Usuário não autenticado.');
        }

        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();

        if (error) throw new Error(error.message);

        return data;
    },

    /**
     * 🔁 RESET DE SENHA
     */
    resetPassword: async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/#/reset-password`
        });
        if (error) throw new Error(error.message);
    },

    /**
     * 🔒 ATUALIZAR SENHA
     */
    updatePassword: async (newPassword: string) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw new Error(error.message);
    },

    /**
     * 📧 ATUALIZAR EMAIL
     */
    updateEmail: async (newEmail: string) => {
        const { error } = await supabase.auth.updateUser({ email: newEmail });
        if (error) throw new Error(error.message);
    },

    /**
     * 🔐 LOGIN SOCIAL
     */
    signInWithGoogle: async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/#/dashboard`
            }
        });
        if (error) throw error;
    },

    signInWithApple: async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'apple',
            options: {
                redirectTo: `${window.location.origin}/#/dashboard`
            }
        });
        if (error) throw error;
    },

    signInWithFacebook: async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'facebook',
            options: {
                redirectTo: `${window.location.origin}/#/dashboard`
            }
        });
        if (error) throw error;
    },

    /**
     * 🔔 LISTENER DE AUTH
     */
    onAuthStateChange: (callback: (event: any, session: any) => void) => {
        return supabase.auth.onAuthStateChange(callback);
    }
};
