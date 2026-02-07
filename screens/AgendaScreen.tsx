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
    const [formEndTime, setFormEndTime] = useState('');
    const [formLocation, setFormLocation] = useState('');

    // Monthly & Detail Data
    const [birthdaysOfMonth, setBirthdaysOfMonth] = useState<{ id: string, name: string, avatar: string, day: number, date: string }[]>([]);
    const [selectedDetail, setSelectedDetail] = useState<GameEvent | null>(null);

    // Attendance List
    const [viewingParticipants, setViewingParticipants] = useState<string | null>(null);
    const [editingEventId, setEditingEventId] = useState<number | string | null>(null);
    const [participants, setParticipants] = useState<{ name: string, avatar: string, status: 'confirmed' | 'declined' }[]>([]);

    // Async Data
    const [isLoading, setIsLoading] = useState(true);
    const [events, setEvents] = useState<GameEvent[]>([]);
    const [nextEventsWithParts, setNextEventsWithParts] = useState<(GameEvent & { participants: any[] })[]>([]);

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

            const allEvents = [...eventsData, ...birthdayEvents];
            setEvents(allEvents);

            // Fetch participants for the NEXT upcoming events (not birthdays)
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            const futureEvents = eventsData
                .filter(e => new Date(e.date + 'T00:00:00') >= now)
                .sort((a, b) => new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime());

            if (futureEvents.length > 0) {
                const nextDate = futureEvents[0].date;
                const eventsOnNextDate = futureEvents.filter(e => e.date === nextDate);

                const eventsWithParts = await Promise.all(
                    eventsOnNextDate.map(async (e) => {
                        const parts = await dataService.events.getParticipants(e.id);
                        return { ...e, participants: parts };
                    })
                );
                setNextEventsWithParts(eventsWithParts);
            } else {
                setNextEventsWithParts([]);
            }

            // Filter birthdays for the current month view
            const monthlyBdays = playersData
                .filter(p => {
                    if (!p.birthDate) return false;
                    const month = (p.birthDate as string).split('-')[1];
                    return parseInt(month) === (currentDate.getMonth() + 1);
                })
                .map(p => ({
                    id: String(p.id),
                    name: p.name,
                    avatar: p.avatar,
                    day: parseInt((p.birthDate as string).split('-')[2]),
                    date: p.birthDate as string
                }))
                .sort((a, b) => a.day - b.day);
            setBirthdaysOfMonth(monthlyBdays);
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
            const evtDate = new Date(e.date + 'T12:00:00');
            return isSameDay(evtDate, selectedDate);
        }).sort((a, b) => a.time.localeCompare(b.time));
    }, [events, selectedDate]);


    // --- Event Handling ---
    const handleOpenMap = (location: string) => {
        if (!location) return;
        // Construct a direct Google Maps URL that is more likely to trigger the app on mobile
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
        window.open(url, '_blank');
    };

    const handleCreateEvent = async () => {
        if (!formTitle || !formDate || !formTime || !formLocation) return;

        setIsLoading(true);
        try {
            const eventPayload = {
                type: eventType,
                title: (eventType === 'game' || eventType === 'match') ? (eventType === 'game' ? 'Amistoso' : 'Pelada') : formTitle,
                opponent: (eventType === 'game') ? formTitle : undefined,
                date: formDate,
                time: formTime,
                endTime: formEndTime || undefined,
                location: formLocation,
                confirmedCount: 1,
                myStatus: 'confirmed' as const,
                creatorId: 'me'
            };

            if (editingEventId) {
                await dataService.events.update(editingEventId, eventPayload);
                setEditingEventId(null);
            } else {
                await dataService.events.addMultiple(eventPayload as any, recurrence);
            }

            await loadEvents();
            setShowAddModal(false);

            // Reset Form
            setFormTitle('');
            setFormDate('');
            setFormTime('');
            setFormEndTime('');
            setFormLocation('');
            setRecurrence('none');

            // Show Feedback Toast
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 4000);
        } catch (e: any) {
            alert('Erro ao salvar evento: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditEvent = (event: GameEvent) => {
        setEditingEventId(event.id);
        setEventType(event.type === 'birthday' ? 'match' : event.type as any);
        setFormTitle(event.opponent || event.title);
        setFormDate(event.date);
        setFormTime(event.time);
        setFormEndTime(event.endTime || '');
        setFormLocation(event.location);
        setRecurrence('none');
        setShowAddModal(true);
    };

    const handleDeleteEvent = async (id: number | string) => {
        if (!window.confirm('Tem certeza que deseja excluir este evento?')) return;
        setIsLoading(true);
        try {
            await dataService.events.delete(id);
            await loadEvents();
            setSelectedDetail(null);
        } catch (e: any) {
            alert('Erro ao excluir evento: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleStatus = async (id: number | string, status: 'confirmed' | 'declined') => {
        if (typeof id === 'string' && id.startsWith('bday')) return;

        const evt = events.find(e => e.id === id);
        if (evt && evt.endTime) {
            const endDateTime = new Date(evt.date + 'T' + evt.endTime);
            if (new Date() > endDateTime) {
                alert('Este evento já foi encerrado.');
                return;
            }
        }

        // 🚀 Optimistic Update
        const previousEvents = [...events];
        const previousDetail = selectedDetail;

        // Calculate changes locally first for instant feedback
        const updateEventLocally = (evt: GameEvent) => {
            const wasConfirmed = evt.myStatus === 'confirmed';
            const willBeConfirmed = status === 'confirmed';
            let newCount = evt.confirmedCount;

            if (wasConfirmed && !willBeConfirmed) newCount = Math.max(0, newCount - 1);
            if (!wasConfirmed && willBeConfirmed) newCount = newCount + 1;

            return { ...evt, myStatus: status, confirmedCount: newCount };
        };

        setEvents(prev => prev.map(e => e.id === id ? updateEventLocally(e) : e));

        if (selectedDetail && selectedDetail.id === id) {
            setSelectedDetail(updateEventLocally(selectedDetail));
        }

        try {
            await dataService.events.updateStatus(id, status);

            // ⏱️ Small delay to allow DB trigger to finish counting
            await new Promise(resolve => setTimeout(resolve, 300));

            // Fetch fresh data silently to ensure consistency
            const freshEvents = await dataService.events.list();
            setEvents(freshEvents);

            // Update details modal if open (sync with backend)
            if (selectedDetail && selectedDetail.id === id) {
                const updated = freshEvents.find(e => e.id === id);
                if (updated) setSelectedDetail(updated);
            }

            // Update participants list if open
            if (viewingParticipants === String(id)) {
                const freshParts = await dataService.events.getParticipants(id);
                setParticipants(freshParts);
            }
        } catch (e: any) {
            console.error("Failed to update status", e);
            // Revert changes on error
            setEvents(previousEvents);
            setSelectedDetail(previousDetail);
            alert("Erro ao confirmar presença. Tente novamente.");
        }
    };

    const handleInvite = async (event: GameEvent) => {
        try {
            setIsLoading(true);
            const parts = await dataService.events.getParticipants(event.id);
            const confirmed = parts.filter(p => p.status === 'confirmed').map(p => `• ${p.name}`);

            let message = `Fala galera! Convite para o evento: *${event.title}* ${event.opponent ? `vs. ${event.opponent}` : ''}\n\n`;
            message += `📅 *DATA:* ${new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR')}\n`;
            message += `⏰ *HORA:* ${event.time}\n`;
            message += `📍 *LOCAL:* ${event.location}\n\n`;

            if (confirmed.length > 0) {
                message += `✅ *CONFIRMADOS (${confirmed.length}):*\n${confirmed.join('\n')}\n\n`;
            } else {
                message += `🚀 *SEJA O PRIMEIRO A CONFIRMAR!*\n\n`;
            }

            message += `Confirme sua presença no link do time! ⚽🔥`;

            const text = encodeURIComponent(message);
            window.open(`https://wa.me/?text=${text}`, '_blank');
        } catch (error) {
            console.error("Error sharing event", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-background-dark min-h-screen pb-6 relative overflow-x-hidden">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-background-dark/95 backdrop-blur-sm border-b border-white/5 p-4 pb-2">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined text-white">arrow_back</span>
                    </button>
                    <h2 className="text-white text-lg font-bold leading-tight tracking-wide flex-1 text-center uppercase">AGENDA DO TIME</h2>

                    {canCreateEvent ? (
                        <button
                            onClick={() => {
                                setEditingEventId(null);
                                setFormTitle('');
                                setFormDate('');
                                setFormTime('');
                                setFormEndTime('');
                                setFormLocation('');
                                setRecurrence('none');
                                setShowAddModal(true);
                            }}
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
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
                        <div key={`${day}-${index}`} className="text-center text-xs font-bold text-slate-500 uppercase py-1">{day}</div>
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
                            <div
                                key={event.id}
                                onClick={() => setSelectedDetail(event)}
                                className="bg-surface-dark border border-white/5 rounded-2xl overflow-hidden shadow-lg animate-in slide-in-from-bottom-2 cursor-pointer hover:border-primary/20 transition-all"
                            >
                                {/* Card Header Image */}
                                <div className="h-28 w-full bg-cover bg-center relative"
                                    style={{
                                        backgroundImage: event.type === 'game'
                                            ? "url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000&auto=format&fit=crop')"
                                            : event.type === 'match'
                                                ? "url('https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?q=80&w=1000&auto=format&fit=crop')"
                                                : event.type === 'bbq'
                                                    ? "url('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1000&auto=format&fit=crop')"
                                                    : event.type === 'birthday'
                                                        ? "url('https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?q=80&w=1000&auto=format&fit=crop')"
                                                        : "url('https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=1000&auto=format&fit=crop')"
                                    }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-surface-dark/50 to-transparent"></div>
                                    <div className="absolute top-3 left-3 flex gap-2">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-background-dark ${event.type === 'game' ? 'bg-primary' :
                                            event.type === 'match' ? 'bg-blue-500' :
                                                event.type === 'bbq' ? 'bg-orange-500' :
                                                    event.type === 'meeting' ? 'bg-purple-500' :
                                                        event.type === 'birthday' ? 'bg-pink-400' : 'bg-slate-400'
                                            }`}>
                                            {event.type === 'game' ? 'Jogo' :
                                                event.type === 'match' ? 'Pelada' :
                                                    event.type === 'bbq' ? 'Churras' :
                                                        event.type === 'meeting' ? 'Reunião' :
                                                            event.type === 'birthday' ? 'Niver' : 'Evento'}
                                        </span>
                                    </div>
                                    {canCreateEvent && event.type !== 'birthday' && (
                                        <div className="absolute top-3 right-3 flex gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEditEvent(event); }}
                                                className="size-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-primary hover:text-background-dark transition-all"
                                            >
                                                <span className="material-symbols-outlined text-sm">edit</span>
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                                                className="size-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-red-500 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 -mt-10 relative z-10">
                                    <div className="flex justify-between items-start mb-1">
                                        <h2 className="text-2xl font-black text-white leading-tight">
                                            {event.opponent ? `vs. ${event.opponent}` : event.title}
                                        </h2>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleInvite(event); }}
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
                                            <span className="material-symbols-outlined text-primary">calendar_today</span>
                                            <span className="font-bold">
                                                {new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                <span className="mx-2 text-slate-500">•</span>
                                                {event.type === 'birthday' ? 'O dia todo' : (
                                                    event.endTime ? `${event.time} - ${event.endTime}` : event.time
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-200">
                                            <span className="material-symbols-outlined text-primary">location_on</span>
                                            <div className="flex flex-col items-start">
                                                <span className="font-medium line-clamp-1">{event.location}</span>
                                                {event.type !== 'birthday' && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleOpenMap(event.location);
                                                        }}
                                                        className="text-xs text-primary font-bold hover:underline flex items-center gap-1 mt-0.5"
                                                    >
                                                        Abrir no Google Maps
                                                        <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* RSVP Section */}
                                    {event.type !== 'birthday' && (
                                        (() => {
                                            const isExpired = event.endTime && new Date() > new Date(event.date + 'T' + event.endTime);
                                            return isExpired ? (
                                                <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20 flex flex-col items-center justify-center text-red-400 gap-1">
                                                    <span className="material-symbols-outlined text-xl">event_busy</span>
                                                    <span className="text-xs font-bold uppercase tracking-widest">Evento Encerrado</span>
                                                </div>
                                            ) : (
                                                <div className="bg-background-dark/50 rounded-xl p-3 border border-white/5" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sua Presença</span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setViewingParticipants(String(event.id)); }}
                                                            className="flex items-center gap-1 group"
                                                        >
                                                            <span className="material-symbols-outlined text-sm text-primary">group</span>
                                                            <span className="text-xs text-white font-bold underline group-hover:text-primary transition-colors">{event.confirmedCount} confirmados</span>
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleStatus(event.id, 'declined'); }}
                                                            className={`py-2 rounded-lg text-sm font-bold border transition-all flex items-center justify-center gap-2 ${event.myStatus === 'declined'
                                                                ? 'bg-red-500/10 text-red-500 border-red-500'
                                                                : 'border-white/10 text-slate-400 hover:bg-white/5'
                                                                }`}
                                                        >
                                                            <span className="material-symbols-outlined text-lg">close</span>
                                                            Não vou
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleStatus(event.id, 'confirmed'); }}
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
                                            );
                                        })()
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

            {/* Monthly Birthdays Section */}
            {birthdaysOfMonth.length > 0 && (
                <div className="px-4 mt-8 mb-4">
                    <h3 className="text-white font-black italic uppercase text-lg mb-4 flex items-center gap-2">
                        Aniversariantes do Mês
                        <span className="material-symbols-outlined text-pink-500 filled">cake</span>
                    </h3>
                    <div className="flex flex-col gap-3">
                        {birthdaysOfMonth.map(bday => (
                            <div
                                key={bday.id}
                                onClick={() => {
                                    const bDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), bday.day);
                                    setSelectedDetail({
                                        id: `bday-${bday.id}`,
                                        type: 'birthday',
                                        title: `Aniversário: ${bday.name}`,
                                        date: bDate.toISOString().split('T')[0],
                                        time: '00:00',
                                        location: 'AmaPlay',
                                        confirmedCount: 0,
                                        myStatus: 'pending',
                                        creatorId: 'system',
                                        createdAt: new Date().toISOString()
                                    });
                                }}
                                className="flex items-center gap-4 bg-surface-dark border border-white/5 p-3 rounded-2xl hover:border-pink-500/30 transition-all cursor-pointer group"
                            >
                                <div className="size-12 rounded-full border-2 border-pink-500/20 p-0.5 overflow-hidden ring-2 ring-pink-500/5">
                                    <img src={bday.avatar || 'https://via.placeholder.com/150'} alt={bday.name} className="size-full rounded-full object-cover" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-white font-bold group-hover:text-pink-400 transition-colors">{bday.name}</h4>
                                    <p className="text-pink-500 font-bold text-xs uppercase tracking-widest">{bday.day} de {currentDate.toLocaleDateString('pt-BR', { month: 'long' })}</p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const text = encodeURIComponent(`Parabéns pelo seu aniversário, ${bday.name}! 🎉 Desejamos tudo de bom pra você no nosso esquadrão!`);
                                        window.open(`https://wa.me/?text=${text}`, '_blank');
                                    }}
                                    className="size-10 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center hover:bg-pink-500 hover:text-white transition-all shadow-lg shadow-pink-500/10"
                                >
                                    <span className="material-symbols-outlined text-xl">send</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Next Events Presence List */}
            {nextEventsWithParts.length > 0 && (
                <div className="px-4 mt-8 mb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
                    <h3 className="text-white font-black italic uppercase text-lg mb-4 flex items-center gap-2">
                        Lista de Presença
                        <span className="material-symbols-outlined text-primary">groups</span>
                    </h3>

                    <div className="flex flex-col gap-6">
                        {nextEventsWithParts.map(event => {
                            const confirmed = event.participants.filter(p => p.status === 'confirmed');
                            const declined = event.participants.filter(p => p.status === 'declined');

                            return (
                                <div key={event.id} className="bg-surface-dark border border-white/5 rounded-[2rem] overflow-hidden shadow-xl">
                                    {/* Event Header mini-card */}
                                    <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`size-10 rounded-xl flex items-center justify-center text-background-dark ${event.type === 'game' ? 'bg-primary' :
                                                event.type === 'match' ? 'bg-blue-500' : 'bg-orange-500'
                                                }`}>
                                                <span className="material-symbols-outlined font-black">
                                                    {event.type === 'game' ? 'sports_soccer' :
                                                        event.type === 'match' ? 'groups' : 'restaurant'}
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="text-white font-black text-xs uppercase tracking-tight">{event.opponent ? `vs. ${event.opponent}` : event.title}</h4>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">
                                                    {new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} • {event.time}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-primary font-black text-xl leading-none">{confirmed.length}</p>
                                            <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Confirmados</p>
                                        </div>
                                    </div>

                                    {/* Participants Grid */}
                                    <div className="p-4">
                                        {confirmed.length > 0 ? (
                                            <div className="grid grid-cols-4 gap-3">
                                                {confirmed.map((p, idx) => (
                                                    <div key={idx} className="flex flex-col items-center gap-1 group">
                                                        <div className="size-12 rounded-full border-2 border-primary/20 overflow-hidden relative">
                                                            <img src={p.avatar || 'https://via.placeholder.com/150'} alt={p.name} className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                            <div className="absolute -bottom-1 -right-1 size-4 bg-primary rounded-full border-2 border-surface-dark flex items-center justify-center">
                                                                <span className="material-symbols-outlined text-[10px] text-background-dark font-black">check</span>
                                                            </div>
                                                        </div>
                                                        <span className="text-[8px] text-slate-400 font-black uppercase truncate w-full text-center">{p.name.split(' ')[0]}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-6 flex flex-col items-center justify-center opacity-30">
                                                <span className="material-symbols-outlined text-3xl mb-1">person_off</span>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-white">Ninguém confirmado</p>
                                            </div>
                                        )}

                                        {declined.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-white/5">
                                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    Não comparecerão ({declined.length})
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {declined.map((p, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 bg-white/5 border border-white/5 pr-3 pl-1 py-1 rounded-full opacity-60">
                                                            <div className="size-6 rounded-full overflow-hidden grayscale">
                                                                <img src={p.avatar || 'https://via.placeholder.com/150'} alt={p.name} className="w-full h-full object-cover" />
                                                            </div>
                                                            <span className="text-[9px] text-slate-400 font-bold">{p.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* --- EVENT DETAIL MODAL --- */}
            {selectedDetail && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-surface-dark w-full max-w-sm rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Detail Header Image */}
                        <div className="h-44 w-full bg-cover bg-center relative"
                            style={{
                                backgroundImage: selectedDetail.type === 'game'
                                    ? "url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000&auto=format&fit=crop')"
                                    : selectedDetail.type === 'match'
                                        ? "url('https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?q=80&w=1000&auto=format&fit=crop')"
                                        : selectedDetail.type === 'bbq'
                                            ? "url('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1000&auto=format&fit=crop')"
                                            : selectedDetail.type === 'birthday'
                                                ? "url('https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?q=80&w=1000&auto=format&fit=crop')"
                                                : "url('https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=1000&auto=format&fit=crop')"
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-surface-dark/20 to-transparent"></div>
                            <button onClick={() => setSelectedDetail(null)} className="absolute top-4 right-4 size-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                            <div className="absolute bottom-4 left-6">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest text-background-dark ${selectedDetail.type === 'game' ? 'bg-primary' :
                                    selectedDetail.type === 'match' ? 'bg-blue-500' :
                                        selectedDetail.type === 'bbq' ? 'bg-orange-500' :
                                            selectedDetail.type === 'meeting' ? 'bg-purple-500' :
                                                selectedDetail.type === 'birthday' ? 'bg-pink-400' : 'bg-slate-400'
                                    }`}>
                                    {selectedDetail.type === 'game' ? 'Grande Jogo' :
                                        selectedDetail.type === 'match' ? 'Pelada do Time' :
                                            selectedDetail.type === 'bbq' ? 'Churrasco do Time' :
                                                selectedDetail.type === 'meeting' ? 'Reunião do Time' :
                                                    selectedDetail.type === 'birthday' ? 'Aniversário' : 'Evento'}
                                </span>
                            </div>
                        </div>

                        <div className="p-6">
                            <h2 className="text-3xl font-black text-white italic uppercase leading-none mb-2">
                                {selectedDetail.opponent ? `vs. ${selectedDetail.opponent}` : selectedDetail.title}
                            </h2>
                            <p className="text-slate-400 text-sm font-medium mb-6">
                                {selectedDetail.type === 'game' ? 'Este é um compromisso oficial do esquadrão. Prepare sua chuteira e confirme sua presença para garantirmos o time titular.' :
                                    selectedDetail.type === 'birthday' ? 'Dia de festa! Vamos comemorar mais um ano de vida e conquistas no nosso time. Não esqueça de deixar os parabéns.' :
                                        selectedDetail.type === 'match' ? 'Momento de suar a camisa e mostrar o talento. Confirme presença para organizarmos os times da pelada.' :
                                            selectedDetail.type === 'meeting' ? 'Assuntos importantes para o futuro do nosso esquadrão. Sua participação é fundamental nas decisões do grupo.' :
                                                'Momento de resenha e união. Nada melhor que um encontro para fortalecer os laços do nosso grupo fora de campo.'}
                            </p>

                            <div className="flex flex-col gap-4 mb-8">
                                <div className="flex items-center gap-4 bg-background-dark/50 p-3 rounded-2xl border border-white/5">
                                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined">schedule</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Data e Horário</p>
                                        <p className="text-white font-bold">
                                            {new Date(selectedDetail.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {selectedDetail.type === 'birthday' ? 'O dia todo' : (
                                                selectedDetail.endTime ? `${selectedDetail.time} - ${selectedDetail.endTime}` : selectedDetail.time
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 bg-background-dark/50 p-3 rounded-2xl border border-white/5 cursor-pointer hover:bg-background-dark transition-colors"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleOpenMap(selectedDetail.location);
                                    }}>
                                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined">location_on</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Localização</p>
                                        <p className="text-white font-bold line-clamp-1">{selectedDetail.location}</p>
                                    </div>
                                    <span className="material-symbols-outlined text-primary">open_in_new</span>
                                </div>
                            </div>

                            {selectedDetail.type === 'birthday' ? (
                                <button
                                    onClick={() => {
                                        const nameOnly = selectedDetail.title.split(': ')[1];
                                        const text = encodeURIComponent(`Parabéns pelo seu aniversário, ${nameOnly}! 🎉 Desejamos tudo de bom pra você no nosso esquadrão!`);
                                        window.open(`https://wa.me/?text=${text}`, '_blank');
                                    }}
                                    className="w-full py-4 bg-pink-500 text-white rounded-2xl font-black italic uppercase tracking-widest shadow-xl shadow-pink-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    <span className="material-symbols-outlined filled">cake</span>
                                    Parabenizar agora
                                </button>
                            ) : (
                                (() => {
                                    const isExpired = selectedDetail.endTime && new Date() > new Date(selectedDetail.date + 'T' + selectedDetail.endTime);

                                    if (isExpired) {
                                        return (
                                            <div className="w-full py-4 bg-slate-700/50 text-slate-400 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                                <span className="material-symbols-outlined">lock_clock</span>
                                                Evento Encerrado
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => toggleStatus(selectedDetail.id, selectedDetail.myStatus === 'confirmed' ? 'declined' : 'confirmed')}
                                                className={`flex-1 py-4 rounded-2xl font-black italic uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 ${selectedDetail.myStatus === 'confirmed'
                                                    ? 'bg-red-500 text-white shadow-red-500/20'
                                                    : 'bg-primary text-background-dark shadow-primary/20'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined font-black">
                                                    {selectedDetail.myStatus === 'confirmed' ? 'close' : 'check'}
                                                </span>
                                                {selectedDetail.myStatus === 'confirmed' ? 'Desistir' : 'Confirmar'}
                                            </button>
                                            <button
                                                onClick={() => handleInvite(selectedDetail)}
                                                className="size-14 rounded-2xl bg-green-500 text-white flex items-center justify-center shadow-xl shadow-green-500/20 active:scale-95 transition-all"
                                            >
                                                <span className="material-symbols-outlined filled text-2xl">share</span>
                                            </button>
                                        </div>
                                    );
                                })()
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- ADD EVENT MODAL --- */}
            {showAddModal && canCreateEvent && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-surface-dark w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-white font-bold text-xl">{editingEventId ? 'Editar Evento' : 'Novo Evento'}</h3>
                            <button onClick={() => { setShowAddModal(false); setEditingEventId(null); }} className="text-slate-400 hover:text-white">
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
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-400 uppercase ml-1">Data</label>
                                    </div>
                                    <input
                                        type="date"
                                        className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary [color-scheme:dark]"
                                        value={formDate}
                                        onChange={(e) => setFormDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Horário (Início/Fim)</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="time"
                                            className="w-1/2 bg-background-dark border border-white/10 rounded-xl px-2 py-3 text-white focus:ring-primary focus:border-primary [color-scheme:dark] text-center text-sm"
                                            value={formTime}
                                            onChange={(e) => setFormTime(e.target.value)}
                                        />
                                        <span className="text-slate-500 font-bold">-</span>
                                        <input
                                            type="time"
                                            className="w-1/2 bg-background-dark border border-white/10 rounded-xl px-2 py-3 text-white focus:ring-primary focus:border-primary [color-scheme:dark] text-center text-sm"
                                            value={formEndTime}
                                            onChange={(e) => setFormEndTime(e.target.value)}
                                        />
                                    </div>
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
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleOpenMap(formLocation);
                                            }}
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
                                {isLoading ? (editingEventId ? 'Salvando...' : 'Criando...') : (editingEventId ? 'Salvar Alterações' : 'Criar e Convidar')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PARTICIPANTS LIST MODAL --- */}
            {viewingParticipants && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
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
                                            <img src={p.avatar || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt="" />
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
                                            <img src={p.avatar || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt="" />
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