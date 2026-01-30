import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { dataService } from '../services/dataService';
import { authService } from '../services/authService';
import { supabase } from '../services/supabase';

interface TeamMember {
    id: string;
    name: string;
    avatar: string;
    role: 'presidente' | 'vice-presidente' | 'admin' | 'player';
    status: 'pending' | 'approved' | 'rejected';
}

const SettingsScreen = () => {
    const navigate = useNavigate();
    const { role, name, email, userId, teamId, logout, updateMemberRole, removeMember } = useUser();
    const [activeTab, setActiveTab] = useState<'personal' | 'management'>('personal');

    // Personal Settings State
    const [isPublic, setIsPublic] = useState(true);
    const [newEmail, setNewEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    // Management State
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [promoteToRole, setPromoteToRole] = useState<'presidente' | 'vice-presidente' | 'admin'>('admin');

    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const isLeader = role === 'presidente' || role === 'vice-presidente';

    useEffect(() => {
        loadUserSettings();
        if (isLeader) {
            loadTeamMembers();
        }
    }, [isLeader]);

    const loadUserSettings = async () => {
        try {
            const profile = await authService.getCurrentUser();
            if (profile) {
                setIsPublic(profile.is_public || false);
                setNewEmail(profile.email || '');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const loadTeamMembers = async () => {
        if (!teamId) return;
        try {
            const players = await dataService.players.list();
            const members: TeamMember[] = players.map(p => ({
                id: p.id.toString(),
                name: p.name,
                avatar: p.avatar,
                role: p.role || 'player',
                status: (p as any).status || 'approved'
            }));
            setTeamMembers(members);
        } catch (error) {
            console.error('Error loading team members:', error);
        }
    };

    const handleUpdatePrivacy = async () => {
        setLoading(true);
        try {
            await authService.updateProfile({ is_public: isPublic });
            showSuccess('Privacidade atualizada com sucesso!');
        } catch (error: any) {
            showError(error.message || 'Erro ao atualizar privacidade');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateEmail = async () => {
        if (!newEmail || newEmail === email) {
            showError('Digite um novo email válido');
            return;
        }
        setLoading(true);
        try {
            await authService.updateEmail(newEmail);
            showSuccess('Email de confirmação enviado! Verifique sua caixa de entrada.');
        } catch (error: any) {
            showError(error.message || 'Erro ao atualizar email');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            showError('Preencha todos os campos de senha');
            return;
        }
        if (newPassword !== confirmPassword) {
            showError('As senhas não coincidem');
            return;
        }
        if (newPassword.length < 6) {
            showError('A senha deve ter pelo menos 6 caracteres');
            return;
        }
        setLoading(true);
        try {
            await authService.updatePassword(newPassword);
            showSuccess('Senha atualizada com sucesso!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            showError(error.message || 'Erro ao atualizar senha');
        } finally {
            setLoading(false);
        }
    };

    const handlePromoteMember = async () => {
        if (!selectedMember) return;
        setLoading(true);
        try {
            const success = await updateMemberRole(selectedMember.id, selectedMember.role, promoteToRole);

            if (success) {
                showSuccess(`${selectedMember.name} promovido(a) a ${promoteToRole}!`);
                setShowPromoteModal(false);
                setSelectedMember(null);
                await loadTeamMembers();
            }
        } catch (error: any) {
            showError(error.message || 'Erro ao promover membro');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async () => {
        if (!selectedMember) return;
        setLoading(true);
        try {
            const success = await removeMember(selectedMember.id);

            if (success) {
                showSuccess(`${selectedMember.name} removido(a) do time`);
                setShowRemoveModal(false);
                setSelectedMember(null);
                await loadTeamMembers();
            }
        } catch (error: any) {
            showError(error.message || 'Erro ao remover membro');
        } finally {
            setLoading(false);
        }
    };

    const showSuccess = (message: string) => {
        setSuccessMessage(message);
        setErrorMessage('');
        setTimeout(() => setSuccessMessage(''), 4000);
    };

    const showError = (message: string) => {
        setErrorMessage(message);
        setSuccessMessage('');
        setTimeout(() => setErrorMessage(''), 4000);
    };

    const getRoleBadgeColor = (memberRole: string) => {
        switch (memberRole) {
            case 'presidente': return 'bg-yellow-500';
            case 'vice-presidente': return 'bg-blue-500';
            case 'admin': return 'bg-purple-500';
            default: return 'bg-slate-500';
        }
    };

    const getRoleLabel = (memberRole: string) => {
        switch (memberRole) {
            case 'presidente': return 'Presidente';
            case 'vice-presidente': return 'Vice-Presidente';
            case 'admin': return 'Admin';
            default: return 'Jogador';
        }
    };

    return (
        <div className="bg-background-dark min-h-screen pb-24">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-background-dark/95 backdrop-blur-sm border-b border-white/5 p-4">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined text-white">arrow_back</span>
                    </button>
                    <h2 className="text-white text-lg font-bold leading-tight tracking-wide uppercase">Configurações</h2>
                    <div className="size-10"></div>
                </div>
            </div>

            {/* Tabs */}
            <div className="p-4">
                <div className="flex bg-surface-dark p-1 rounded-xl border border-white/5">
                    <button
                        onClick={() => setActiveTab('personal')}
                        className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'personal'
                            ? 'bg-primary text-background-dark'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <span className="material-symbols-outlined text-lg mb-1">person</span>
                        <div>Pessoal</div>
                    </button>
                    {isLeader && (
                        <button
                            onClick={() => setActiveTab('management')}
                            className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'management'
                                ? 'bg-primary text-background-dark'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <span className="material-symbols-outlined text-lg mb-1">admin_panel_settings</span>
                            <div>Gestão</div>
                        </button>
                    )}
                </div>
            </div>

            {/* Personal Settings Tab */}
            {activeTab === 'personal' && (
                <div className="p-4 space-y-6">
                    {/* Privacy Settings */}
                    <div className="bg-surface-dark rounded-2xl border border-white/5 p-6">
                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">lock</span>
                            Privacidade
                        </h3>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white font-medium">Perfil Público</p>
                                <p className="text-slate-400 text-sm">Permitir que outros vejam seu perfil</p>
                            </div>
                            <button
                                onClick={() => setIsPublic(!isPublic)}
                                className={`relative w-14 h-8 rounded-full transition-colors ${isPublic ? 'bg-primary' : 'bg-slate-600'
                                    }`}
                            >
                                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${isPublic ? 'translate-x-6' : ''
                                    }`}></div>
                            </button>
                        </div>
                        <button
                            onClick={handleUpdatePrivacy}
                            disabled={loading}
                            className="w-full mt-4 py-3 bg-primary text-background-dark font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Salvando...' : 'Salvar Privacidade'}
                        </button>
                    </div>

                    {/* Email Settings */}
                    <div className="bg-surface-dark rounded-2xl border border-white/5 p-6">
                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">email</span>
                            Email
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Email Atual</label>
                                <input
                                    type="email"
                                    value={email}
                                    disabled
                                    className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-slate-400"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Novo Email</label>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="Digite o novo email"
                                    className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary placeholder:text-slate-600"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleUpdateEmail}
                            disabled={loading}
                            className="w-full mt-4 py-3 bg-primary text-background-dark font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Atualizando...' : 'Atualizar Email'}
                        </button>
                    </div>

                    {/* Password Settings */}
                    <div className="bg-surface-dark rounded-2xl border border-white/5 p-6">
                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">key</span>
                            Senha
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Senha Atual</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Digite a senha atual"
                                    className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary placeholder:text-slate-600"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nova Senha</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Digite a nova senha"
                                    className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary placeholder:text-slate-600"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Confirmar Senha</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirme a nova senha"
                                    className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary placeholder:text-slate-600"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleUpdatePassword}
                            disabled={loading}
                            className="w-full mt-4 py-3 bg-primary text-background-dark font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Atualizando...' : 'Atualizar Senha'}
                        </button>
                    </div>

                    {/* Notifications */}
                    <div className="bg-surface-dark rounded-2xl border border-white/5 p-6">
                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">notifications</span>
                            Notificações
                        </h3>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white font-medium">Notificações Push</p>
                                <p className="text-slate-400 text-sm">Receber notificações de eventos e atualizações</p>
                            </div>
                            <button
                                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                                className={`relative w-14 h-8 rounded-full transition-colors ${notificationsEnabled ? 'bg-primary' : 'bg-slate-600'
                                    }`}
                            >
                                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${notificationsEnabled ? 'translate-x-6' : ''
                                    }`}></div>
                            </button>
                        </div>
                    </div>

                    {/* AmaPlay Pro Settings */}
                    <div className="bg-surface-dark rounded-2xl border border-white/5 p-6">
                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">military_tech</span>
                            AmaPlay Pro
                        </h3>
                        <p className="text-slate-400 text-sm mb-4">Gerencie sua participação no sistema de scouts profissional</p>

                        <div className="space-y-3">
                            <button
                                onClick={() => navigate('/scouts')}
                                className="w-full py-3 bg-primary/20 text-primary font-bold rounded-xl hover:bg-primary/30 transition-colors border border-primary/30 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">edit</span>
                                Atualizar Dados Pro
                            </button>
                            <button
                                onClick={() => {
                                    if (window.confirm('Tem certeza que deseja cancelar sua participação no AmaPlay Pro? Seus dados serão mantidos mas você não aparecerá mais nos scouts.')) {
                                        // TODO: Implement cancel Pro participation
                                        alert('Funcionalidade em desenvolvimento');
                                    }
                                }}
                                className="w-full py-3 bg-red-500/10 text-red-400 font-bold rounded-xl hover:bg-red-500/20 transition-colors border border-red-500/20"
                            >
                                Cancelar Participação Pro
                            </button>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-red-500/10 rounded-2xl border border-red-500/20 p-6">
                        <h3 className="text-red-500 font-bold text-lg mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined">warning</span>
                            Zona de Perigo
                        </h3>
                        <button
                            onClick={logout}
                            className="w-full py-3 bg-red-500/20 text-red-500 font-bold rounded-xl hover:bg-red-500/30 transition-colors border border-red-500/30"
                        >
                            Sair da Conta
                        </button>
                    </div>
                </div>
            )}

            {/* Management Tab */}
            {activeTab === 'management' && isLeader && (
                <div className="p-4 space-y-6">
                    <div className="bg-surface-dark rounded-2xl border border-white/5 p-6">
                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">groups</span>
                            Membros do Time
                        </h3>

                        <div className="space-y-3">
                            {teamMembers.map((member) => (
                                <div key={member.id} className="flex items-center gap-3 bg-background-dark p-4 rounded-xl border border-white/5">
                                    <div className="size-12 rounded-full overflow-hidden border-2 border-primary/30 shrink-0">
                                        <img src={member.avatar || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt={member.name} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white font-bold">{member.name}</p>
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold text-white ${getRoleBadgeColor(member.role)}`}>
                                            {getRoleLabel(member.role)}
                                        </span>
                                    </div>
                                    {member.id !== userId && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedMember(member);
                                                    setShowPromoteModal(true);
                                                }}
                                                className="p-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
                                                title="Promover"
                                            >
                                                <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedMember(member);
                                                    setShowRemoveModal(true);
                                                }}
                                                className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors"
                                                title="Remover"
                                            >
                                                <span className="material-symbols-outlined text-sm">person_remove</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Promote Modal */}
            {showPromoteModal && selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-surface-dark w-full max-w-md rounded-3xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-white font-bold text-xl mb-4">Promover Membro</h3>
                        <p className="text-slate-400 mb-6">Promover <span className="text-white font-bold">{selectedMember.name}</span> para:</p>

                        <div className="space-y-3 mb-6">
                            {role === 'presidente' && (
                                <>
                                    <button
                                        onClick={() => setPromoteToRole('presidente')}
                                        className={`w-full p-4 rounded-xl border-2 transition-all ${promoteToRole === 'presidente'
                                            ? 'border-yellow-500 bg-yellow-500/10'
                                            : 'border-white/10 bg-background-dark hover:border-white/20'
                                            }`}
                                    >
                                        <p className="text-white font-bold">Presidente</p>
                                        <p className="text-slate-400 text-sm">Controle total do time</p>
                                    </button>
                                    <button
                                        onClick={() => setPromoteToRole('vice-presidente')}
                                        className={`w-full p-4 rounded-xl border-2 transition-all ${promoteToRole === 'vice-presidente'
                                            ? 'border-blue-500 bg-blue-500/10'
                                            : 'border-white/10 bg-background-dark hover:border-white/20'
                                            }`}
                                    >
                                        <p className="text-white font-bold">Vice-Presidente</p>
                                        <p className="text-slate-400 text-sm">Gestão e organização</p>
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => setPromoteToRole('admin')}
                                className={`w-full p-4 rounded-xl border-2 transition-all ${promoteToRole === 'admin'
                                    ? 'border-purple-500 bg-purple-500/10'
                                    : 'border-white/10 bg-background-dark hover:border-white/20'
                                    }`}
                            >
                                <p className="text-white font-bold">Administrador</p>
                                <p className="text-slate-400 text-sm">Gerenciar eventos e finanças</p>
                            </button>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowPromoteModal(false);
                                    setSelectedMember(null);
                                }}
                                className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handlePromoteMember}
                                disabled={loading}
                                className="flex-1 py-3 rounded-xl bg-primary text-background-dark font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Promovendo...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Modal */}
            {showRemoveModal && selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-surface-dark w-full max-w-md rounded-3xl border border-red-500/20 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-red-500 font-bold text-xl mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined">warning</span>
                            Remover Membro
                        </h3>
                        <p className="text-slate-400 mb-6">
                            Tem certeza que deseja remover <span className="text-white font-bold">{selectedMember.name}</span> do time?
                            Esta ação não pode ser desfeita.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowRemoveModal(false);
                                    setSelectedMember(null);
                                }}
                                className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleRemoveMember}
                                disabled={loading}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Removendo...' : 'Remover'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {successMessage && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-5 fade-in duration-300 w-[90%] max-w-sm">
                    <div className="bg-[#1a3023] border border-primary/30 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
                        <div className="size-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-background-dark text-lg font-bold">check</span>
                        </div>
                        <p className="text-sm font-medium">{successMessage}</p>
                    </div>
                </div>
            )}

            {/* Error Toast */}
            {errorMessage && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-5 fade-in duration-300 w-[90%] max-w-sm">
                    <div className="bg-red-900/50 border border-red-500/30 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
                        <div className="size-8 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-white text-lg font-bold">error</span>
                        </div>
                        <p className="text-sm font-medium">{errorMessage}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsScreen;
