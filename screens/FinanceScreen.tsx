import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../services/supabase';

// We will load dataService dynamically to simulate a boundary, 
// or import it directly. Since it's a mock local file now, direct import is fine.
import { dataService, LegacyTransaction as Transaction } from '../services/dataService';

interface PlayerFinanceStatus {
    id: number;
    name: string;
    img: string;
    lastPaymentDate: Date; // Used to calculate status
    phone: string;
}

const FinanceScreen = () => {
    const location = useLocation();
    const { role, name, avatar, teamId, approveMember, rejectMember } = useUser();
    const [activeTab, setActiveTab] = useState<'transactions' | 'status' | 'validations'>('transactions');

    // Async Data State
    const [isLoading, setIsLoading] = useState(true);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [pendingMembers, setPendingMembers] = useState<any[]>([]);

    // Settings State
    const [monthlyFee, setMonthlyFee] = useState(50.00);
    const [dueDay, setDueDay] = useState(10); // Dia do vencimento

    // Modals State
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [newFeeValue, setNewFeeValue] = useState(monthlyFee.toString());
    const [newDueDay, setNewDueDay] = useState(dueDay.toString());

    const [showAddModal, setShowAddModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    // Transaction Form
    const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');

    // Load Data
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const transData = await dataService.finance.list();
                setTransactions(transData);

                if ((role === 'presidente' || role === 'vice-presidente') && teamId) {
                    const { data: members, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('team_id', teamId)
                        .eq('status', 'pending');
                    if (!error) setPendingMembers(members || []);
                }
            } catch (err) {
                console.error("Failed to load data", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [role]);

    // Check for navigation actions
    useEffect(() => {
        if (location.state && (location.state as any).action === 'add_expense') {
            setTransactionType('expense');
            setShowAddModal(true);
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // Mock Players with dates
    // Including current user with their avatar
    const [playersStatus, setPlayersStatus] = useState<PlayerFinanceStatus[]>([
        { id: 1, name: 'Alex', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAheAi6WobD7_3uZC3WDWqZ1h0iTHin1CXHF9Tab2QIfozgu5NxCyJ0nSEgTtNmVAxl4OqXCvtgC9Ax1aPF9l87m7s64gkrKW3rBA_Rr5vljOxTu2HtsGc_uReu-6ypejydVBwMMz-DUvUV8FvHzYWLSjDGY9AXtnNb5NrRR6jH9Ub14ZX6zVUfKePsjZjIQPuwwVfyE2BoGSZS0TQ3sZZUGqmfBXZunDtS3LTyASPCkoCiK_lc6RMXqxClkKoiDPLtvn8ZfGwgh3E', lastPaymentDate: new Date(), phone: '5511999999999' },
        { id: 2, name: 'Marcus', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCqzcsNqGbz0pxO8gYPWXFUE4DAhBL8EjYitrRPRAde4uyVl8wWyh_avBi3s3Kt1Y1BvNn-3KqO1FMFZjKezck9zhMGt7e4NVtBRxdoD7ueY695GRy3zuf0qCkAiu77iC-7J63tPCiY8h7SCh0UKJ4sIO1W1k45yPhH5oZGFBDIwQ-LVV7I1QalaaprKsduFKLgFjhERjWjZOh98GShW6YB-Btj_PFL-rTSb_WVfWD2ehWrQZjctXJYVTVgI0fzpEoCthDrGEavKzw', lastPaymentDate: new Date(new Date().setMonth(new Date().getMonth() - 1)), phone: '5511999999999' },
        { id: 3, name: 'David', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAC8wRIJk2E-uwVNaxSNVEsxwQLeF2x-bK71LzytfpeeX4DKM7DtbeRsvcNsHUrBHu3Nq__DLAnqUr8Dm23hBo9gSus77XBhyEIjvaqZJc8no1YZNIheCOW50qyckgUg3zPfmvaVzuHx0BTjLtJI5UNIW0bPW1qIPT3UM-7CzB_hGxbWlP_aZvUnkh-sAxQKuHlb4F1o5IftAn9riqXPkxYwU961dGiaI_KlXglL6J4pVBNgLlUx8kLsaBpiZob0bOh9cYKw224liE', lastPaymentDate: new Date(new Date().setMonth(new Date().getMonth() - 2)), phone: '5511999999999' },
    ]);

    // Merge current user into list dynamically
    const displayPlayers = useMemo(() => {
        const currentUserData: PlayerFinanceStatus = {
            id: 999, // Static ID for current user in view
            name: `${name} (Você)`,
            img: avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9CdnaU42JXMfnXGWyJWdV9dFCGHcnZKGBNvb_trvrdaASZj2hu1PkTwHMs62H4JzdweDgLmUIATzssgR3oRn0M22sWWiiMccTvQgHc5UJIjsXlvw2Z-H9nsnk-8Eh9KEDP125KqUQvtKxCliJUkGrZsoY6LMuyN7Xa2TmKLfzuIxut2lGNY6N1Eu3Eh7v-oSIO8zteb-pfgaNshQ8RmXDlv7ThIGGvyZmVrjroPp91i7NOFity34HlgKZuCPfiZOdVtMif4Q0Uw',
            lastPaymentDate: new Date(), // Mocking current user as paid
            phone: ''
        };
        // Avoid duplication if re-rendering logic was complex, but simple prepend is fine here
        return [currentUserData, ...playersStatus];
    }, [name, avatar, playersStatus]);

    // --- Logic Helpers ---

    const calculateStatus = (lastPayment: Date) => {
        const today = new Date();
        const diffMonths = (today.getFullYear() - lastPayment.getFullYear()) * 12 + (today.getMonth() - lastPayment.getMonth());

        if (diffMonths < 1) return { color: 'green', status: 'Em dia', message: 'Obrigado por manter a mensalidade em dia! ✅' };
        if (diffMonths >= 1 && diffMonths < 3) return { color: 'yellow', status: 'Atenção', message: `Olá! Sua mensalidade está com atraso. Vamos regularizar? ⚠️` };
        return { color: 'red', status: 'Crítico', message: `URGENTE: Sua participação está suspensa até a regularização. 🚫` };
    };

    const getStatusColorClass = (color: string) => {
        switch (color) {
            case 'green': return 'bg-primary text-background-dark border-primary';
            case 'yellow': return 'bg-yellow-500 text-background-dark border-yellow-500';
            case 'red': return 'bg-red-500 text-white border-red-500';
            default: return 'bg-slate-500';
        }
    };

    const sendWhatsapp = (phone: string, text: string) => {
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
    };

    const sendDueReminders = () => {
        const msg = `Lembrete do Time: A mensalidade vence dia ${dueDay}! Mantenha seu sinal verde para o próximo jogo. ⚽✅`;
        alert(`Simulação: Lembretes enviados via WhatsApp para todos os jogadores!\n\nMensagem: "${msg}"`);
    };

    const totals = useMemo(() => {
        // Only count paid transactions for balance
        const validTransactions = transactions.filter(t => t.status === 'paid');
        const income = validTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expense = validTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        const balance = income - expense;
        return { income, expense, balance };
    }, [transactions]);

    const handleAddTransaction = async () => {
        if (!amount || !description) return;

        setIsLoading(true);
        try {
            const val = parseFloat(amount);
            const isExpense = transactionType === 'expense';

            // If President adds explicit expense, it might be auto-approved, 
            // but let's say all expenses typically need validation or just add as 'paid' directly for MVP simplicity unless "Validation" tab is active.
            // For now, let's auto-approve incomes, and pending expenses if user is not admin/president (mock logic).
            // Actually, let's set expenses to 'pending' if role is player (not possible here usually) or just 'paid' for now to allow viewing.
            // Wait, the "Correction 4" is about saving data.

            // Let's create it.
            const newTrans = await dataService.finance.add({
                type: transactionType,
                amount: val,
                description,
                category: category || (isExpense ? 'Outros' : 'Entrada'),
                date: new Date().toISOString(),
                status: isExpense && role === 'presidente' ? 'pending' : 'paid' // President sets to pending for Admin to approve? Or vice versa. Let's assume Pending for expenses.
            });

            setTransactions(prev => [newTrans, ...prev]);
            setShowAddModal(false);
            setAmount('');
            setDescription('');
            setCategory('');
        } catch (e) {
            alert('Erro ao salvar.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateSettings = () => {
        const fee = parseFloat(newFeeValue);
        const day = parseInt(newDueDay);
        if (fee > 0) setMonthlyFee(fee);
        if (day > 0 && day <= 31) setDueDay(day);
        setShowSettingsModal(false);
    };

    const validateExpense = async (id: number, approved: boolean) => {
        setIsLoading(true);
        try {
            const newStatus = approved ? 'paid' : 'rejected';
            await (dataService.finance as any).updateStatus(id, newStatus);

            setTransactions(prev => prev.map(t =>
                t.id === id ? { ...t, status: newStatus as any } : t
            ));
        } catch (err: any) {
            alert(err.message || 'Erro ao atualizar status');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApproveMember = async (member: any, approved: boolean) => {
        setIsLoading(true);
        try {
            let success = false;
            if (approved) {
                success = await approveMember(member.id);
            } else {
                success = await rejectMember(member.id);
            }

            if (success) {
                // 🔑 Remove from pending list immediately to prevent re-appearance
                setPendingMembers(prev => prev.filter(m => m.id !== member.id));
                if (approved) {
                    alert('Membro aprovado com sucesso!');
                } else {
                    alert('Solicitação rejeitada.');
                }
            }
        } catch (err: any) {
            alert(err.message || 'Erro ao processar aprovação');
        } finally {
            setIsLoading(false);
        }
    };

    const openModal = (type: 'income' | 'expense') => {
        setTransactionType(type);
        setShowAddModal(true);
    };

    const pendingExpenses = transactions.filter(t => t.type === 'expense' && t.status === 'pending');

    return (
        <div className="bg-background-dark min-h-screen text-white pb-20 relative">
            {/* Header */}
            <div className="flex items-center px-4 py-4 pt-6 justify-between sticky top-0 z-40 bg-background-dark/90 backdrop-blur-md">
                <button onClick={() => window.history.back()} className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                </button>
                <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Financeiro</h2>

                <button
                    onClick={() => setShowReportModal(true)}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors text-primary"
                    title="Relatórios"
                >
                    <span className="material-symbols-outlined text-2xl">bar_chart</span>
                </button>
            </div>

            <div className="px-4 pb-4">
                {/* Balance Card */}
                <div className="flex flex-col gap-1 rounded-2xl p-6 bg-card-dark shadow-lg border border-[#2a4030] relative overflow-hidden group">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-gray-400 text-sm font-medium leading-normal">Saldo Total do Time</p>
                            {(role === 'presidente' || role === 'vice-presidente') && (
                                <button
                                    onClick={() => setShowSettingsModal(true)}
                                    className="flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg text-[10px] text-slate-300 font-bold border border-white/5 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-xs">settings</span>
                                    Configurar
                                </button>
                            )}
                        </div>
                        <div className="flex items-baseline gap-2">
                            {isLoading ? (
                                <div className="h-10 w-40 bg-white/10 animate-pulse rounded"></div>
                            ) : (
                                <h1 className="text-primary tracking-tight text-4xl font-bold leading-tight">
                                    R$ {totals.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h1>
                            )}
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                            <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded">
                                <span className="text-[10px] text-slate-400 uppercase">Mensalidade:</span>
                                <span className="text-xs font-bold text-white">R$ {monthlyFee.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded">
                                <span className="text-[10px] text-slate-400 uppercase">Vencimento:</span>
                                <span className="text-xs font-bold text-white">Dia {dueDay}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 px-4 mb-6">
                <div className="flex flex-col gap-2 rounded-2xl p-4 bg-surface-dark border border-[#2a4030]">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-lg">arrow_downward</span>
                        </div>
                        <p className="text-gray-300 text-sm font-medium">Entradas</p>
                    </div>
                    {isLoading ? <div className="h-6 w-20 bg-white/10 animate-pulse rounded"></div> :
                        <p className="text-white tracking-tight text-xl font-bold">+R$ {totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    }
                </div>
                <div className="flex flex-col gap-2 rounded-2xl p-4 bg-surface-dark border border-[#2a4030]">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="size-8 rounded-full bg-danger/20 flex items-center justify-center text-danger">
                            <span className="material-symbols-outlined text-lg">arrow_upward</span>
                        </div>
                        <p className="text-gray-300 text-sm font-medium">Saídas</p>
                    </div>
                    {isLoading ? <div className="h-6 w-20 bg-white/10 animate-pulse rounded"></div> :
                        <p className="text-white tracking-tight text-xl font-bold">-R$ {totals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    }
                </div>
            </div>

            {/* Action Buttons */}
            <div className="px-4 mb-8">
                <div className="flex gap-3">
                    <button
                        onClick={() => openModal('expense')}
                        className="flex-1 flex items-center justify-center gap-2 h-12 rounded-full bg-primary hover:bg-primary-dark transition-colors text-background-dark text-sm font-bold shadow-[0_0_15px_rgba(19,236,91,0.3)] active:scale-95 transform"
                    >
                        <span className="material-symbols-outlined text-xl">add</span>
                        <span className="truncate">Add Despesa</span>
                    </button>
                    <button
                        onClick={() => openModal('income')}
                        className="flex-1 flex items-center justify-center gap-2 h-12 rounded-full bg-surface-dark hover:bg-[#2a4030] border border-primary/30 transition-colors text-primary text-sm font-bold active:scale-95 transform"
                    >
                        <span className="material-symbols-outlined text-xl">payments</span>
                        <span className="truncate">Add Pagamento</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-4 mb-4 sticky top-[72px] z-30">
                <div className="flex h-12 w-full items-center rounded-full bg-surface-dark p-1 border border-[#2a4030] shadow-lg overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('transactions')}
                        className={`flex-1 min-w-[100px] h-full rounded-full text-sm font-medium transition-all ${activeTab === 'transactions' ? 'bg-background-dark text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                        Transações
                    </button>
                    <button
                        onClick={() => setActiveTab('status')}
                        className={`flex-1 min-w-[100px] h-full rounded-full text-sm font-medium transition-all ${activeTab === 'status' ? 'bg-background-dark text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                        Semáforo
                    </button>
                    {(role === 'admin' || role === 'presidente' || role === 'vice-presidente') && (
                        <button
                            onClick={() => setActiveTab('validations')}
                            className={`flex-1 min-w-[100px] h-full rounded-full text-sm font-medium transition-all flex items-center justify-center gap-1 ${activeTab === 'validations' ? 'bg-background-dark text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            Aprovações
                            {(pendingExpenses.length > 0 || pendingMembers.length > 0) && <span className="size-2 rounded-full bg-danger block"></span>}
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'transactions' && (
                <div className="flex flex-col px-4 gap-4 pb-8">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider px-2">Atividade Recente</p>
                    {isLoading && (
                        <div className="flex flex-col gap-4">
                            {[1, 2, 3].map(i => <div key={i} className="h-16 w-full bg-white/5 rounded-2xl animate-pulse" />)}
                        </div>
                    )}
                    {!isLoading && transactions.length === 0 && (
                        <div className="text-center py-10 text-slate-500">
                            <p>Nenhuma transação registrada.</p>
                        </div>
                    )}
                    {!isLoading && transactions.map((t) => (
                        <div key={t.id} className="flex items-center gap-4 p-4 rounded-2xl bg-card-dark border border-[#2a4030] hover:border-primary/20 transition-colors">
                            <div className={`size-12 rounded-full flex items-center justify-center shrink-0 ${t.type === 'expense' ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>
                                <span className="material-symbols-outlined">{t.category === 'stadium' ? 'stadium' : 'payments'}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-white font-medium truncate">{t.description}</p>
                                    {t.status === 'pending' && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 rounded">Pendente</span>}
                                </div>
                                <p className="text-gray-500 text-xs">{new Date(t.date).toLocaleDateString()}</p>
                            </div>
                            <p className={`font-bold text-right ${t.type === 'expense' ? 'text-white' : 'text-primary'}`}>
                                {t.type === 'expense' ? '-' : '+'}R$ {t.amount.toFixed(2)}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'status' && (
                <div className="flex flex-col px-4 gap-4 pb-20">
                    <div className="bg-surface-dark border border-white/10 rounded-2xl p-4">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <h4 className="text-white font-bold text-sm">Controle de Mensalidades</h4>
                                <p className="text-slate-400 text-xs">Vencimento: Dia {dueDay}</p>
                            </div>
                            {role === 'presidente' && (
                                <button
                                    onClick={sendDueReminders}
                                    className="text-[10px] font-bold bg-[#25D366] text-background-dark px-3 py-1.5 rounded-full flex items-center gap-1 hover:brightness-110 transition-all shadow-md"
                                >
                                    <i className="fa-brands fa-whatsapp text-xs"></i>
                                    Lembretes (5 dias)
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2 text-[10px] font-bold uppercase text-center">
                            <div className="flex-1 bg-primary/20 text-primary rounded py-1">Em dia</div>
                            <div className="flex-1 bg-yellow-500/20 text-yellow-500 rounded py-1">1-2 Meses</div>
                            <div className="flex-1 bg-red-500/20 text-red-500 rounded py-1">3+ Meses</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Validation Tab */}
            {activeTab === 'validations' && (role === 'admin' || role === 'presidente' || role === 'vice-presidente') && (
                <div className="flex flex-col px-4 gap-4 pb-8 animate-in fade-in">

                    {/* Member Approvals */}
                    {(role === 'presidente' || role === 'vice-presidente') && (
                        <>
                            <div className="flex items-center gap-2 px-2 mt-4">
                                <span className="material-symbols-outlined text-primary">person_add</span>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Membros para Aprovar</p>
                            </div>

                            {pendingMembers.length > 0 ? (
                                pendingMembers.map(member => (
                                    <div key={member.id} className="flex flex-col gap-3 p-4 rounded-2xl bg-surface-dark border border-primary/30">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="size-12 rounded-full bg-background-dark border border-white/10 overflow-hidden shrink-0">
                                                    {member.avatar ? <img src={member.avatar} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-600 m-2">person</span>}
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold">{member.name}</p>
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider text-primary">{member.role}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleApproveMember(member, false)} className="flex-1 py-3 bg-white/5 text-red-400 text-xs font-bold rounded-xl border border-white/5">Recusar</button>
                                            <button onClick={() => handleApproveMember(member, true)} className="flex-1 py-3 bg-primary text-background-dark text-xs font-bold rounded-xl">Aprovar Membro</button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-slate-500 border border-dashed border-white/5 rounded-2xl">
                                    <p className="text-sm">Nenhum novo membro pendente.</p>
                                </div>
                            )}
                        </>
                    )}

                    <div className="flex items-center gap-2 px-2 mt-6">
                        <span className="material-symbols-outlined text-orange-400">admin_panel_settings</span>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Despesas para Validar</p>
                    </div>

                    {pendingExpenses.length > 0 ? (
                        pendingExpenses.map((expense) => (
                            <div key={expense.id} className="flex flex-col gap-3 p-4 rounded-2xl bg-surface-dark border border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.1)]">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                                            <span className="material-symbols-outlined">receipt_long</span>
                                        </div>
                                        <div>
                                            <p className="text-white font-bold">{expense.description}</p>
                                            <p className="text-xs text-slate-400">Categoria: {expense.category}</p>
                                        </div>
                                    </div>
                                    <span className="text-white font-bold text-lg">R$ {expense.amount.toFixed(2)}</span>
                                </div>

                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={() => validateExpense(expense.id, false)}
                                        className="flex-1 py-2 bg-white/5 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-lg border border-white/5 hover:border-red-500/50 transition-colors"
                                    >
                                        Rejeitar
                                    </button>
                                    <button
                                        onClick={() => validateExpense(expense.id, true)}
                                        className="flex-1 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg border border-primary/20 hover:border-primary/50 transition-colors"
                                    >
                                        Aprovar
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 text-slate-500 border-2 border-dashed border-white/5 rounded-2xl">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">fact_check</span>
                            <p>Nenhuma despesa para validar.</p>
                        </div>
                    )}
                </div>
            )}

            {/* --- ADD TRANSACTION MODAL --- */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-surface-dark w-full max-w-sm rounded-2xl border border-white/10 p-6 shadow-2xl">
                        <h3 className="text-white text-xl font-bold mb-4">
                            {transactionType === 'expense' ? 'Adicionar Despesa' : 'Adicionar Entrada'}
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Descrição</label>
                                <input
                                    type="text"
                                    className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary"
                                    placeholder={transactionType === 'expense' ? "Ex: Água, Arbitragem" : "Ex: Mensalidade, Patrocínio"}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Valor (R$)</label>
                                <input
                                    type="number"
                                    className={`w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 ${transactionType === 'expense' ? 'focus:ring-danger' : 'focus:ring-primary'}`}
                                    placeholder="0,00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddTransaction}
                                disabled={!amount || !description || isLoading}
                                className={`flex-1 py-3 rounded-xl font-bold text-background-dark ${transactionType === 'expense' ? 'bg-danger hover:bg-red-400' : 'bg-primary hover:bg-primary-dark'} ${(!amount || !description || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isLoading ? 'Salvando...' : (transactionType === 'expense' && role === 'presidente' ? 'Enviar' : 'Salvar')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SETTINGS MODAL --- */}
            {showSettingsModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-surface-dark w-full max-w-sm rounded-2xl border border-white/10 p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined">settings</span>
                            </div>
                            <div>
                                <h3 className="text-white text-xl font-bold">Configuração Financeira</h3>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Valor Mensal (R$)</label>
                                <input
                                    type="number"
                                    className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary text-xl font-bold"
                                    value={newFeeValue}
                                    onChange={(e) => setNewFeeValue(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Dia do Vencimento</label>
                                <input
                                    type="number"
                                    min="1" max="31"
                                    className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary text-xl font-bold"
                                    value={newDueDay}
                                    onChange={(e) => setNewDueDay(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSettingsModal(false)}
                                className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpdateSettings}
                                className="flex-1 py-3 rounded-xl bg-primary text-background-dark font-bold hover:bg-primary-dark"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceScreen;