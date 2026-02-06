import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../services/supabase';

// We will load dataService dynamically to simulate a boundary, 
// or import it directly. Since it's a mock local file now, direct import is fine.
import { dataService, LegacyTransaction as Transaction, Player, Charge } from '../services/dataService';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

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
    const [activeTab, setActiveTab] = useState<'transactions' | 'status' | 'validations' | 'account'>('transactions');

    // Async Data State
    const [isLoading, setIsLoading] = useState(true);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [pendingMembers, setPendingMembers] = useState<any[]>([]);
    const [allPlayers, setAllPlayers] = useState<Player[]>([]);
    const [activeCharges, setActiveCharges] = useState<Charge[]>([]);

    // Settings State
    const [monthlyFee, setMonthlyFee] = useState(50.00);
    const [dueDay, setDueDay] = useState(10); // Dia do vencimento

    const [launchDay, setLaunchDay] = useState(1); // Dia do lançamento automático
    const [feeStartDate, setFeeStartDate] = useState<string | undefined>(undefined);


    // Modals State
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [newFeeValue, setNewFeeValue] = useState(monthlyFee.toString());
    const [newDueDay, setNewDueDay] = useState(dueDay.toString());
    const [newLaunchDay, setNewLaunchDay] = useState(launchDay.toString());
    const [newFeeStartDate, setNewFeeStartDate] = useState('');

    const [showAddModal, setShowAddModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showChargeModal, setShowChargeModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentStep, setPaymentStep] = useState<'options' | 'manual' | 'upload' | 'confirm'>('options');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentFile, setPaymentFile] = useState<File | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [paymentResult, setPaymentResult] = useState<{ credit: number, complement: number, months: number } | null>(null);
    const [selectedPlayerForHistory, setSelectedPlayerForHistory] = useState<Player | null>(null);

    // Transaction Form
    const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');

    // Charge Form
    const [chargeTitle, setChargeTitle] = useState('');
    const [chargeAmount, setChargeAmount] = useState('');
    const [chargeType, setChargeType] = useState<'monthly' | 'extra'>('monthly');
    const [chargeDueDay, setChargeDueDay] = useState(dueDay.toString());

    const [targetPlayerId, setTargetPlayerId] = useState<string | null>(null);

    // Month/Year Selection for Retroactive/Manual
    const [formMonth, setFormMonth] = useState(new Date().getMonth() + 1);
    const [formYear, setFormYear] = useState(new Date().getFullYear());

    // Receiver Account state
    const [receiverData, setReceiverData] = useState({
        ownerName: '',
        documentNumber: '',
        agency: '',
        accountNumber: '',
        institution: '',
        accountType: 'Corrente',
        pixKey: ''
    });

    const monthsNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    // Open Charge Modal with Defaults
    const openChargeModal = () => {
        const now = new Date();
        setChargeType('monthly');
        setChargeAmount(monthlyFee.toString());
        setChargeDueDay(dueDay.toString());
        setChargeTitle(`Mensalidade ${monthsNames[now.getMonth()]}/${now.getFullYear()}`);
        setShowChargeModal(true);
    };

    // Load Data
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const transData = await dataService.finance.list();
                setTransactions(transData);

                const settings = await dataService.finance.getSettings();
                if (settings) {
                    setMonthlyFee(settings.monthlyFee);
                    setDueDay(settings.dueDay);
                    setLaunchDay(settings.launchDay);
                    setFeeStartDate(settings.feeStartDate);
                    setNewFeeValue(settings.monthlyFee.toString());
                    setNewDueDay(settings.dueDay.toString());
                    setNewLaunchDay(settings.launchDay.toString());
                    if (settings.feeStartDate) setNewFeeStartDate(settings.feeStartDate);
                }

                if ((role === 'presidente' || role === 'vice-presidente') && teamId) {
                    const { data: members, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('team_id', teamId)
                        .eq('is_approved', false);
                    if (!error) setPendingMembers(members || []);
                }

                if (teamId) {
                    const players = await dataService.players.list(true, teamId);
                    setAllPlayers(players);

                    const charges = await dataService.finance.charges.list();
                    setActiveCharges(charges);

                    // Auto-Launch Monthly Charge Check
                    const now = new Date();
                    const currentMonthTitle = `Mensalidade ${monthsNames[now.getMonth()]}/${now.getFullYear()}`;
                    const hasCurrentMonthCharge = charges.some(c => c.title === currentMonthTitle);

                    if (!hasCurrentMonthCharge && now.getDate() >= settings?.launchDay && settings?.monthlyFee > 0) {
                        try {
                            const newAutoCharge = await dataService.finance.charges.add({
                                title: currentMonthTitle,
                                amount: settings.monthlyFee,
                                type: 'monthly'
                            });
                            setActiveCharges(prev => [newAutoCharge, ...prev]);
                        } catch (e) {
                            console.error("Auto-launch failed", e);
                        }
                    }

                    const receiver = await dataService.finance.receiver.get();
                    if (receiver) setReceiverData(receiver as any);
                }
            } catch (err) {
                console.error("Failed to load data", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [role, teamId]);

    // Check for navigation actions
    useEffect(() => {
        if (location.state && (location.state as any).action === 'add_expense') {
            setTransactionType('expense');
            setShowAddModal(true);
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const playersWithStatus = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        return allPlayers.map(p => {
            const playerTrans = transactions.filter(t =>
                t.targetUserId === p.id &&
                t.category === 'Mensalidade' &&
                t.status === 'paid'
            );

            // 1. Calculate Debt (Months Owed)
            let monthsOwed = 0;
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();

            // October 2025 as the specific start per request
            const startLimit = feeStartDate ? new Date(feeStartDate) : new Date(2025, 9, 1); // 9 is October (0-indexed)
            startLimit.setDate(1);

            const dateCursor = new Date(startLimit);
            while (dateCursor <= now) {
                const m = dateCursor.getMonth() + 1;
                const y = dateCursor.getFullYear();

                const paid = playerTrans.some(t => t.referenceMonth === m && t.referenceYear === y);
                if (!paid) {
                    const isCurrentMonth = (y === currentYear && m === currentMonth);
                    // Debt counts if it's a past month OR (it's current month AND past due day)
                    if (!isCurrentMonth || (isCurrentMonth && now.getDate() > dueDay)) {
                        monthsOwed++;
                    }
                }
                dateCursor.setMonth(dateCursor.getMonth() + 1);
            }

            // 2. Calculate Advance Payments (Months Ahead)
            let monthsAhead = 0;
            const aheadCursor = new Date();
            aheadCursor.setMonth(aheadCursor.getMonth() + 1);
            aheadCursor.setDate(1);

            for (let i = 0; i < 12; i++) {
                const m = aheadCursor.getMonth() + 1;
                const y = aheadCursor.getFullYear();
                const paid = playerTrans.some(t => t.referenceMonth === m && t.referenceYear === y);
                if (paid) monthsAhead++;
                else break;
                aheadCursor.setMonth(aheadCursor.getMonth() + 1);
            }

            let statusColor = '#13ec5b'; // Green
            let statusText = 'Em Dia';
            let hoverMessage = 'Parabéns você está adimplente';

            if (monthsOwed >= 3) {
                statusColor = '#ef4444'; // Red
                statusText = 'Crítico';
                hoverMessage = `${monthsOwed} meses em atraso`;
            } else if (monthsOwed >= 1) {
                statusColor = '#f59e0b'; // Yellow
                statusText = 'Atrasado';
                hoverMessage = `${monthsOwed} mês em atraso`;
            } else if (monthsAhead > 0) {
                statusText = 'Em Dia'; // Per request: "situação Em dia" when ahead
                hoverMessage = 'Você é um exemplo em finanças';
            }

            return {
                ...p,
                monthsOwed,
                monthsAhead,
                statusColor,
                statusText,
                hoverMessage
            };
        });
    }, [allPlayers, transactions, dueDay, feeStartDate]);

    const stats = useMemo(() => {
        const validTransactions = transactions.filter(t => t.status === 'paid');
        const income = validTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expense = validTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        const balance = income - expense;

        const now = new Date();
        const monthlyRevenue = validTransactions
            .filter(t => t.type === 'income' && new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear())
            .reduce((acc, t) => acc + t.amount, 0);

        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const weeklyFlow = days.map(day => ({ name: day, value: 0 }));
        validTransactions.filter(t => t.type === 'income').forEach(t => {
            const dayIndex = new Date(t.date).getDay();
            weeklyFlow[dayIndex].value += t.amount;
        });

        const onTimeCount = playersWithStatus.filter(p => p.monthsOwed === 0).length;
        const lateOnlyCount = playersWithStatus.filter(p => p.monthsOwed >= 1 && p.monthsOwed < 3).length;
        const criticalCount = playersWithStatus.filter(p => p.monthsOwed >= 3).length;

        const paymentDistribution = [
            { name: 'Em Dia', value: onTimeCount, color: '#13ec5b' },
            { name: 'Atraso', value: lateOnlyCount, color: '#f59e0b' },
            { name: 'Crítico', value: criticalCount, color: '#ef4444' }
        ];

        return {
            income,
            expense,
            balance,
            monthlyRevenue,
            weeklyFlow,
            paymentDistribution,
            onTimeCount,
            lateOnlyCount,
            criticalCount
        };
    }, [transactions, playersWithStatus]);

    const handleAddTransaction = async () => {
        if (!amount || !description) return;

        setIsLoading(true);
        try {
            const val = parseFloat(amount);
            const isExpense = transactionType === 'expense';
            const now = new Date();

            // Determine status
            const isAdmin = role === 'presidente' || role === 'vice-presidente' || role === 'admin';
            let initialStatus: 'paid' | 'pending' = 'paid';

            if (isExpense) {
                // Expenses need approval unless you are admin
                initialStatus = isAdmin ? 'paid' : 'pending';
            } else {
                // Income needs approval if you are NOT admin (e.g. player self-reporting)
                // BUT if it's "Mensalidade" launched by admin (via targetPlayerId), it's Paid.
                initialStatus = isAdmin ? 'paid' : 'pending';
            }

            const newTrans = await dataService.finance.add({
                type: transactionType,
                amount: val,
                description,
                category: category || (isExpense ? 'Outros' : 'Entrada'),
                date: now.toISOString(),
                status: initialStatus,
                createdByName: name, // Record who recorded it
                targetUserId: targetPlayerId || undefined,
                referenceMonth: category === 'Mensalidade' ? formMonth : (now.getMonth() + 1),
                referenceYear: category === 'Mensalidade' ? formYear : now.getFullYear()
            });

            setTargetPlayerId(null);
            setTransactions(prev => [newTrans, ...prev]);
            setShowAddModal(false);
            setAmount('');
            setDescription('');
            setCategory('');
        } catch (e: any) {
            console.error(e);
            alert(`Erro ao salvar: ${e.message || 'Dados inválidos'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteTransaction = async (id: number) => {
        if (!window.confirm('Deseja realmente excluir este lançamento? Esta ação não pode ser desfeita.')) return;

        try {
            await dataService.finance.delete(id);
            setTransactions(prev => prev.filter(t => t.id !== id));
        } catch (e: any) {
            console.error(e);
            alert('Erro ao excluir transação.');
        }
    };

    const handlePaymentSubmit = async () => {
        const val = parseFloat(paymentAmount);
        if (isNaN(val) || val <= 0) return;

        setIsLoading(true);
        try {
            const now = new Date();
            const isAdmin = role === 'presidente' || role === 'vice-presidente' || role === 'admin';

            // Logic for months and credits
            let mToPay = 1;
            let credit = 0;
            let complement = 0;

            if (val > monthlyFee) {
                mToPay = Math.floor(val / monthlyFee);
                credit = val % monthlyFee;
                if (!window.confirm(`Você está pagando ${mToPay} meses. Sobrará R$ ${credit.toFixed(2)} de crédito. Confirmar?`)) {
                    setIsLoading(false);
                    return;
                }
            } else if (val < monthlyFee) {
                complement = monthlyFee - val;
                alert(`Atenção: O valor de R$ ${val.toFixed(2)} é insuficiente. Você precisará depositar mais R$ ${complement.toFixed(2)} para completar a mensalidade.`);
            }

            // Create transaction(s) - for simplicity we create one main transaction
            // If multiple months, in a real scenario we might split or use a reference
            const newTrans = await dataService.finance.add({
                type: 'income',
                amount: val,
                description: `Mensalidade - ${name}${complement > 0 ? ' (Parcial)' : ''}`,
                category: 'Mensalidade',
                date: now.toISOString(),
                status: 'pending', // Always pending for players
                createdByName: name,
                targetUserId: undefined, // It's for current user
                referenceMonth: formMonth,
                referenceYear: formYear
            });

            setTransactions(prev => [newTrans, ...prev]);
            setShowPaymentModal(false);
            setPaymentAmount('');
            setPaymentStep('options');
            alert(complement > 0 ? 'Depósito registrado. Aguardando complemento e validação.' : 'Pagamento enviado para validação dos administradores!');
        } catch (e: any) {
            alert(`Erro: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setPaymentFile(file);
        setIsExtracting(true);

        // Simulating OCR Extraction
        setTimeout(() => {
            setPaymentAmount(monthlyFee.toString()); // Extracting the exact fee for simulation
            setIsExtracting(false);
            setPaymentStep('confirm');
        }, 2000);
    };

    const copyPix = () => {
        if (!receiverData.pixKey) return;
        navigator.clipboard.writeText(receiverData.pixKey);
        alert('Chave PIX copiada!');
    };

    const handleAddCharge = async () => {
        if (!chargeTitle || !chargeAmount) return;

        setIsLoading(true);
        try {
            const newCharge = await dataService.finance.charges.add({
                title: chargeTitle,
                amount: parseFloat(chargeAmount),
                type: chargeType
            });

            setActiveCharges(prev => [newCharge, ...prev]);
            setShowChargeModal(false);
            setChargeTitle('');
            setChargeAmount('');
        } catch (e) {
            alert('Erro ao lançar cobrança.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateSettings = async () => {
        setIsLoading(true);
        try {
            const fee = parseFloat(newFeeValue);
            const day = parseInt(newDueDay);
            const lDay = parseInt(newLaunchDay);

            await dataService.finance.updateSettings({
                monthlyFee: fee,
                dueDay: day,
                launchDay: lDay,
                feeStartDate: newFeeStartDate
            });

            if (fee > 0) setMonthlyFee(fee);
            if (day > 0 && day <= 31) setDueDay(day);
            if (lDay > 0 && lDay <= 31) setLaunchDay(lDay);
            if (newFeeStartDate) setFeeStartDate(newFeeStartDate);

            setShowSettingsModal(false);
            alert('Configurações atualizadas!');
        } catch (e) {
            alert('Erro ao salvar no banco de dados.');
        } finally {
            setIsLoading(false);
        }
    };

    const validateExpense = async (id: number, approved: boolean) => {
        setIsLoading(true);
        try {
            const newStatus = approved ? 'paid' : 'rejected';
            await dataService.finance.updateStatus(id, newStatus);

            setTransactions(prev => prev.map(t =>
                t.id === id ? { ...t, status: newStatus as any } : t
            ));
        } catch (err: any) {
            alert(err.message || 'Erro ao atualizar status');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateReceiver = async () => {
        setIsLoading(true);
        try {
            await dataService.finance.receiver.update(receiverData as any);
            alert('Dados da conta atualizados!');
        } catch (e) {
            alert('Erro ao atualizar dados.');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDocument = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 14);
        if (digits.length <= 11) {
            return digits
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})/, '$1-$2');
        }
        return digits
            .replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d{1,2})/, '$1-$2');
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
                setPendingMembers(prev => prev.filter(m => m.id !== member.id));
                alert(approved ? 'Membro aprovado com sucesso!' : 'Solicitação rejeitada.');
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
    const pendingPayments = transactions.filter(t => t.type === 'income' && t.status === 'pending');

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

            <main className="px-4 pb-4">
                {/* Balance Card */}
                <div className="flex flex-col gap-1 rounded-2xl p-6 bg-card-dark shadow-lg border border-[#2a4030] relative overflow-hidden group mb-6">
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
                                    R$ {stats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                            <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded">
                                <span className="text-[10px] text-slate-400 uppercase">Lançamento:</span>
                                <span className="text-xs font-bold text-orange-400">Dia {launchDay}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex flex-col gap-2 rounded-2xl p-4 bg-surface-dark border border-[#2a4030]">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined text-lg">arrow_downward</span>
                            </div>
                            <p className="text-gray-300 text-sm font-medium">Entradas</p>
                        </div>
                        {isLoading ? <div className="h-6 w-20 bg-white/10 animate-pulse rounded"></div> :
                            <p className="text-white tracking-tight text-xl font-bold">+R$ {stats.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
                            <p className="text-white tracking-tight text-xl font-bold">-R$ {stats.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        }
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mb-8">
                    <button
                        onClick={() => openModal('expense')}
                        className="flex-1 flex items-center justify-center gap-1.5 h-12 px-2 rounded-full bg-primary hover:bg-primary-dark transition-colors text-background-dark text-[11px] font-black uppercase shadow-[0_0_15px_rgba(19,236,91,0.3)]"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        <span className="truncate">Despesa</span>
                    </button>
                    <button
                        onClick={() => {
                            setPaymentStep('options');
                            setShowPaymentModal(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 h-12 px-2 rounded-full bg-surface-dark hover:bg-[#2a4030] border border-primary/30 transition-colors text-primary text-[11px] font-black uppercase"
                    >
                        <span className="material-symbols-outlined text-lg">payments</span>
                        <span className="truncate">Pagamento</span>
                    </button>
                    {(role === 'presidente' || role === 'vice-presidente' || role === 'admin') && (
                        <button
                            onClick={openChargeModal}
                            className="flex-1 flex items-center justify-center gap-1.5 h-12 px-2 rounded-full bg-orange-500 hover:bg-orange-600 transition-colors text-background-dark text-[11px] font-black uppercase shadow-lg shadow-orange-500/20"
                        >
                            <span className="material-symbols-outlined text-lg">send_and_archive</span>
                            <span className="truncate">Cobrança</span>
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="mb-4 sticky top-[72px] z-30">
                    <div className="flex h-12 w-full items-center rounded-full bg-surface-dark p-1 border border-[#2a4030] shadow-lg">
                        <button
                            onClick={() => setActiveTab('transactions')}
                            className={`flex-1 h-full rounded-full text-sm font-medium transition-all ${activeTab === 'transactions' ? 'bg-background-dark text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            Transações
                        </button>
                        <button
                            onClick={() => setActiveTab('status')}
                            className={`flex-1 h-full rounded-full text-sm font-medium transition-all ${activeTab === 'status' ? 'bg-background-dark text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            Semáforo
                        </button>
                        {(role === 'admin' || role === 'presidente' || role === 'vice-presidente') && (
                            <>
                                <button
                                    onClick={() => setActiveTab('validations')}
                                    className={`flex-1 h-full rounded-full text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${activeTab === 'validations' ? 'bg-background-dark text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Aprovações
                                    {(pendingExpenses.length > 0 || pendingMembers.length > 0 || pendingPayments.length > 0) && <span className="size-2 rounded-full bg-danger block animate-pulse"></span>}
                                </button>
                                <button
                                    onClick={() => setActiveTab('account')}
                                    className={`flex-1 h-full rounded-full text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${activeTab === 'account' ? 'bg-background-dark text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Conta
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {activeTab === 'transactions' && (
                    <div className="flex flex-col gap-4 pb-8">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider px-2">Atividade Recente</p>
                        {isLoading && <div className="h-16 w-full bg-white/5 rounded-2xl animate-pulse" />}
                        {!isLoading && transactions.length === 0 && <p className="text-center py-10 text-slate-500">Nenhuma transação registrada.</p>}
                        {transactions.map((t) => (
                            <div key={t.id} className="flex items-center gap-4 p-4 rounded-2xl bg-card-dark border border-[#2a4030]">
                                <div className={`size-12 rounded-full flex items-center justify-center shrink-0 ${t.type === 'expense' ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>
                                    <span className="material-symbols-outlined">{t.type === 'expense' ? 'receipt_long' : 'payments'}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-white font-medium truncate">{t.description}</p>
                                        {t.status === 'pending' && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 rounded uppercase font-black">Validando</span>}
                                    </div>
                                    <p className="text-gray-500 text-xs">
                                        {new Date(t.date).toLocaleDateString()}
                                        {t.createdByName && <span className="ml-2 text-slate-600 italic">| Por: {t.createdByName}</span>}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className={`font-black ${t.type === 'expense' ? 'text-white' : 'text-primary'}`}>
                                        {t.type === 'expense' ? '-' : '+'}R$ {t.amount.toFixed(2)}
                                    </p>
                                    {(role === 'presidente' || role === 'vice-presidente' || role === 'admin') && (
                                        <button
                                            onClick={() => handleDeleteTransaction(t.id)}
                                            className="text-slate-600 hover:text-red-500 transition-colors mt-1"
                                            title="Excluir Lançamento"
                                        >
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'status' && (
                    <div className="flex flex-col gap-4 pb-20">
                        <div className="bg-surface-dark border border-white/10 rounded-2xl p-4 mb-4">
                            <h4 className="text-white font-bold text-sm mb-1">Controle de Mensalidades</h4>
                            <p className="text-slate-400 text-xs mb-3">Vencimento: Dia {dueDay}</p>
                            <div className="flex gap-2 text-[10px] font-bold uppercase text-center">
                                <div className="flex-1 bg-primary/20 text-primary rounded py-1">Em dia</div>
                                <div className="flex-1 bg-yellow-500/20 text-yellow-500 rounded py-1">Atrasado</div>
                                <div className="flex-1 bg-red-500/20 text-red-500 rounded py-1">Crítico</div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-wider px-2">Situação dos Atletas</p>
                            {playersWithStatus.length === 0 && <p className="text-center py-10 text-slate-500">Nenhum atleta vinculado ao time.</p>}
                            {playersWithStatus.map(player => (
                                <div key={player.id} className="flex items-center gap-4 p-4 rounded-2xl bg-card-dark border border-[#2a4030]">
                                    <div
                                        className="relative cursor-pointer hover:scale-105 transition-transform active:scale-95"
                                        onClick={() => {
                                            setSelectedPlayerForHistory(player);
                                            setShowHistoryModal(true);
                                        }}
                                    >
                                        <div className="size-12 rounded-full border border-white/10 overflow-hidden">
                                            <img src={player.avatar || 'https://via.placeholder.com/150'} alt={player.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-card-dark" style={{ backgroundColor: player.statusColor }}></div>
                                        {player.monthsAhead > 0 && (
                                            <div className="absolute -top-1 -right-1 size-5 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-card-dark shadow-lg animate-pulse" title="Pagamento Adiantado">
                                                <span className="material-symbols-outlined text-[10px] text-white fill-1">star</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0" title={player.hoverMessage}>
                                        <p className="text-white font-bold truncate">{player.name}</p>
                                        <p className="text-[10px] uppercase font-black tracking-widest" style={{ color: player.statusColor }}>
                                            {player.statusText}
                                            {player.monthsOwed > 0 && <span className="ml-1 opacity-70">({player.monthsOwed}x)</span>}
                                            {player.monthsAhead > 0 && <span className="ml-1 opacity-70">(+{player.monthsAhead}m)</span>}
                                        </p>
                                    </div>
                                    {(role === 'presidente' || role === 'vice-presidente' || role === 'admin') && (
                                        <button
                                            onClick={() => {
                                                setAmount(monthlyFee.toString());
                                                setDescription(`Mensalidade - ${player.name}`);
                                                setCategory('Mensalidade');
                                                setTransactionType('income');
                                                setTargetPlayerId(player.id.toString());
                                                setShowAddModal(true);
                                            }}
                                            className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-background-dark transition-all"
                                            title="Lançar Pagamento"
                                        >
                                            <span className="material-symbols-outlined">payments</span>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {(role === 'presidente' || role === 'vice-presidente' || role === 'admin') && (
                            <div className="flex flex-col gap-3 mt-6">
                                <p className="text-gray-400 text-[10px] font-black uppercase tracking-wider px-2">Cobranças Ativas</p>
                                {activeCharges.length === 0 && <p className="text-center py-6 text-slate-500 text-xs">Nenhuma cobrança lançada.</p>}
                                {activeCharges.map(charge => (
                                    <div key={charge.id} className="flex items-center justify-between p-4 bg-surface-dark border border-white/5 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className={`size-10 rounded-full flex items-center justify-center ${charge.type === 'monthly' ? 'bg-primary/10 text-primary' : 'bg-orange-500/10 text-orange-400'}`}>
                                                <span className="material-symbols-outlined">{charge.type === 'monthly' ? 'calendar_month' : 'star'}</span>
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-sm">{charge.title}</p>
                                                <p className="text-slate-500 text-[10px] font-black uppercase">{charge.type === 'monthly' ? 'Mensalidade' : 'Taxa Extra'}</p>
                                            </div>
                                        </div>
                                        <p className="text-white font-black">R$ {charge.amount.toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'validations' && (
                    <div className="flex flex-col gap-6 pb-8">
                        {/* Member Approvals */}
                        {pendingMembers.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider px-2">Novos Membros</p>
                                {pendingMembers.map(member => (
                                    <div key={member.id} className="p-4 rounded-2xl bg-surface-dark border border-primary/30">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="size-12 rounded-full border border-white/10 overflow-hidden bg-background-dark">
                                                <img src={member.avatar || ''} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <p className="text-white font-bold">{member.name}</p>
                                                <p className="text-[10px] text-primary uppercase font-black">{member.role}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleApproveMember(member, false)} className="flex-1 py-2 bg-white/5 text-red-500 text-xs font-bold rounded-lg">Recusar</button>
                                            <button onClick={() => handleApproveMember(member, true)} className="flex-1 py-2 bg-primary text-background-dark text-xs font-bold rounded-lg">Aprovar</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Payment Approvals */}
                        <div className="space-y-3">
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider px-2">Pagamentos de Atletas</p>
                            {pendingPayments.length === 0 && <p className="text-center py-6 text-slate-500 text-xs border border-dashed border-white/5 rounded-2xl">Nenhum pagamento pendente.</p>}
                            {pendingPayments.map(payment => (
                                <div key={payment.id} className="p-4 rounded-2xl bg-surface-dark border border-primary/20">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="text-white font-bold">{payment.description}</p>
                                            <p className="text-[10px] text-slate-500 uppercase font-black">
                                                {payment.referenceMonth ? `Referência: ${payment.referenceMonth}/${payment.referenceYear}` : 'Taxa Avulsa'}
                                            </p>
                                        </div>
                                        <p className="text-primary font-black text-lg">R$ {payment.amount.toFixed(2)}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => validateExpense(payment.id, false)} className="flex-1 py-2 bg-white/5 text-red-500 text-xs font-bold rounded-lg">Rejeitar</button>
                                        <button onClick={() => validateExpense(payment.id, true)} className="flex-1 py-2 bg-primary/20 text-primary text-xs font-bold rounded-lg border border-primary/30">Validar</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Expense Approvals */}
                        {pendingExpenses.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider px-2">Despesas (Saídas)</p>
                                {pendingExpenses.map(exp => (
                                    <div key={exp.id} className="p-4 rounded-2xl bg-surface-dark border border-orange-500/20">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="text-white font-bold">{exp.description}</p>
                                                <p className="text-[10px] text-slate-500 uppercase font-black">{exp.category}</p>
                                            </div>
                                            <p className="text-white font-black text-lg">R$ {exp.amount.toFixed(2)}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => validateExpense(exp.id, false)} className="flex-1 py-2 bg-white/5 text-red-500 text-xs font-bold rounded-lg">Recusar</button>
                                            <button onClick={() => validateExpense(exp.id, true)} className="flex-1 py-2 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-lg border border-orange-500/30">Aprovar</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'account' && (role === 'admin' || role === 'presidente' || role === 'vice-presidente') && (
                    <div className="flex flex-col gap-6 pb-20">
                        <div className="bg-surface-dark border border-white/10 rounded-[32px] p-6 shadow-xl">
                            <h3 className="text-white font-black italic uppercase text-lg mb-2">Dados do Recebedor</h3>
                            <p className="text-slate-500 text-[10px] font-black uppercase mb-6 tracking-widest leading-tight">Estes dados serão usados para validar automaticamente os comprovantes dos atletas.</p>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase px-1">Nome Completo</label>
                                    <input
                                        className="w-full bg-background-dark border border-white/5 rounded-2xl px-4 py-3 text-white font-bold"
                                        value={receiverData.ownerName} onChange={e => setReceiverData({ ...receiverData, ownerName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase">Digite o CPF ou CNPJ do recebedor</label>
                                        {receiverData.documentNumber.replace(/\D/g, '').length > 0 && (
                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${receiverData.documentNumber.replace(/\D/g, '').length > 11 ? 'bg-orange-500/20 text-orange-400' : 'bg-primary/20 text-primary'}`}>
                                                {receiverData.documentNumber.replace(/\D/g, '').length > 11 ? 'CNPJ' : 'CPF'}
                                            </span>
                                        )}
                                    </div>
                                    <input
                                        className="w-full bg-background-dark border border-white/5 rounded-2xl px-4 py-3 text-white font-bold"
                                        placeholder="000.000.000-00"
                                        value={receiverData.documentNumber}
                                        onChange={e => setReceiverData({ ...receiverData, documentNumber: formatDocument(e.target.value) })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase px-1">Agência</label>
                                        <input
                                            className="w-full bg-background-dark border border-white/5 rounded-2xl px-4 py-3 text-white font-bold"
                                            value={receiverData.agency} onChange={e => setReceiverData({ ...receiverData, agency: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase px-1">Conta (com dígito)</label>
                                        <input
                                            className="w-full bg-background-dark border border-white/5 rounded-2xl px-4 py-3 text-white font-bold"
                                            value={receiverData.accountNumber} onChange={e => setReceiverData({ ...receiverData, accountNumber: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase px-1">Instituição (Banco)</label>
                                    <input
                                        className="w-full bg-background-dark border border-white/5 rounded-2xl px-4 py-3 text-white font-bold"
                                        value={receiverData.institution} onChange={e => setReceiverData({ ...receiverData, institution: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase px-1">Chave PIX</label>
                                    <input
                                        className="w-full bg-background-dark border border-white/5 rounded-2xl px-4 py-3 text-white font-bold"
                                        value={receiverData.pixKey} onChange={e => setReceiverData({ ...receiverData, pixKey: e.target.value })}
                                    />
                                </div>

                                <button
                                    onClick={handleUpdateReceiver}
                                    className="w-full bg-primary py-4 rounded-2xl text-background-dark font-black uppercase text-xs shadow-lg shadow-primary/20 mt-4 active:scale-95 transform transition-transform"
                                >
                                    Salvar Dados Oficiais
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Modals */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-surface-dark w-full max-w-sm rounded-3xl border border-white/10 p-6 shadow-2xl">
                        <h3 className="text-white text-xl font-black mb-6 italic uppercase tracking-wider">
                            {transactionType === 'expense' ? 'Add Saída' : 'Add Entrada'}
                        </h3>
                        <div className="space-y-4 mb-8">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase">Descrição</label>
                                <input
                                    className="w-full bg-background-dark border border-white/10 rounded-2xl px-4 py-4 text-white font-bold focus:ring-primary"
                                    value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Gelo, Bola..."
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase">Valor (R$)</label>
                                <input
                                    type="number" className="w-full bg-background-dark border border-white/10 rounded-2xl px-4 py-4 text-white text-2xl font-black focus:ring-primary"
                                    value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00"
                                />
                            </div>
                            {category === 'Mensalidade' && (
                                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
                                    <p className="text-[10px] font-black text-primary uppercase mb-3">Mês de Referência (Retroativo?)</p>
                                    <div className="flex gap-2">
                                        <select
                                            value={formMonth}
                                            onChange={e => setFormMonth(parseInt(e.target.value))}
                                            className="flex-1 bg-background-dark border border-white/10 rounded-lg p-2 text-xs font-bold text-white outline-none"
                                        >
                                            {monthsNames.map((m, i) => (
                                                <option key={m} value={i + 1}>{m}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={formYear}
                                            onChange={e => setFormYear(parseInt(e.target.value))}
                                            className="w-24 bg-background-dark border border-white/10 rounded-lg p-2 text-xs font-bold text-white outline-none"
                                        >
                                            {[2024, 2025, 2026, 2027].map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <p className="text-[8px] text-slate-500 mt-2 italic">* Lançamento realizado por: {name}</p>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-xs">Cancelar</button>
                            <button onClick={handleAddTransaction} className={`flex-1 py-4 rounded-2xl font-black uppercase text-xs text-background-dark ${transactionType === 'expense' ? 'bg-red-500 shadow-red-500/20' : 'bg-primary shadow-primary/20'} shadow-lg`}>Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {showChargeModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-surface-dark w-full max-w-sm rounded-[32px] border border-white/10 p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="size-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                <span className="material-symbols-outlined text-3xl">send_and_archive</span>
                            </div>
                            <h2 className="text-white text-xl font-black italic uppercase tracking-wider">Lançar Cobrança</h2>
                        </div>

                        <div
                            onClick={() => {
                                setChargeType('monthly');
                                setChargeAmount(monthlyFee.toString());
                                setChargeDueDay(dueDay.toString());
                                const now = new Date();
                                setChargeTitle(`Mensalidade ${monthsNames[now.getMonth()]}/${now.getFullYear()}`);
                            }}
                            className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 mb-6 hover:bg-orange-500/10 transition-colors cursor-pointer active:scale-95 transform"
                        >
                            <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1 items-center flex gap-1">
                                <span className="material-symbols-outlined text-xs">auto_awesome</span>
                                Atalho Inteligente
                            </p>
                            <p className="w-full text-left py-1 text-white font-bold text-sm">
                                Usar configuração mensal (R$ {monthlyFee.toFixed(2)})
                            </p>
                            <p className="text-[9px] text-slate-500 font-black uppercase mt-1 italic tracking-tight">Auto-Preencher: {monthsNames[new Date().getMonth()]} - Dia {dueDay}</p>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase">Título da Cobrança</label>
                                <input
                                    className="w-full bg-background-dark border border-white/10 rounded-2xl px-4 py-4 text-white font-bold focus:ring-orange-500"
                                    value={chargeTitle} onChange={e => setChargeTitle(e.target.value)} placeholder="Ex: Mensalidade Nov..."
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1 space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor (R$)</label>
                                    <input
                                        type="number" className="w-full bg-background-dark border border-white/10 rounded-2xl px-4 py-4 text-white text-xl font-black focus:ring-orange-500"
                                        value={chargeAmount} onChange={e => setChargeAmount(e.target.value)} placeholder="0,00"
                                    />
                                </div>
                                <div className="w-24 space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vencimento</label>
                                    <input
                                        type="number" min="1" max="31" className="w-full bg-background-dark border border-white/10 rounded-2xl px-4 py-4 text-white text-xl font-black focus:ring-orange-500 text-center"
                                        value={chargeDueDay} onChange={e => setChargeDueDay(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setChargeType('monthly');
                                        setChargeAmount(monthlyFee.toString());
                                        setChargeDueDay(dueDay.toString());
                                    }}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${chargeType === 'monthly' ? 'bg-primary text-background-dark shadow-primary/20 shadow-lg' : 'bg-white/5 text-slate-500'}`}
                                >
                                    Mensalidade
                                </button>
                                <button onClick={() => setChargeType('extra')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${chargeType === 'extra' ? 'bg-orange-500 text-background-dark shadow-orange-500/20 shadow-lg' : 'bg-white/5 text-slate-500'}`}>Taxa Extra</button>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowChargeModal(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-xs">Sair</button>
                            <button onClick={handleAddCharge} className="flex-1 py-4 rounded-2xl bg-orange-500 text-background-dark font-black uppercase text-xs shadow-lg shadow-orange-500/20 transform active:scale-95 transition-transform">Lançar Agora</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SETTINGS MODAL --- */}
            {showSettingsModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-surface-dark w-full max-w-sm rounded-[32px] border border-white/10 p-8 shadow-2xl">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined text-3xl">settings</span>
                            </div>
                            <h3 className="text-white text-xl font-black italic uppercase tracking-wider">Configurações</h3>
                        </div>

                        <div className="space-y-6 mb-10">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Mensalidade (R$)</label>
                                <input
                                    type="number"
                                    className="w-full bg-background-dark border border-white/10 rounded-2xl px-4 py-4 text-white text-2xl font-black focus:ring-primary"
                                    value={newFeeValue}
                                    onChange={(e) => setNewFeeValue(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Dia do Vencimento</label>
                                <input
                                    type="number"
                                    min="1" max="31"
                                    className="w-full bg-background-dark border border-white/10 rounded-2xl px-4 py-4 text-white text-2xl font-black focus:ring-primary"
                                    value={newDueDay}
                                    onChange={(e) => setNewDueDay(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Dia de Lançamento (Auto)</label>
                                <input
                                    type="number"
                                    min="1" max="31"
                                    className="w-full bg-background-dark border border-white/10 rounded-2xl px-4 py-4 text-white text-2xl font-black focus:ring-orange-500"
                                    value={newLaunchDay}
                                    onChange={(e) => setNewLaunchDay(e.target.value)}
                                />
                                <p className="text-[9px] text-slate-500 mt-2 px-1 italic">* Dia que o sistema dispara a cobrança do mês.</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Início da Cobrança</label>
                                <input
                                    type="date"
                                    className="w-full bg-background-dark border border-white/10 rounded-2xl px-4 py-4 text-white font-bold text-center focus:ring-primary"
                                    value={newFeeStartDate}
                                    onChange={(e) => setNewFeeStartDate(e.target.value)}
                                />
                                <p className="text-[9px] text-slate-500 mt-2 px-1 italic">* O sistema calcula dívidas APENAS a partir desta data.</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setShowSettingsModal(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-xs">Sair</button>
                            <button onClick={handleUpdateSettings} className="flex-1 py-4 rounded-2xl bg-primary text-background-dark font-black uppercase text-xs shadow-lg shadow-primary/20">Salvar Mudanças</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- REPORT MODAL --- */}
            {showReportModal && (
                <div className="fixed inset-0 z-[120] flex flex-col bg-background-dark animate-in fade-in slide-in-from-bottom duration-300">
                    <header className="flex items-center p-4 py-6 border-b border-white/5">
                        <button onClick={() => setShowReportModal(false)} className="size-12 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors">
                            <span className="material-symbols-outlined text-3xl">close</span>
                        </button>
                        <h2 className="flex-1 text-center font-black italic uppercase text-xl">Relatórios</h2>
                        <div className="size-12"></div>
                    </header>

                    <main className="flex-1 overflow-y-auto no-scrollbar p-6 pb-20">
                        {/* Summary Box */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-surface-dark border border-white/5 p-5 rounded-3xl relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 opacity-5">
                                    <span className="material-symbols-outlined text-6xl">account_balance</span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 relative z-10">Caixa Total</p>
                                <p className="text-2xl font-black text-primary relative z-10">R$ {stats.balance.toFixed(2)}</p>
                            </div>
                            <div className="bg-surface-dark border border-white/5 p-5 rounded-3xl relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 opacity-5">
                                    <span className="material-symbols-outlined text-6xl">payments</span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 relative z-10">Este Mês</p>
                                <p className="text-2xl font-black text-white relative z-10">R$ {stats.monthlyRevenue.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Chart: Weekly Cash Flow */}
                        <div className="bg-surface-dark border border-white/5 p-6 rounded-[32px] mb-8">
                            <h3 className="text-white font-black italic uppercase text-sm mb-8 flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">calendar_view_week</span>
                                Fluxo de Entradas
                            </h3>
                            <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.weeklyFlow}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                        <XAxis dataKey="name" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                                        <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#102216', border: '1px solid #13ec5b10', borderRadius: '16px' }}
                                            cursor={{ fill: '#ffffff02' }}
                                        />
                                        <Bar dataKey="value" fill="#13ec5b" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Payments Distribution */}
                        <div className="bg-surface-dark border border-white/5 p-6 rounded-[32px] mb-8">
                            <h3 className="text-white font-black italic uppercase text-sm mb-8 flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">pie_chart</span>
                                Pagadores Ativos
                            </h3>
                            <div className="flex items-center gap-6">
                                <div className="h-44 w-44">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={stats.paymentDistribution}
                                                innerRadius={50}
                                                outerRadius={65}
                                                paddingAngle={8}
                                                dataKey="value"
                                                labelLine={false}
                                                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                                    const RADIAN = Math.PI / 180;
                                                    const radius = innerRadius + (outerRadius - innerRadius) * 1.5;
                                                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                                    const fillColor = stats.paymentDistribution[index].color;

                                                    return (
                                                        <text
                                                            x={x}
                                                            y={y}
                                                            fill={fillColor}
                                                            textAnchor={x > cx ? 'start' : 'end'}
                                                            dominantBaseline="central"
                                                            className="text-[10px] font-black"
                                                        >
                                                            {`${(percent * 100).toFixed(0)}%`}
                                                        </text>
                                                    );
                                                }}
                                            >
                                                {stats.paymentDistribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#102216', border: '1px solid #13ec5b10', borderRadius: '12px', fontSize: '10px' }}
                                                itemStyle={{ fontWeight: 'bold' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex-1 space-y-4">
                                    {(() => {
                                        const total = stats.onTimeCount + stats.lateOnlyCount + stats.criticalCount;
                                        const getPct = (val: number) => total > 0 ? Math.round((val / total) * 100) : 0;

                                        return (
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="size-2.5 rounded-full bg-[#13ec5b] shadow-[0_0_8px_#13ec5b]"></div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black uppercase text-slate-400">Em dia</span>
                                                            <span className="text-[8px] text-primary font-bold">{getPct(stats.onTimeCount)}% do total</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm font-black text-white">{stats.onTimeCount}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="size-2.5 rounded-full bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]"></div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black uppercase text-slate-400">Atraso</span>
                                                            <span className="text-[8px] text-orange-400 font-bold">{getPct(stats.lateOnlyCount)}% do total</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm font-black text-white">{stats.lateOnlyCount}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="size-2.5 rounded-full bg-[#ef4444] shadow-[0_0_8px_#ef4444]"></div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black uppercase text-slate-400">Crítico</span>
                                                            <span className="text-[8px] text-red-400 font-bold">{getPct(stats.criticalCount)}% do total</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm font-black text-white">{stats.criticalCount}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                    <div className="h-px bg-white/5 w-full"></div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase text-slate-500">Total Plantel</span>
                                        <span className="text-sm font-black text-white">{allPlayers.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Member List */}
                        <div className="bg-surface-dark border border-white/5 rounded-[32px] overflow-hidden">
                            <div className="p-5 border-b border-white/5 bg-white/5">
                                <h3 className="text-white font-black italic uppercase text-xs tracking-widest">Status Individual</h3>
                            </div>
                            <div className="divide-y divide-white/5">
                                {allPlayers.map((p, idx) => (
                                    <div key={p.id} className="p-5 flex items-center gap-4 group">
                                        <div className="size-12 rounded-full border border-white/10 overflow-hidden shrink-0">
                                            <img src={p.avatar} alt={p.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-black italic uppercase truncate">{p.name}</p>
                                            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">{p.position}</p>
                                        </div>
                                        <span className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-wider ${idx % 3 === 0 ? 'bg-red-500 text-white' : 'bg-primary/20 text-primary border border-primary/30'}`}>
                                            {idx % 3 === 0 ? 'Pendente' : 'Confirmado'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </main>
                </div>
            )}

            {/* Player History Modal */}
            {showHistoryModal && selectedPlayerForHistory && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-background-dark/95 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)}></div>
                    <div className="relative w-full max-w-lg bg-card-dark border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="p-6 border-b border-white/5 flex items-center gap-4">
                            <div className="size-16 rounded-full border-2 border-primary/20 overflow-hidden">
                                <img src={selectedPlayerForHistory.avatar || 'https://via.placeholder.com/150'} alt={selectedPlayerForHistory.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-black text-xl italic uppercase leading-none">{selectedPlayerForHistory.name}</h3>
                                <p className="text-primary text-[10px] font-black uppercase tracking-widest mt-1">Histórico de Pagamentos</p>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} className="size-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-all">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-4">
                                {transactions
                                    .filter(t => t.targetUserId === selectedPlayerForHistory.id && t.type === 'income')
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map((t, idx) => (
                                        <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                                            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <span className="material-symbols-outlined">payments</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <p className="text-white font-bold truncate text-sm">{t.description}</p>
                                                    <p className="text-primary font-black text-sm whitespace-nowrap">R$ {t.amount.toFixed(2)}</p>
                                                </div>
                                                <div className="flex items-center justify-between text-[10px] text-slate-500 italic uppercase font-medium">
                                                    <p>{new Date(t.date).toLocaleDateString()}</p>
                                                    <div className="flex items-center gap-3">
                                                        {t.referenceMonth && (
                                                            <p className="text-primary/70">{monthsNames[t.referenceMonth - 1]}/{t.referenceYear}</p>
                                                        )}
                                                        {(role === 'presidente' || role === 'vice-presidente' || role === 'admin') && (
                                                            <button
                                                                onClick={() => handleDeleteTransaction(t.id)}
                                                                className="text-slate-600 hover:text-red-500 transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-[14px]">delete</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                {transactions.filter(t => t.targetUserId === selectedPlayerForHistory.id && t.type === 'income').length === 0 && (
                                    <div className="text-center py-12">
                                        <div className="size-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-slate-600">
                                            <span className="material-symbols-outlined text-4xl">history_toggle_off</span>
                                        </div>
                                        <p className="text-slate-500 text-sm font-medium italic">Nenhum pagamento registrado.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 bg-white/5 flex flex-col gap-2">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 px-1">
                                <span>Total Pago</span>
                                <span className="text-primary text-lg">
                                    R$ {transactions
                                        .filter(t => t.targetUserId === selectedPlayerForHistory.id && t.type === 'income' && t.status === 'paid')
                                        .reduce((acc, t) => acc + t.amount, 0)
                                        .toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Robust Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-background-dark/95 backdrop-blur-md" onClick={() => setShowPaymentModal(false)}></div>
                    <div className="relative w-full max-w-sm bg-card-dark border border-white/10 rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in duration-300">

                        {/* Header */}
                        <div className="p-6 pb-2 flex justify-between items-center">
                            <h3 className="text-white font-black italic uppercase text-lg tracking-widest">Realizar Pagamento</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="size-10 rounded-full bg-white/5 flex items-center justify-center text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6">
                            {paymentStep === 'options' && (
                                <div className="space-y-4">
                                    <p className="text-slate-500 text-[10px] font-black uppercase text-center mb-6">Como deseja informar seu pagamento?</p>
                                    <button
                                        onClick={() => setPaymentStep('manual')}
                                        className="w-full p-6 rounded-3xl bg-white/5 border border-white/5 flex flex-col items-center gap-3 hover:bg-primary/5 hover:border-primary/20 transition-all group"
                                    >
                                        <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-3xl">edit_note</span>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-white font-black uppercase text-xs">Digitar Valor</p>
                                            <p className="text-slate-500 text-[9px] mt-1 italic">Informar valor manualmente</p>
                                        </div>
                                    </button>
                                    <div className="relative h-px bg-white/5 my-2">
                                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card-dark px-3 text-[10px] text-slate-600 font-black">OU</span>
                                    </div>
                                    <label className="w-full p-6 rounded-3xl bg-white/5 border border-white/5 flex flex-col items-center gap-3 hover:bg-primary/5 hover:border-primary/20 transition-all group cursor-pointer">
                                        <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                                        <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-3xl">upload_file</span>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-white font-black uppercase text-xs">Upload Comprovante</p>
                                            <p className="text-slate-500 text-[9px] mt-1 italic">Extração inteligente de dados</p>
                                        </div>
                                    </label>
                                </div>
                            )}

                            {isExtracting && (
                                <div className="py-20 flex flex-col items-center justify-center gap-4">
                                    <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                    <p className="text-primary font-black uppercase text-[10px] animate-pulse">Analisando Comprovante...</p>
                                </div>
                            )}

                            {paymentStep === 'manual' && (
                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase px-1">Valor do Depósito (R$)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-background-dark border border-white/5 rounded-2xl px-6 py-5 text-3xl font-black text-white focus:ring-primary"
                                            placeholder="0,00"
                                            value={paymentAmount}
                                            onChange={e => setPaymentAmount(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        onClick={() => setPaymentStep('confirm')}
                                        className="w-full bg-primary py-4 rounded-2xl text-background-dark font-black uppercase text-xs shadow-lg"
                                    >
                                        Continuar
                                    </button>
                                </div>
                            )}

                            {paymentStep === 'confirm' && (
                                <div className="space-y-6">
                                    {/* Bank Details View */}
                                    <div className="bg-surface-dark border border-primary/10 rounded-2xl p-4 space-y-3">
                                        <p className="text-[9px] font-black text-primary uppercase border-b border-primary/10 pb-2 mb-2">Dados para Transferência</p>
                                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                                            <div>
                                                <p className="text-slate-500 uppercase font-bold">Banco</p>
                                                <p className="text-white font-black">{receiverData.institution}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 uppercase font-bold">Favorecido</p>
                                                <p className="text-white font-black truncate">{receiverData.ownerName}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 uppercase font-bold">Agência/Conta</p>
                                                <p className="text-white font-black">{receiverData.agency} / {receiverData.accountNumber}</p>
                                            </div>
                                            <div onClick={copyPix} className="cursor-pointer group">
                                                <p className="text-slate-500 uppercase font-bold flex items-center gap-1">Chave PIX <span className="material-symbols-outlined text-[10px] group-hover:text-primary">content_copy</span></p>
                                                <p className="text-white font-black truncate">{receiverData.pixKey}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase px-1">Confirme o Valor</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="number"
                                                className="flex-1 bg-background-dark border border-white/5 rounded-2xl px-5 py-4 text-xl font-black text-white"
                                                value={paymentAmount}
                                                onChange={e => setPaymentAmount(e.target.value)}
                                            />
                                            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                                <span className="material-symbols-outlined">verified</span>
                                            </div>
                                        </div>
                                    </div>

                                    {parseFloat(paymentAmount) < monthlyFee && (
                                        <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl flex gap-3 text-orange-400">
                                            <span className="material-symbols-outlined">warning</span>
                                            <p className="text-[9px] font-bold leading-tight uppercase">Valor inferior à mensalidade de R$ {monthlyFee.toFixed(2)}. Será necessário completar depois.</p>
                                        </div>
                                    )}

                                    {parseFloat(paymentAmount) > monthlyFee && (
                                        <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl flex gap-3 text-primary">
                                            <span className="material-symbols-outlined">stars</span>
                                            <p className="text-[9px] font-bold leading-tight uppercase">Valor superior detectado. O excedente ficará como crédito!</p>
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setPaymentStep('options')}
                                            className="flex-1 py-4 text-slate-500 font-black uppercase text-xs"
                                        >
                                            Voltar
                                        </button>
                                        <button
                                            onClick={handlePaymentSubmit}
                                            disabled={isLoading}
                                            className="flex-[2] bg-primary py-4 rounded-2xl text-background-dark font-black uppercase text-xs shadow-lg shadow-primary/20 active:scale-95 transition-transform"
                                        >
                                            {isLoading ? 'Enviando...' : 'Confirmar e Enviar'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceScreen;