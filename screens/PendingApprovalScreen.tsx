import React from 'react';
import { useUser } from '../contexts/UserContext';

const PendingApprovalScreen = () => {
    const { logout, teamDetails, intendedRole, status, isApproved } = useUser();

    const handleLogout = async () => {
        await logout();
        window.location.href = '#/';
        window.location.reload();
    };

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center p-8 bg-background-dark text-center overflow-y-auto">
            <div className="relative mb-8">
                <div className="size-32 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(19,236,91,0.2)] overflow-hidden p-4">
                    <img src="/assets/logo/amafut_logo.png" alt="AmaFut Logo" className="w-full h-full object-contain" />
                </div>
                <div className="absolute -bottom-2 -right-2 size-12 rounded-full bg-yellow-500 flex items-center justify-center border-4 border-background-dark">
                    <span className="material-symbols-outlined text-background-dark font-bold text-2xl">hourglass_empty</span>
                </div>
            </div>

            <h1 className="text-white text-3xl font-black mb-4 tracking-tight uppercase italic">Cadastro <span className="text-primary">Bem Sucedido!</span></h1>

            <div className="bg-surface-dark/30 backdrop-blur-sm p-6 rounded-[24px] border border-white/5 mb-8 max-w-sm">
                <p className="text-slate-300 text-lg leading-relaxed">
                    Entre em contato com o <span className="text-white font-bold">Presidente</span> ou o <span className="text-white font-bold">Vice-Presidente</span> do seu time para fazer parte da família <span className="text-primary font-black">"{teamDetails.name}"</span> para desfrutar a experiência do AmaFut.
                </p>
            </div>

            {intendedRole !== 'player' && (
                <div className="mb-8 px-4 py-2 border border-primary/30 rounded-full bg-primary/5">
                    <p className="text-primary text-xs font-bold uppercase tracking-widest">
                        Solicitação de cargo: {intendedRole}
                    </p>
                </div>
            )}

            <div className="w-full max-w-xs p-5 bg-surface-dark/50 rounded-2xl border border-white/5 flex flex-col gap-3 mb-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`size-2 rounded-full animate-ping ${isApproved || status === 'approved' ? 'bg-primary' : 'bg-yellow-500'}`}></div>
                        <p className="text-slate-300 text-sm font-medium">Status da Solicitação</p>
                    </div>
                    <span className={`font-bold text-xs uppercase tracking-wider ${isApproved || status === 'approved' ? 'text-primary' : 'text-yellow-500'}`}>
                        {isApproved || status === 'approved' ? 'Aprovado' : 'Pendente'}
                    </span>
                </div>
                <div className="h-2 w-full bg-background-dark rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r rounded-full animate-pulse transition-all duration-1000 ${isApproved || status === 'approved'
                        ? 'from-primary/50 to-primary w-full'
                        : 'from-yellow-500/50 to-yellow-500 w-1/3'
                        }`}></div>
                </div>
            </div>

            <button
                onClick={handleLogout}
                className="text-slate-500 font-bold hover:text-white transition-colors flex items-center gap-2 py-2 px-4 rounded-full hover:bg-white/5"
            >
                <span className="material-symbols-outlined">logout</span>
                Sair da conta
            </button>
        </div>
    );
};

export default PendingApprovalScreen;
