import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { dataService, LegacyGameEvent as GameEvent } from '../services/dataService';

const AgendaScreen = () => {
    const navigate = useNavigate();
    const { role, name } = useUser();

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date()); // Tracks the month being viewed
    const [selectedDate, setSelectedDate] = useState(new Date()); // Tracks the specific day selected

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    // Form State
    const [eventType, setEventType] = useState<'game' | 'bbq' | 'match' | 'meeting'>('game');
    const [recurrence, setRecurrence] = useState<'none' | 'week' | 'month' | 'year'>('none');
    const [formTitle, setFormTitle] = useState('');
    const [formDate, setFormDate] = useState('');
    const [formTime, setFormTime] = useState('');
    const [formLocation, setFormLocation] = useState('');

    // Attendance List
    const [viewingParticipants, setViewingParticipants] = useState<string | null>(null);
    const [participants, setParticipants] = useState<{ name: string, avatar: string, status: 'confirmed' | 'declined' }[]>([]);

    // Async Data
    const [isLoading, setIsLoading] = useState(true);
    const [events, setEvents] = useState<GameEvent[]>([]);

    const canCreateEvent = role === 'presidente' || role === 'vice-presidente';

    const loadEvents = async () => {
        setIsLoading(true);
        try {
            const [eventsData, playersData] = await Promise.all([
                dataService.events.list(),
                dataService.players.list()
            ]);

            // Transform birthdays into events
            const birthdayEvents: GameEvent[] = playersData
                .filter(p => p.birthDate)
                .map(p => {
                    const [y, m, d] = (p.birthDate as string).split('-').map(Number);
                    // Birthdays occur every year, but we only show them in the current/next years for the calendar
                    // For the calendar view, we'll generate the birthday for the year currently being viewed
                    const bdayDate = new Date(currentDate.getFullYear(), m - 1, d);
                    return {
                        id: `bday-${p.id}`,
                        type: 'birthday',
                        title: `Aniversário: ${p.name}`,
                        date: bdayDate.toISOString().split('T')[0],
                        time: '00:00',
                        location: 'AmaPlay',
                        confirmedCount: 0,
                        myStatus: 'pending',
                        creatorId: 'system',
                        createdAt: new Date().toISOString()
                    };
                });

            setEvents([...eventsData, ...birthdayEvents]);
        } catch (e) {
            console.error("Failed to load events", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadEvents();
    }, [currentDate]);

    useEffect(() => {
        if (viewingParticipants) {
            dataService.events.getParticipants(viewingParticipants).then(setParticipants);
        }
    }, [viewingParticipants]);

    // --- Calendar Logic ---
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 = Sunday

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    const hasEventOnDay = (day: number) => {
        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dayEvents = events.filter(e => {
            const evtDate = new Date(e.date + 'T00:00:00');
            return isSameDay(evtDate, checkDate);
        });

        if (dayEvents.length === 0) return null;

        const types = dayEvents.map(e => e.type);
        if (types.includes('game')) return 'bg-primary';
        if (types.includes('bbq')) return 'bg-orange-400';
        if (types.includes('match') || types.includes('meeting')) return 'bg-blue-400';
        if (types.includes('birthday')) return 'bg-pink-400';
        return 'bg-slate-400';
    };

    const selectedEvents = useMemo(() => {
        return events.filter(e => {
            const evtDate = new Date(e.date);
            return isSameDay(evtDate, selectedDate);
        }).sort((a, b) => a.time.localeCompare(b.time));
    }, [events, selectedDate]);


    // --- Event Handling ---
    const handleOpenMap = (location: string) => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank');
    };

    const handleCreateEvent = async () => {
        if (!formTitle || !formDate || !formTime || !formLocation) return;

        setIsLoading(true);
        try {
            const newEventPayload = {
                type: eventType,
                title: (eventType === 'game' || eventType === 'match') ? (eventType === 'game' ? 'Amistoso' : 'Pelada') : formTitle,
                opponent: (eventType === 'game') ? formTitle : undefined,
                date: formDate,
                time: formTime,
                location: formLocation,
                confirmedCount: 1,
                myStatus: 'confirmed' as const,
                creatorId: 'me'
            };

            await dataService.events.addMultiple(newEventPayload, recurrence);
            await loadEvents();
            setShowAddModal(false);

            // Reset Form
            setFormTitle('');
            setFormDate('');
            setFormTime('');
            setFormLocation('');
            setRecurrence('none');

            // Show Feedback Toast
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 4000);
        } catch (e: any) {
            alert('Erro ao criar evento: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleStatus = async (id: number | string, status: 'confirmed' | 'declined') => {
        if (typeof id === 'string' && id.startsWith('bday')) return; // Can't RSVP to birthdays
        try {
            await dataService.events.updateStatus(id, status);
            // Reload to get fresh data
            await loadEvents();
        } catch (e) {
            console.error("Failed to update status");
        }
    };

    const handleInvite = (event: GameEvent) => {
        const text = encodeURIComponent(`Fala galera! Convite para o evento: *${event.title}* ${event.opponent ? `vs. ${event.opponent}` : ''}\n\n📅 Data: ${new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR')}\n⏰ Hora: ${event.time}\n📍 Local: ${event.location}\n\nConfirme sua presença no AmaPlay! ⚽🔥`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    return (
        <div className="bg-background-dark min-h-screen pb-24 relative">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-background-dark/95 backdrop-blur-sm border-b border-white/5 p-4 pb-2">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined text-white">arrow_back</span>
                    </button>
                    <h2 className="text-white text-lg font-bold leading-tight tracking-wide flex-1 text-center uppercase">AGENDA DO TIME</h2>

                    {canCreateEvent ? (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex size-10 items-center justify-center rounded-full bg-primary text-background-dark hover:bg-primary-dark transition-colors shadow-[0_0_15px_rgba(19,236,91,0.3)]"
                        >
                            <span className="material-symbols-outlined font-bold">add</span>
                        </button>
                    ) : (
                        <div className="size-10"></div>
                    )}
                </div>
            </div>

            {/* Calendar Widget */}
            <div className="p-4 bg-background-dark">
                <div className="flex items-center justify-between mb-4 px-2">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <h2 className="text-xl font-bold text-white capitalize">
                        {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-y-2 mb-2">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day) => (
                        <div key={day} className="text-center text-xs font-bold text-slate-500 uppercase py-1">{day}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-y-1">
                    {/* Empty cells for offset */}
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-10 w-full"></div>
                    ))}

                    {/* Days */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const currentDayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
                        const isSelected = isSameDay(selectedDate, currentDayDate);
                        const isToday = isSameDay(new Date(), currentDayDate);
                        const eventDotClass = hasEventOnDay(dayNum);

                        return (
                            <button
                                key={dayNum}
                                onClick={() => setSelectedDate(currentDayDate)}
                                className="relative h-10 w-full flex items-center justify-center"
                            >
                                <div className={`size-9 rounded-full flex items-center justify-center text-sm font-medium transition-all
                              ${isSelected ? 'bg-white text-background-dark font-bold scale-110 shadow-lg' :
                                        isToday ? 'border border-primary text-primary' : 'text-slate-300 hover:bg-white/5'}
                          `}>
                                    {dayNum}
                                </div>
                                {eventDotClass && !isSelected && (
                                    <div className={`absolute bottom-1.5 size-1.5 rounded-full ${eventDotClass}`}></div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="h-px bg-white/5 w-full my-2"></div>

            {/* Selected Day Events */}
            <div className="px-4 pt-2">
                <div className="flex items-baseline justify-between mb-4">
                    <h3 className="text-white font-bold text-lg capitalize">
                        {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h3>
                    {selectedEvents.length > 0 && (
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full uppercase tracking-wider">
                            {selectedEvents.length} Evento(s)
                        </span>
                    )}
                </div>

                <div className="flex flex-col gap-4">
                    {isLoading && (
                        <div className="flex flex-col gap-4">
                            {[1].map(i => <div key={i} className="h-40 w-full bg-white/5 rounded-2xl animate-pulse" />)}
                        </div>
                    )}

                    {!isLoading && selectedEvents.length > 0 ? (
                        selectedEvents.map(event => (
                            <div key={event.id} className="bg-surface-dark border border-white/5 rounded-2xl overflow-hidden shadow-lg animate-in slide-in-from-bottom-2">
                                {/* Card Header Image */}
                                <div className="h-28 w-full bg-cover bg-center relative"
                                    style={{
                                        backgroundImage: event.type === 'game'
                                            ? "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCcQGQP574tMjyXexx2zZZAIeDp2XDDNyVS_Ubikw_aRO84ArSHcM6pvLqM36KA8UzrgFQHd8-j6rSZkBFYnd1CbO-8vubXBy83LPPFfAKki5GC7tcAc0PBtmzmuR1KUhcDPYvwBzUAw8XyRdKpn0UJ-Zov8sRu6WLBTL8zCXjtyJWYAaEf6sU3OxGCobj69rsEZVrl3EsGtrEc8J6rcxG8eejNomKDYchCYOUjqllGFj3axBerSGFOpyH2i5wo7iylQBx5N5kkho8')"
                                            : "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBNoW6h5lgeCwkVbzVa2p-7s8VlYb75nb2kdjDEyDqTKvEt4WBiA8zOQfAHcMekilka2Rj7olYQew26k2aikJqcsVpgZboqI49SrFiYg8O5TRSmhfBSIfeKm7kHM4pSihcEP1cDE8yio6voOkdAkuUqY41sLghcaqum_TiNLgNDJTRH35Yo4EwHoY81m2rBrhpBCLQCzhtUVodzPljzj56x525jHVl9wxfQeifC6gR6LrChemvm0z6wKqptUFWd05YD7i4lHIEC5Q0')"
                                    }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-surface-dark/50 to-transparent"></div>
                                    <div className="absolute top-3 left-3 flex gap-2">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-background-dark ${event.type === 'game' ? 'bg-primary' : 'bg-orange-400'}`}>
                                            {event.type === 'game' ? 'Jogo' : 'Churrasco'}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-4 -mt-10 relative z-10">
                                    <div className="flex justify-between items-start mb-1">
                                        <h2 className="text-2xl font-black text-white leading-tight">
                                            {event.opponent ? `vs. ${event.opponent}` : event.title}
                                        </h2>
                                        <button
                                            onClick={() => handleInvite(event)}
                                            className="size-10 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform"
                                        >
                                            <span className="material-symbols-outlined filled">share</span>
                                        </button>
                                    </div>
                                    <p className="text-slate-400 text-sm font-medium mb-4">
                                        {event.type === 'game' ? 'Amistoso' : event.type === 'match' ? 'Pelada' : event.type === 'meeting' ? 'Reunião' : event.type === 'birthday' ? 'Aniversário' : 'Confraternização'}
                                    </p>

                                    <div className="flex flex-col gap-3 mb-4">
                                        <div className="flex items-center gap-3 text-sm text-slate-200">
                                            <span className="material-symbols-outlined text-primary">schedule</span>
                                            <span className="font-bold">{event.time}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-200">
                                            <span className="material-symbols-outlined text-primary">location_on</span>
                                            <div className="flex flex-col items-start">
                                                <span className="font-medium line-clamp-1">{event.location}</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleOpenMap(event.location); }}
                                                    className="text-xs text-primary font-bold hover:underline flex items-center gap-1 mt-0.5"
                                                >
                                                    Abrir no Google Maps
                                                    <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* RSVP Section */}
                                    {event.type !== 'birthday' && (
                                        <div className="bg-background-dark/50 rounded-xl p-3 border border-white/5">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sua Presença</span>
                                                <button
                                                    onClick={() => setViewingParticipants(String(event.id))}
                                                    className="flex items-center gap-1 group"
                                                >
                                                    <span className="material-symbols-outlined text-sm text-primary">group</span>
                                                    <span className="text-xs text-white font-bold underline group-hover:text-primary transition-colors">{event.confirmedCount} confirmados</span>
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => toggleStatus(event.id, 'declined')}
                                                    className={`py-2 rounded-lg text-sm font-bold border transition-all flex items-center justify-center gap-2 ${event.myStatus === 'declined'
                                                        ? 'bg-red-500/10 text-red-500 border-red-500'
                                                        : 'border-white/10 text-slate-400 hover:bg-white/5'
                                                        }`}
                                                >
                                                    <span className="material-symbols-outlined text-lg">close</span>
                                                    Não vou
                                                </button>
                                                <button
                                                    onClick={() => toggleStatus(event.id, 'confirmed')}
                                                    className={`py-2 rounded-lg text-sm font-bold border transition-all flex items-center justify-center gap-2 ${event.myStatus === 'confirmed'
                                                        ? 'bg-primary/10 text-primary border-primary shadow-[0_0_10px_rgba(19,236,91,0.2)]'
                                                        : 'bg-primary text-background-dark border-transparent hover:bg-primary-dark'
                                                        }`}
                                                >
                                                    <span className="material-symbols-outlined text-lg">check</span>
                                                    Confirmar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        !isLoading && (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-500 border-2 border-dashed border-white/5 rounded-2xl">
                                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">event_busy</span>
                                <p className="font-medium">Nada agendado para este dia.</p>
                                {canCreateEvent && (
                                    <button onClick={() => setShowAddModal(true)} className="text-primary text-sm font-bold mt-2 hover:underline">
                                        + Adicionar Evento
                                    </button>
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* --- ADD EVENT MODAL --- */}
            {showAddModal && canCreateEvent && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-surface-dark w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-white font-bold text-xl">Novo Evento</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Type Selector */}
                        <div className="flex bg-background-dark p-1 rounded-xl mb-6 border border-white/5 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setEventType('game')}
                                className={`flex-1 min-w-[80px] py-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${eventType === 'game' ? 'bg-primary text-background-dark font-bold' : 'text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined">sports_soccer</span>
                                <span className="text-[10px] uppercase">Jogo</span>
                            </button>
                            <button
                                onClick={() => setEventType('match')}
                                className={`flex-1 min-w-[80px] py-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${eventType === 'match' ? 'bg-blue-500 text-white font-bold' : 'text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined">groups</span>
                                <span className="text-[10px] uppercase">Pelada</span>
                            </button>
                            <button
                                onClick={() => setEventType('bbq')}
                                className={`flex-1 min-w-[80px] py-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${eventType === 'bbq' ? 'bg-orange-500 text-white font-bold' : 'text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined">outdoor_grill</span>
                                <span className="text-[10px] uppercase">Churras</span>
                            </button>
                            <button
                                onClick={() => setEventType('meeting')}
                                className={`flex-1 min-w-[80px] py-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${eventType === 'meeting' ? 'bg-purple-500 text-white font-bold' : 'text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined">groups_3</span>
                                <span className="text-[10px] uppercase">Reunião</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">
                                    {eventType === 'game' ? 'Adversário / Nome do Jogo' : 'Título do Evento'}
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary placeholder:text-slate-600"
                                    placeholder={eventType === 'game' ? "Ex: vs. Peladeiros FC" : "Ex: Aniversário do Capitão"}
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Data</label>
                                    <input
                                        type="date"
                                        className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary [color-scheme:dark]"
                                        value={formDate}
                                        onChange={(e) => setFormDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Horário</label>
                                    <input
                                        type="time"
                                        className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary [color-scheme:dark]"
                                        value={formTime}
                                        onChange={(e) => setFormTime(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Local</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="w-full bg-background-dark border border-white/10 rounded-xl pl-4 pr-12 py-3 text-white focus:ring-primary focus:border-primary placeholder:text-slate-600"
                                        placeholder="Digite o endereço ou nome do local"
                                        value={formLocation}
                                        onChange={(e) => setFormLocation(e.target.value)}
                                    />
                                    {formLocation && (
                                        <button
                                            onClick={() => handleOpenMap(formLocation)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:text-white"
                                            title="Testar no Maps"
                                        >
                                            <span className="material-symbols-outlined">map</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Repetir Evento</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'none', label: 'Não repetir' },
                                        { id: 'week', label: 'Toda Semana' },
                                        { id: 'month', label: 'Todo Mês' },
                                        { id: 'year', label: 'Todo Ano' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setRecurrence(opt.id as any)}
                                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${recurrence === opt.id ? 'bg-white/10 border-primary text-primary' : 'border-white/5 text-slate-500 bg-background-dark hover:border-white/10'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 py-3.5 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateEvent}
                                disabled={!formTitle || !formDate || !formTime || !formLocation || isLoading}
                                className={`flex-1 py-3.5 rounded-xl font-bold text-background-dark transition-all shadow-lg ${eventType === 'game' ? 'bg-primary hover:bg-primary-dark shadow-primary/20' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'
                                    } ${(!formTitle || !formDate || !formTime || !formLocation || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isLoading ? 'Criando...' : 'Criar e Convidar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PARTICIPANTS LIST MODAL --- */}
            {viewingParticipants && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-surface-dark w-full max-w-sm rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl flex flex-col h-[70vh] animate-in zoom-in-95 duration-200">
                        <div className="p-6 pb-2 flex justify-between items-center">
                            <h3 className="text-white font-bold text-xl uppercase italic">Lista de Chamada</h3>
                            <button onClick={() => setViewingParticipants(null)} className="text-slate-400 hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 pt-0 overflow-y-auto flex-1 no-scrollbar">
                            <div className="flex flex-col gap-4 mt-6">
                                <div className="flex justify-between items-center px-2">
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Confirmados ({participants.filter(p => p.status === 'confirmed').length})</span>
                                </div>
                                {participants.filter(p => p.status === 'confirmed').map((p, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                                        <div className="size-10 rounded-full border border-primary/30 overflow-hidden shrink-0">
                                            <img src={p.avatar || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                                        </div>
                                        <span className="text-white font-bold text-sm tracking-tight">{p.name}</span>
                                        <span className="material-symbols-outlined text-primary text-sm ml-auto">check_circle</span>
                                    </div>
                                ))}

                                <div className="h-px bg-white/5 my-2"></div>

                                <div className="flex justify-between items-center px-2">
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Não Vão ({participants.filter(p => p.status === 'declined').length})</span>
                                </div>
                                {participants.filter(p => p.status === 'declined').map((p, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 opacity-50">
                                        <div className="size-10 rounded-full border border-red-500/30 overflow-hidden shrink-0 filter grayscale">
                                            <img src={p.avatar || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                                        </div>
                                        <span className="text-white font-bold text-sm tracking-tight">{p.name}</span>
                                        <span className="material-symbols-outlined text-red-500 text-sm ml-auto">cancel</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SUCCESS TOAST */}
            {showSuccessToast && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-5 fade-in duration-300 w-[90%] max-w-sm">
                    <div className="bg-[#1a3023] border border-primary/30 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
                        <div className="size-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-background-dark text-lg font-bold">send</span>
                        </div>
                        <div>
                            <h4 className="font-bold text-sm">Evento Criado!</h4>
                            <p className="text-xs text-slate-300">Recorrência aplicada e notificações enviadas.</p>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AgendaScreen;