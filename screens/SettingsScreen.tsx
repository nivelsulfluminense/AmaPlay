import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { dataService } from '../services/dataService';
import { authService } from '../services/authService';
import { supabase } from '../services/supabase';
import { ImageEditor } from '../components/ImageEditor';

interface TeamMember {
    id: string;
    name: string;
    avatar: string;
    role: 'presidente' | 'vice-presidente' | 'admin' | 'player';
    is_team_approved: boolean;
}

const SettingsScreen = () => {
    const navigate = useNavigate();
    const { role, name, email, userId, teamId, logout, updateMemberRole, removeMember, promoteMember, approveMember, rejectMember, deleteAccount } = useUser();
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
    const [pendingMembers, setPendingMembers] = useState<any[]>([]); // Using any for Profile for now to match interface mismatch or import Profile properly
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [showResignModal, setShowResignModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedSuccessor, setSelectedSuccessor] = useState<TeamMember | null>(null);
    const [promoteToRole, setPromoteToRole] = useState<'presidente' | 'vice-presidente' | 'admin'>('admin');
    const [ownPromotionRequest, setOwnPromotionRequest] = useState<any>(null);
    const [pendingPromotions, setPendingPromotions] = useState<any[]>([]);
    const [showRequestPromotionModal, setShowRequestPromotionModal] = useState(false);
    const [requestedRole, setRequestedRole] = useState<'admin' | 'vice-presidente' | 'presidente'>('admin');

    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Team Management State
    const [teamName, setTeamName] = useState('');
    const [teamPrimaryColor, setTeamPrimaryColor] = useState('#13ec5b');
    const [teamSecondaryColor, setTeamSecondaryColor] = useState('#ffffff');
    const [teamLogo, setTeamLogo] = useState('');

    // Image Editor State
    const [showImageEditor, setShowImageEditor] = useState(false);
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isLeader = role === 'presidente' || role === 'vice-presidente';

    useEffect(() => {
        loadUserSettings();
        loadOwnPromotionRequest();
        if (isLeader) {
            loadTeamMembers();
            loadTeamSettings();
            loadPendingPromotions();
        }
    }, [isLeader]);

    const loadOwnPromotionRequest = async () => {
        try {
            const request = await (dataService as any).promotions.getOwnRequest();
            setOwnPromotionRequest(request);
        } catch (err) {
            console.error(err);
        }
    };

    const loadPendingPromotions = async () => {
        try {
            const requests = await (dataService as any).promotions.listPending();
            setPendingPromotions(requests);
        } catch (err) {
            console.error(err);
        }
    };

    const loadTeamSettings = async () => {
        if (!teamId) return;
        try {
            const { data, error } = await supabase
                .from('teams')
                .select('*')
                .eq('id', teamId)
                .single();

            if (data) {
                setTeamName(data.name);
                setTeamPrimaryColor(data.primary_color || '#13ec5b');
                setTeamSecondaryColor(data.secondary_color || '#ffffff');
                setTeamLogo(data.logo || '');
            }
        } catch (err) {
            console.error(err);
        }
    }

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setOriginalImage(reader.result as string);
                setShowImageEditor(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveTeamLogo = (processedImage: string) => {
        setTeamLogo(processedImage);
        setShowImageEditor(false);
    };

    const handleUpdateTeam = async () => {
        if (!teamId || !teamName) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('teams')
                .update({
                    name: teamName,
                    primary_color: teamPrimaryColor,
                    secondary_color: teamSecondaryColor,
                    logo: teamLogo
                })
                .eq('id', teamId);

            if (error) throw error;
            showSuccess('Dados do time atualizados com sucesso!');
        } catch (error: any) {
            showError(error.message || 'Erro ao atualizar time');
        } finally {
            setLoading(false);
        }
    };

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
            // Fetch both approved members (including incomplete ones) and pending requests
            const [players, pending] = await Promise.all([
                dataService.players.list(true), // true = include incomplete
                dataService.team.getPendingRequests()
            ]);

            const members: TeamMember[] = players.map(p => ({
                id: p.id.toString(),
                name: p.name,
                avatar: p.avatar,
                role: p.role || 'player',
                is_team_approved: true
            }));
            setTeamMembers(members);
            setPendingMembers(pending);
        } catch (error) {
            console.error('Error loading team members:', error);
        }
    };

    const handleApprove = async (id: string) => {
        setActionLoading(id);
        const success = await approveMember(id);
        if (success) {
            showSuccess('Membro aprovado com sucesso!');
            await loadTeamMembers();
        } else {
            showError('Erro ao aprovar membro');
        }
        setActionLoading(null);
    };

    const handleReject = async (id: string) => {
        setActionLoading(id);
        const success = await rejectMember(id);
        if (success) {
            showSuccess('Membro recusado.');
            await loadTeamMembers();
        } else {
            showError('Erro ao recusar membro');
        }
        setActionLoading(null);
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
            // Agora usa a função de promoção que envia notificação
            // O updateMemberRole era direto, agora é via convite
            await promoteMember(selectedMember.id, promoteToRole);

            showSuccess(`Convite enviado para ${selectedMember.name} assumir como ${promoteToRole}!`);
            setShowPromoteModal(false);
            setSelectedMember(null);
            // Não recarrega membros imediatamente pois o status não mudou ainda
        } catch (error: any) {
            showError(error.message || 'Erro ao enviar promoção');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestPromotion = async () => {
        setLoading(true);
        try {
            await (dataService as any).promotions.request(requestedRole);
            showSuccess(`Solicitação para ${getRoleLabel(requestedRole)} enviada com sucesso!`);
            setShowRequestPromotionModal(false);
            await loadOwnPromotionRequest();
        } catch (error: any) {
            showError(error.message || 'Erro ao solicitar promoção');
        } finally {
            setLoading(false);
        }
    };

    const handleRespondToPromotionRequest = async (requestId: string, status: 'approved' | 'rejected') => {
        setActionLoading(requestId);
        try {
            await (dataService as any).promotions.respond(requestId, status);
            showSuccess(status === 'approved' ? 'Promoção aprovada!' : 'Promoção recusada.');
            await loadPendingPromotions();
            await loadTeamMembers();
        } catch (error: any) {
            showError(error.message || 'Erro ao processar solicitação');
        } finally {
            setActionLoading(null);
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

    const handleResignPresident = async () => {
        if (!selectedSuccessor) return;
        setLoading(true);
        try {
            await promoteMember(selectedSuccessor.id, 'presidente');

            showSuccess(`Convite enviado para ${selectedSuccessor.name}! Assim que aceitar, ele será o novo Presidente.`);
            setShowResignModal(false);
            setSelectedSuccessor(null);
        } catch (error: any) {
            showError(error.message || 'Erro ao enviar convite');
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
                            AmaFut Pro
                        </h3>
                        <p className="text-slate-400 text-sm mb-4">Gerencie sua participação no sistema de scouts profissional</p>

                        <div className="space-y-3">
                            <button
                                onClick={() => navigate('/scouts?edit=true')}
                                className="w-full py-3 bg-primary/20 text-primary font-bold rounded-xl hover:bg-primary/30 transition-colors border border-primary/30 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">edit</span>
                                Atualizar Dados Pro
                            </button>
                            <button
                                onClick={() => {
                                    if (window.confirm('Tem certeza que deseja cancelar sua participação no AmaFut Pro? Seus dados serão mantidos mas você não aparecerá mais nos scouts.')) {
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

                    {/* Promotion Request - NEW */}
                    {role !== 'presidente' && (
                        <div className="bg-surface-dark rounded-2xl border border-white/5 p-6 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8"></div>
                            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">auto_graph</span>
                                Solicitar Promoção
                            </h3>

                            {ownPromotionRequest ? (
                                <div className="bg-background-dark p-4 rounded-xl border border-primary/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status da Solicitação</span>
                                        <span className="px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold uppercase">Pendente</span>
                                    </div>
                                    <p className="text-white font-bold">Solicitou ser {getRoleLabel(ownPromotionRequest.requested_role)}</p>
                                    <p className="text-slate-400 text-xs mt-1">Aguardando aprovação do Presidente ou Vice.</p>
                                </div>
                            ) : (
                                <>
                                    <p className="text-slate-400 text-sm mb-4">
                                        Deseja assumir mais responsabilidades no time? Solicite uma promoção!
                                    </p>
                                    <button
                                        onClick={() => setShowRequestPromotionModal(true)}
                                        className="w-full py-3 bg-primary text-background-dark font-bold rounded-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                                    >
                                        <span className="material-symbols-outlined">star</span>
                                        Solicitar Novo Cargo
                                    </button>
                                </>
                            )}
                        </div>
                    )}

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

                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="w-full mt-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors border border-red-500 shadow-lg shadow-red-900/20"
                        >
                            Excluir Minha Conta
                        </button>
                    </div>
                </div>
            )}

            {/* Management Tab */}
            {activeTab === 'management' && isLeader && (
                <div className="p-4 space-y-6">
                    {/* Team Settings Section - NEW */}
                    <div className="bg-surface-dark rounded-2xl border border-white/5 p-6">
                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">shield</span>
                            Ajustes do Time
                        </h3>

                        <div className="flex flex-col items-center mb-6">
                            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className="size-24 rounded-full border-4 border-white/10 overflow-hidden bg-background-dark relative">
                                    {teamLogo ? (
                                        <img src={teamLogo} alt="Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                                            <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
                                        </div>
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <span className="material-symbols-outlined text-white">edit</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">Toque para alterar a logo</p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                accept="image/*"
                            />
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nome do Time</label>
                                <input
                                    type="text"
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Cor Primária</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <input
                                            type="color"
                                            value={teamPrimaryColor}
                                            onChange={(e) => setTeamPrimaryColor(e.target.value)}
                                            className="h-10 w-10 rounded cursor-pointer bg-transparent border-none"
                                        />
                                        <span className="text-sm text-slate-300 font-mono">{teamPrimaryColor}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Cor Secundária</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <input
                                            type="color"
                                            value={teamSecondaryColor}
                                            onChange={(e) => setTeamSecondaryColor(e.target.value)}
                                            className="h-10 w-10 rounded cursor-pointer bg-transparent border-none"
                                        />
                                        <span className="text-sm text-slate-300 font-mono">{teamSecondaryColor}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleUpdateTeam}
                                disabled={loading}
                                className="w-full mt-2 py-3 bg-primary text-background-dark font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Salvando...' : 'Salvar Alterações'}
                            </button>

                            <div className="pt-4 border-t border-white/5 mt-4">
                                <button
                                    onClick={() => navigate('/register-team')}
                                    className="w-full py-3 bg-surface-dark border border-white/10 text-slate-300 font-bold rounded-xl hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined">add_circle</span>
                                    Cadastrar Novo Time
                                </button>
                                <p className="text-xs text-slate-500 text-center mt-2">
                                    Se você criar um novo time, se tornará o Presidente dele automaticamente.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* President Transfer Zone */}
                    {role === 'presidente' && (
                        <div className="bg-surface-dark rounded-2xl border border-white/5 p-6">
                            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-yellow-500">crown</span>
                                Transferência de Presidência
                            </h3>
                            <p className="text-slate-400 text-sm mb-4">
                                Você pode transferir seu cargo para outro membro. Ao fazer isso, você se tornará um jogador comum assim que o convite for aceito.
                            </p>
                            <button
                                onClick={() => setShowResignModal(true)}
                                className="w-full py-3 bg-yellow-500/10 text-yellow-500 font-bold rounded-xl hover:bg-yellow-500/20 transition-colors border border-yellow-500/20 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">move_up</span>
                                Deixar de ser Presidente
                            </button>
                        </div>
                    )}

                    {/* Pending Requests */}
                    {pendingMembers.length > 0 && (
                        <div className="bg-surface-dark rounded-2xl border border-yellow-500/20 p-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>
                            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-yellow-500">person_add</span>
                                Solicitações de Entrada
                            </h3>
                            <div className="space-y-3">
                                {pendingMembers.map((p) => (
                                    <div key={p.id} className="bg-background-dark p-4 rounded-xl border border-white/5 flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="size-12 rounded-full overflow-hidden border border-white/10">
                                                <img src={p.avatar || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt={p.name} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-white font-bold">{p.name}</p>
                                                <p className="text-xs text-slate-400">Quer entrar como: <span className="text-primary uppercase font-bold">{p.intended_role || 'Jogador'}</span></p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleApprove(p.id)}
                                                disabled={actionLoading === p.id}
                                                className="flex-1 py-2 bg-primary text-background-dark font-bold rounded-lg text-sm hover:bg-primary-dark transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                                            >
                                                {actionLoading === p.id ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : <span className="material-symbols-outlined text-sm">check</span>}
                                                Aprovar
                                            </button>
                                            <button
                                                onClick={() => handleReject(p.id)}
                                                disabled={actionLoading === p.id}
                                                className="flex-1 py-2 bg-red-500/10 text-red-500 font-bold rounded-lg text-sm hover:bg-red-500/20 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                                            >
                                                {actionLoading === p.id ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : <span className="material-symbols-outlined text-sm">close</span>}
                                                Recusar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pending Promotion Requests - NEW */}
                    {pendingPromotions.length > 0 && (
                        <div className="bg-surface-dark rounded-2xl border border-primary/20 p-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">auto_graph</span>
                                Solicitações de Promoção
                            </h3>
                            <div className="space-y-3">
                                {pendingPromotions.map((p) => (
                                    <div key={p.id} className="bg-background-dark p-4 rounded-xl border border-white/5 flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="size-12 rounded-full overflow-hidden border border-white/10 shrink-0">
                                                <img src={p.profiles?.avatar || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt={p.profiles?.name} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-white font-bold">{p.profiles?.name}</p>
                                                <p className="text-xs text-slate-400">
                                                    Status atual: <span className="text-white uppercase font-bold">{getRoleLabel(p.profiles?.role)}</span>
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className="text-[10px] bg-white/5 text-slate-300 px-1.5 py-0.5 rounded">SOLICITOU</span>
                                                    <span className="material-symbols-outlined text-sm text-primary">arrow_forward</span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-black text-white ${getRoleBadgeColor(p.requested_role)}`}>
                                                        {getRoleLabel(p.requested_role).toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleRespondToPromotionRequest(p.id, 'approved')}
                                                disabled={actionLoading === p.id}
                                                className="flex-1 py-2 bg-primary text-background-dark font-bold rounded-lg text-sm hover:bg-primary-dark transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                                            >
                                                {actionLoading === p.id ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : <span className="material-symbols-outlined text-sm font-bold">done_all</span>}
                                                Aceitar Promoção
                                            </button>
                                            <button
                                                onClick={() => handleRespondToPromotionRequest(p.id, 'rejected')}
                                                disabled={actionLoading === p.id}
                                                className="flex-1 py-2 bg-red-500/10 text-red-400 font-bold rounded-lg text-sm hover:bg-red-500/20 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                                            >
                                                {actionLoading === p.id ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : <span className="material-symbols-outlined text-sm">block</span>}
                                                Recusar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-surface-dark rounded-2xl border border-white/5 p-6">
                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">groups</span>
                            Membros do Time ({teamMembers.length})
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
            )
            }

            {/* Promote Modal */}
            {
                showPromoteModal && selectedMember && (
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
                )
            }

            {/* Remove Modal */}
            {
                showRemoveModal && selectedMember && (
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
                )
            }

            {/* Resign / Transfer President Modal */}
            {
                showResignModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-surface-dark w-full max-w-md rounded-3xl border border-yellow-500/20 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                            <h3 className="text-yellow-500 font-bold text-xl mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined">local_police</span>
                                Escolher Novo Presidente
                            </h3>
                            <p className="text-slate-400 mb-6">
                                Selecione quem será o novo presidente. <strong className="text-white">Esta ação enviará um convite.</strong> Se aceito, você perderá seus poderes administrativos imediatamente.
                            </p>

                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 mb-6 custom-scrollbar">
                                {teamMembers.filter(m => m.id !== userId).map(member => (
                                    <button
                                        key={member.id}
                                        onClick={() => setSelectedSuccessor(member)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${selectedSuccessor?.id === member.id
                                            ? 'bg-yellow-500/20 border-yellow-500'
                                            : 'bg-background-dark border-white/5 hover:bg-white/5'
                                            }`}
                                    >
                                        <div className="size-10 rounded-full overflow-hidden border border-white/10 shrink-0">
                                            <img src={member.avatar || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt={member.name} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className={`font-bold ${selectedSuccessor?.id === member.id ? 'text-yellow-500' : 'text-white'}`}>
                                                {member.name}
                                            </p>
                                            <p className="text-xs text-slate-500">{getRoleLabel(member.role)}</p>
                                        </div>
                                        {selectedSuccessor?.id === member.id && (
                                            <span className="material-symbols-outlined text-yellow-500">check_circle</span>
                                        )}
                                    </button>
                                ))}

                                {teamMembers.filter(m => m.id !== userId).length === 0 && (
                                    <div className="text-center py-6 text-slate-500">
                                        <p>Não há outros membros no time para transferir a presidência.</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowResignModal(false);
                                        setSelectedSuccessor(null);
                                    }}
                                    className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleResignPresident}
                                    disabled={loading || !selectedSuccessor}
                                    className="flex-1 py-3 rounded-xl bg-yellow-500 text-background-dark font-bold hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Enviando...' : 'Transferir Cargo'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Success Toast */}
            {
                successMessage && (
                    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-5 fade-in duration-300 w-[90%] max-w-sm">
                        <div className="bg-[#1a3023] border border-primary/30 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
                            <div className="size-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-background-dark text-lg font-bold">check</span>
                            </div>
                            <p className="text-sm font-medium">{successMessage}</p>
                        </div>
                    </div>
                )
            }

            {/* Error Toast */}
            {
                errorMessage && (
                    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-5 fade-in duration-300 w-[90%] max-w-sm">
                        <div className="bg-red-900/50 border border-red-500/30 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
                            <div className="size-8 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-white text-lg font-bold">error</span>
                            </div>
                            <p className="text-sm font-medium">{errorMessage}</p>
                        </div>
                    </div>
                )
            }
            {/* Image Editor Modal */}
            {
                showImageEditor && originalImage && (
                    <ImageEditor
                        imageSrc={originalImage}
                        onSave={handleSaveTeamLogo}
                        onCancel={() => setShowImageEditor(false)}
                        aspectRatio={1} // Square for Logo
                        allowBackgroundRemoval={true}
                    />
                )
            }
            {/* DELETE ACCOUNT MODAL */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-surface-dark w-full max-w-md rounded-3xl border border-red-500/50 p-6 shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-red-500">
                                <span className="material-symbols-outlined text-4xl">warning</span>
                            </div>
                            <h3 className="text-white font-bold text-2xl mb-2">
                                Excluir Conta?
                            </h3>
                            <p className="text-slate-400">
                                Tem certeza que deseja apagar sua conta? <strong className="text-red-400">Esta ação é irreversível</strong> e todos os seus dados serão perdidos permanentemente.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={async () => {
                                    try {
                                        await deleteAccount();
                                    } catch (err: any) {
                                        showError(err.message || 'Erro ao excluir conta');
                                    }
                                }}
                                className="w-full py-4 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">delete_forever</span>
                                Sim, Excluir Tudo
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="w-full py-4 rounded-xl border border-white/10 text-slate-300 font-bold hover:bg-white/5 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* REQUEST PROMOTION MODAL */}
            {showRequestPromotionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-surface-dark w-full max-w-md rounded-3xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-white font-bold text-xl mb-2">Solicitar Promoção</h3>
                        <p className="text-slate-400 mb-6">Escolha o cargo que deseja solicitar para a gestão do seu time:</p>

                        <div className="space-y-3 mb-8">
                            <button
                                onClick={() => setRequestedRole('admin')}
                                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${requestedRole === 'admin' ? 'border-primary bg-primary/10' : 'border-white/5 bg-background-dark/50'}`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-white font-bold">Administrador</span>
                                    {requestedRole === 'admin' && <span className="material-symbols-outlined text-primary text-sm">check_circle</span>}
                                </div>
                                <p className="text-slate-400 text-xs italic">Ajuda na organização de jogos e scouts.</p>
                            </button>

                            <button
                                onClick={() => setRequestedRole('vice-presidente')}
                                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${requestedRole === 'vice-presidente' ? 'border-primary bg-primary/10' : 'border-white/5 bg-background-dark/50'}`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-white font-bold">Vice-Presidente</span>
                                    {requestedRole === 'vice-presidente' && <span className="material-symbols-outlined text-primary text-sm">check_circle</span>}
                                </div>
                                <p className="text-slate-400 text-xs italic">Gestão do time, financeiro e membros.</p>
                            </button>

                            <button
                                onClick={() => setRequestedRole('presidente')}
                                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${requestedRole === 'presidente' ? 'border-primary bg-primary/10' : 'border-white/5 bg-background-dark/50'}`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-white font-bold">Presidente</span>
                                    {requestedRole === 'presidente' && <span className="material-symbols-outlined text-primary text-sm">check_circle</span>}
                                </div>
                                <p className="text-slate-400 text-xs italic">Liderança máxima e controle total do esquadrão.</p>
                            </button>
                        </div>

                        {requestedRole !== 'admin' && (
                            <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-start gap-3">
                                <span className="material-symbols-outlined text-orange-500 text-lg">info</span>
                                <p className="text-[10px] text-orange-200 leading-tight">
                                    <strong>REGRA DE TROCA:</strong> Como o time só pode ter um {getRoleLabel(requestedRole)}, se sua solicitação for aceita, você <strong>trocará de cargo</strong> com o atual ocupante automaticamente.
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleRequestPromotion}
                                disabled={loading}
                                className="w-full py-4 bg-primary text-background-dark font-bold rounded-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">send</span>}
                                Enviar Solicitação
                            </button>
                            <button
                                onClick={() => setShowRequestPromotionModal(false)}
                                className="w-full py-3 text-slate-400 font-bold hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default SettingsScreen;
