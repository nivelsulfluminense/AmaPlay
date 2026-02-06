import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const NotificationsScreen = () => {
    const navigate = useNavigate();
    const { notifications, fetchNotifications, respondToPromotion, isLoading } = useUser();

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleResponse = async (id: string, accept: boolean) => {
        try {
            if (navigator.vibrate) navigator.vibrate(50);
            await respondToPromotion(id, accept);
            // Feedback visual ou toast poderia ser adicionado aqui
        } catch (error) {
            console.error(error);
            alert('Erro ao processar resposta. Tente novamente.');
        }
    };

    return (
        <div className="flex-1 flex flex-col w-full h-full bg-background-dark text-white pb-20">
            {/* Header */}
            <div className="p-6 pb-2">
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-full bg-surface-dark border border-white/5 flex items-center justify-center hover:bg-white/5 transition-colors"
                    >
                        <span className="material-symbols-outlined text-slate-400">arrow_back</span>
                    </button>
                    <h1 className="text-2xl font-bold font-display">Notificações</h1>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-6 overflow-y-auto space-y-4">
                {isLoading && notifications.length === 0 ? (
                    <div className="flex justify-center py-10">
                        <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 opacity-60">
                        <span className="material-symbols-outlined text-6xl mb-4">notifications_off</span>
                        <p>Nenhuma notificação no momento</p>
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`relative p-4 rounded-xl border ${notification.status === 'pending'
                                    ? 'bg-surface-dark border-primary/20 shadow-[0_0_15px_rgba(19,236,91,0.05)]'
                                    : 'bg-surface-dark/50 border-white/5 opacity-70'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${notification.status === 'pending' ? 'bg-primary animate-pulse' : 'bg-slate-600'}`}></div>
                                    <span className="text-xs font-bold text-primary uppercase tracking-wider">
                                        {notification.type === 'promotion_invite' ? 'Promoção' : 'Aviso'}
                                    </span>
                                </div>
                                <span className="text-[10px] text-slate-500">
                                    {format(new Date(notification.created_at), "d 'de' MMM, HH:mm", { locale: ptBR })}
                                </span>
                            </div>

                            <h3 className="font-bold text-lg mb-1">{notification.title}</h3>
                            <p className="text-sm text-slate-300 mb-4 leading-relaxed">{notification.message}</p>

                            {notification.type === 'promotion_invite' && notification.status === 'pending' && (
                                <div className="flex gap-3 mt-4">
                                    <button
                                        onClick={() => handleResponse(notification.id, false)}
                                        className="flex-1 py-2 rounded-lg border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/10 transition-colors"
                                    >
                                        Recusar
                                    </button>
                                    <button
                                        onClick={() => handleResponse(notification.id, true)}
                                        className="flex-1 py-2 rounded-lg bg-primary text-background-dark font-bold text-sm hover:bg-primary-dark transition-colors shadow-glow"
                                    >
                                        Aceitar
                                    </button>
                                </div>
                            )}

                            {notification.status !== 'pending' && (
                                <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-2 text-xs">
                                    <span className="material-symbols-outlined text-sm">
                                        {notification.status === 'accepted' ? 'check_circle' : 'cancel'}
                                    </span>
                                    <span className={notification.status === 'accepted' ? 'text-green-400' : 'text-red-400'}>
                                        {notification.status === 'accepted' ? 'Aceito' : 'Recusado'}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationsScreen;
