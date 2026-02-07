import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { dataService, LegacyInventoryItem as InventoryItem } from '../services/dataService';
import { supabase } from '../services/supabase';

const InventoryScreen = () => {
  const { role } = useUser();
  const isManager = role === 'presidente' || role === 'vice-presidente';

  const [showModal, setShowModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [filter, setFilter] = useState('');

  // Async Data State
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);

  // Preset Items Definition
  const PRESET_ITEMS = [
    { name: 'Bola', icon: 'sports_soccer' },
    { name: 'Rede', icon: 'grid_on' },
    { name: 'Luva', icon: 'pan_tool' },
    { name: 'Saco de bolas', icon: 'shopping_bag' },
    { name: 'Saco de rede', icon: 'shopping_basket' },
    { name: 'Meião', icon: 'checkroom' },
    { name: 'Chuteira', icon: 'hiking' },
    { name: 'Colete', icon: 'apparel' },
    { name: 'Camisa do time', icon: 'checkroom' },
    { name: 'Apito', icon: 'sports' },
    { name: 'Cronômetro', icon: 'timer' },
    { name: 'Galão de água', icon: 'water_drop' },
    { name: 'Pasta', icon: 'folder' },
    { name: 'Outros', icon: 'category' }
  ];

  const getItemIcon = (itemName: string) => {
    const preset = PRESET_ITEMS.find(p => p.name.toLowerCase() === itemName.toLowerCase());
    return preset ? preset.icon : 'inventory_2';
  };

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedPreset, setSelectedPreset] = useState(PRESET_ITEMS[0].name);
  const [customName, setCustomName] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formMaxQty, setFormMaxQty] = useState('');
  const [formCategory, setFormCategory] = useState('Equipamento');
  const [formStatus, setFormStatus] = useState<'excellent' | 'good' | 'fair' | 'poor'>('excellent');
  const [formResponsibleId, setFormResponsibleId] = useState<string | null>(null);

  // New features
  const [players, setPlayers] = useState<any[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [categories, setCategories] = useState<string[]>(["Equipamento", "Médico", "Treino", "Uniformes", "Outros"]);
  const [newCatName, setNewCatName] = useState('');

  // Load Data
  useEffect(() => {
    loadItems();
    loadPlayers();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('profiles').select('team_id').eq('id', user.id).single();
      if (!profile?.team_id) return;

      const { data: team } = await supabase.from('teams').select('inventory_categories').eq('id', profile.team_id).single();
      if (team?.inventory_categories) {
        setCategories(team.inventory_categories);
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    }
  };

  const saveSettings = async (newCats: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('profiles').select('team_id').eq('id', user.id).single();
      if (!profile?.team_id) return;

      await supabase.from('teams').update({ inventory_categories: newCats }).eq('id', profile.team_id);
      setCategories(newCats);
    } catch (e) {
      alert("Erro ao salvar categorias");
    }
  };

  const loadPlayers = async () => {
    try {
      const p = await dataService.players.list(true); // Include all members
      setPlayers(p);
    } catch (e) {
      console.error("Failed to load players", e);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const updated = [...categories, newCatName.trim()];
    await saveSettings(updated);
    setNewCatName('');
  };

  const handleRemoveCategory = async (name: string) => {
    const updated = categories.filter(c => c !== name);
    await saveSettings(updated);
  };

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const loaded = await dataService.inventory.list();
      setItems(loaded);
    } catch (e) {
      console.error("Failed to load inventory", e);
    } finally {
      setIsLoading(false);
    }
  };

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const lowStock = items.filter(i => (i.quantity / i.maxQuantity) < 0.3).length;

  const determineColor = (status: string) => {
    if (status === 'poor') return 'red-500';
    if (status === 'fair') return 'yellow-500';
    return 'primary';
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setSelectedPreset(PRESET_ITEMS[0].name);
    setCustomName('');
    setFormQty('');
    setFormMaxQty('');
    setFormCategory('Equipamento');
    setFormStatus('excellent');
    setFormResponsibleId(null);
    setShowModal(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingId(item.id);

    // Check if name is in presets
    const isPreset = PRESET_ITEMS.some(p => p.name === item.name);
    if (isPreset) {
      setSelectedPreset(item.name);
      setCustomName('');
    } else {
      setSelectedPreset('Outros');
      setCustomName(item.name);
    }

    setFormQty(item.quantity.toString());
    setFormMaxQty(item.maxQuantity.toString());
    setFormCategory(item.category);
    setFormStatus(item.status); // @ts-ignore
    setFormResponsibleId(item.responsibleId || null);
    setShowModal(true);
  };

  const handleSaveItem = async () => {
    const finalName = selectedPreset === 'Outros' ? customName : selectedPreset;

    if (!finalName || !formQty) return;

    const qty = parseInt(formQty);
    const max = formMaxQty ? parseInt(formMaxQty) : qty;

    const newItemData = {
      name: finalName,
      category: formCategory,
      quantity: qty,
      maxQuantity: max,
      status: formStatus,
      image: "", // We rely on name -> icon mapping now, or backend defaults
      color: determineColor(formStatus),
      responsibleId: formResponsibleId
    };

    setIsLoading(true);
    try {
      const savedItem = await dataService.inventory.save({
        ...newItemData,
        id: editingId || undefined
      });

      if (editingId) {
        setItems(prev => prev.map(i => i.id === editingId ? savedItem : i));
      } else {
        setItems(prev => [savedItem, ...prev]);
      }
      setShowModal(false);
    } catch (e) {
      alert("Erro ao salvar item");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (editingId) {
      if (window.confirm("Tem certeza que deseja excluir este item?")) {
        setIsLoading(true);
        try {
          await dataService.inventory.delete(editingId);
          setItems(prev => prev.filter(i => i.id !== editingId));
          setShowModal(false);
        } catch (e) {
          alert("Erro ao excluir");
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const handleReportProblem = () => {
    setShowReportModal(true);
  };

  const handleDownloadCSV = () => {
    const headers = ["Item", "Categoria", "Quantidade", "Ideal", "Status", "Responsavel"];
    const rows = items.map(i => [
      i.name,
      i.category,
      i.quantity,
      i.maxQuantity,
      i.status,
      players.find(p => p.id === i.responsibleId)?.name || "Time"
    ]);

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Relatorio_Estoque_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(filter.toLowerCase()) ||
    item.category.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="bg-background-dark min-h-screen pb-36 relative">
      {/* Header */}
      <div className="flex items-center p-4 pt-6 pb-2 justify-between sticky top-0 z-20 bg-background-dark/95 backdrop-blur-sm">
        <h2 className="text-white text-xl font-bold leading-tight tracking-[-0.015em] flex-1">Estoque de Materiais</h2>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`flex items-center justify-center size-10 rounded-full transition-colors ${showSearch ? 'bg-primary text-background-dark' : 'bg-surface-dark text-white hover:bg-white/10'}`}
          >
            <span className="material-symbols-outlined">search</span>
          </button>
          <button
            onClick={() => isManager ? setShowManageModal(true) : alert("Acesso restrito a gestores")}
            className={`flex items-center justify-center size-10 rounded-full bg-surface-dark text-primary hover:bg-white/10 transition-colors border border-white/10 ${!isManager ? 'opacity-50 grayscale' : ''}`}
            title="Gerenciar Opções do Estoque"
          >
            <span className="material-symbols-outlined">edit_note</span>
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="px-4 pb-2 animate-in slide-in-from-top-2">
          <input
            type="text"
            placeholder="Buscar item..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-surface-dark border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-slate-500"
            autoFocus
          />
        </div>
      )}

      {/* Top Stats Cards */}
      <div className="px-4 pt-2 pb-6">
        <div className="grid grid-cols-3 gap-2.5">
          <div className="flex flex-col justify-between rounded-2xl p-4 bg-white/[0.03] border border-white/5 backdrop-blur-sm h-28 transition-all active:scale-95">
            <div className="flex items-center gap-2 text-slate-500">
              <span className="material-symbols-outlined text-lg">inventory_2</span>
              <p className="text-[10px] font-black uppercase tracking-widest">Total</p>
            </div>
            <div className="mt-auto">
              <p className="text-white text-3xl font-black leading-none">{totalItems}</p>
              <div className="h-1 w-8 bg-white/10 rounded-full mt-2"></div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl p-4 bg-primary/5 border border-primary/10 backdrop-blur-sm h-28 relative overflow-hidden transition-all active:scale-95">
            <div className="absolute -right-2 -bottom-2 opacity-5">
              <span className="material-symbols-outlined text-[64px] text-primary">build</span>
            </div>
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-lg filled">build</span>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/80">Reparo</p>
            </div>
            <div className="mt-auto">
              <p className="text-primary text-3xl font-black leading-none">3</p>
              <div className="h-1 w-8 bg-primary/20 rounded-full mt-2"></div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl p-4 bg-orange-500/5 border border-orange-500/10 backdrop-blur-sm h-28 transition-all active:scale-95 overflow-hidden">
            <div className="flex items-center gap-2 text-orange-500">
              <span className="material-symbols-outlined text-lg">{lowStock > 0 ? 'error' : 'check_circle'}</span>
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-500/80">Monitor</p>
            </div>
            <div className="mt-auto">
              {lowStock > 0 ? (
                <>
                  <p className="text-3xl font-black leading-none text-orange-500 animate-pulse">
                    {lowStock}
                  </p>
                  <p className="text-[10px] text-orange-500/60 font-bold mt-1">Itens baixos</p>
                </>
              ) : (
                <p className="text-[11px] font-black leading-tight text-slate-500 uppercase tracking-tight">
                  Está tudo sob controle
                </p>
              )}
              <div className={`h-1 w-8 rounded-full mt-2 ${lowStock > 0 ? 'bg-orange-500/30' : 'bg-primary/20'}`}></div>
            </div>
          </div>
        </div>
      </div>

      {/* List Header */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white text-xl font-bold leading-tight">Equipamentos</h3>
          <span className="text-sm font-medium text-gray-400">Ordenar: Categoria</span>
        </div>
      </div>

      {/* Equipment List */}
      <div className="flex flex-col gap-3 px-4 pb-10">
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-surface-dark rounded-xl animate-pulse" />)}
          </div>
        )}

        {!isLoading && filteredItems.map((item) => {
          const percentage = Math.min((item.quantity / item.maxQuantity) * 100, 100);
          return (
            <div key={item.id} className="group flex items-center gap-4 bg-surface-dark rounded-xl p-3 pr-4 shadow-sm border border-white/5 transition-transform active:scale-[0.99]">
              <div className="flex items-center justify-center rounded-lg size-16 shrink-0 bg-white/5 p-2 text-primary border border-white/5">
                <span className="material-symbols-outlined text-3xl drop-shadow-md">{getItemIcon(item.name)}</span>
              </div>
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="text-white text-base font-bold leading-normal truncate pr-2">{item.name}</p>
                  <div className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider 
                        ${item.status === 'excellent' ? 'bg-primary/20 text-[#6ffba0]' :
                      item.status === 'good' ? 'bg-primary/20 text-[#6ffba0]' :
                        item.status === 'fair' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'}`}>
                    {item.status === 'excellent' ? 'Novo' : item.status === 'good' ? 'Bom' : item.status === 'fair' ? 'Usado' : 'Danificado'}
                  </div>
                </div>
                <div className="flex items-end gap-2 mt-1">
                  <p className="text-gray-400 text-sm font-normal">Qtd</p>
                  <p className={`text-lg font-bold leading-none ${item.color.includes('red') ? 'text-red-500' : 'text-white'}`}>
                    {item.quantity}<span className="text-gray-600 text-sm font-medium">/{item.maxQuantity}</span>
                  </p>
                </div>
                <div className="w-full bg-black/40 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className={`h-full rounded-full bg-${item.color}`} style={{ width: `${percentage}%` }}></div>
                </div>
                {item.responsibleId && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-primary">person</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase truncate">
                      {players.find(p => p.id === item.responsibleId)?.name || 'Carregando...'}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleOpenEdit(item); }}
                className="size-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-primary transition-colors border border-white/5"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
              </button>
            </div>
          );
        })}
        {!isLoading && filteredItems.length === 0 && (
          <div className="text-center py-10 text-slate-500">
            <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
            <p>Nenhum item encontrado.</p>
          </div>
        )}
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute bottom-4 left-0 right-0 z-30 p-4 pt-2 bg-gradient-to-t from-background-dark via-background-dark/80 to-transparent">
        <div className="flex gap-3">
          <button
            onClick={handleReportProblem}
            className="flex-1 h-12 rounded-full border border-white/20 bg-background-dark/80 backdrop-blur-md flex items-center justify-center gap-2 text-white text-sm font-bold hover:bg-white/5 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-lg">assignment</span>
            Relatório
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex-1 h-12 rounded-full bg-primary flex items-center justify-center gap-2 text-background-dark text-sm font-bold shadow-[0_0_20px_rgba(19,236,91,0.3)] hover:shadow-[0_0_25px_rgba(19,236,91,0.5)] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            Adicionar
          </button>
        </div>
      </div>

      {/* ADD/EDIT ITEM MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-dark w-full max-w-sm rounded-2xl border border-white/10 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white text-xl font-bold">
                {editingId ? 'Editar Item' : 'Adicionar ao Estoque'}
              </h3>
              {editingId && (
                <button
                  onClick={handleDeleteItem}
                  className="size-10 flex items-center justify-center rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20"
                  title="Excluir Item"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Item</label>
                <div className="relative">
                  <select
                    className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary appearance-none"
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                  >
                    {PRESET_ITEMS.map(item => (
                      <option key={item.name} value={item.name}>{item.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <span className="material-symbols-outlined">expand_more</span>
                  </div>
                </div>
              </div>

              {selectedPreset === 'Outros' && (
                <div className="space-y-1 animate-in fade-in zoom-in-95 duration-200">
                  <label className="text-xs font-bold text-slate-400 uppercase">Nome do Item</label>
                  <input
                    type="text"
                    className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary"
                    placeholder="Digite o nome do item..."
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    autoFocus
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Qtd Atual</label>
                  <input
                    type="number"
                    className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary"
                    placeholder="0"
                    value={formQty}
                    onChange={(e) => setFormQty(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Qtd Ideal</label>
                  <input
                    type="number"
                    className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary placeholder:text-slate-600"
                    placeholder={formQty || "0"}
                    value={formMaxQty}
                    onChange={(e) => setFormMaxQty(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Categoria</label>
                <select
                  className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  {categories.map(cat => (
                    <option key={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Estado de Conservação</label>
                <select
                  className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                >
                  <option value="excellent">Novo (Excelente)</option>
                  <option value="good">Bom Estado</option>
                  <option value="fair">Usado (Sinais de uso)</option>
                  <option value="poor">Danificado / Ruim</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Responsável pelo Ítem</label>
                <div className="relative">
                  <select
                    className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary appearance-none"
                    value={formResponsibleId || ''}
                    onChange={(e) => setFormResponsibleId(e.target.value || null)}
                  >
                    <option value="">Nenhum (Com o Time)</option>
                    {players.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <span className="material-symbols-outlined">expand_more</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveItem}
                disabled={!(selectedPreset === 'Outros' ? customName : selectedPreset) || !formQty || isLoading}
                className={`flex-1 py-3 rounded-xl bg-primary text-background-dark font-bold hover:bg-primary-dark ${(!(selectedPreset === 'Outros' ? customName : selectedPreset) || !formQty || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-surface-dark w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-2xl overflow-y-auto max-h-[90vh] print:p-0 print:bg-white print:text-black">
            <div className="flex justify-between items-center mb-6 print:hidden">
              <h3 className="text-white text-xl font-bold">Relatório de Estoque</h3>
              <button onClick={() => setShowReportModal(false)} className="size-10 flex items-center justify-center rounded-full bg-white/5 text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div id="report-content" className="space-y-6">
              <div className="p-4 bg-background-dark/50 rounded-xl border border-white/5 print:bg-gray-100 print:text-black">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-black text-primary uppercase tracking-widest">Resumo Geral</h4>
                  <span className="text-[10px] text-slate-500">{new Date().toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Total de Itens</p>
                    <p className="text-2xl font-black text-white print:text-black">{totalItems}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Categorias</p>
                    <p className="text-2xl font-black text-white print:text-black">{new Set(items.map(i => i.category)).size}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Detalhes do Inventário</h4>
                <div className="space-y-2 overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-500 print:border-black">
                        <th className="py-2 font-bold">Item</th>
                        <th className="py-2 font-bold text-center">Qtd</th>
                        <th className="py-2 font-bold text-right pr-2">Responsável</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 print:divide-gray-300">
                      {items.map(i => (
                        <tr key={i.id} className="text-white print:text-black">
                          <td className="py-3 font-medium">
                            {i.name}
                            <p className="text-[10px] text-slate-500">{i.category}</p>
                          </td>
                          <td className="py-3 text-center font-black">
                            {i.quantity}/{i.maxQuantity}
                          </td>
                          <td className="py-3 text-right text-[10px] font-bold uppercase truncate max-w-[100px] pr-2">
                            {players.find(p => p.id === i.responsibleId)?.name || 'Time'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-8 print:hidden">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleDownloadCSV}
                  className="flex items-center justify-center gap-2 py-3 bg-surface-dark border border-white/10 rounded-xl text-white font-bold hover:bg-white/5"
                >
                  <span className="material-symbols-outlined text-green-500">table_view</span>
                  Excel (CSV)
                </button>
                <button
                  onClick={handlePrintPDF}
                  className="flex items-center justify-center gap-2 py-3 bg-surface-dark border border-white/10 rounded-xl text-white font-bold hover:bg-white/5"
                >
                  <span className="material-symbols-outlined text-red-500">picture_as_pdf</span>
                  Imprimir / PDF
                </button>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="w-full py-4 rounded-xl bg-primary text-background-dark font-black uppercase tracking-widest mt-2"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE MODAL (CATEGORIES) */}
      {showManageModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in zoom-in-95 duration-200">
          <div className="bg-surface-dark w-full max-w-sm rounded-3xl border border-white/10 p-6 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-white text-xl font-black">Gerenciar Estoque</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Categorias de Materiais</p>
              </div>
              <button
                onClick={() => setShowManageModal(false)}
                className="size-10 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-white/10"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nova Categoria</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: Suplementos"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-primary focus:border-primary"
                  />
                  <button
                    onClick={handleAddCategory}
                    disabled={!newCatName.trim()}
                    className="size-12 rounded-xl bg-primary text-background-dark flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform"
                  >
                    <span className="material-symbols-outlined font-black">add</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-white/5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Categorias Atuais</label>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div key={cat} className="flex items-center justify-between p-3 bg-background-dark rounded-xl border border-white/5 group">
                      <span className="text-white text-sm font-bold">{cat}</span>
                      <button
                        onClick={() => handleRemoveCategory(cat)}
                        className="size-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-center py-4 text-xs text-slate-600 italic">Nenhuma categoria personalizada.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={() => setShowManageModal(false)}
                className="w-full py-4 rounded-2xl bg-primary text-background-dark font-black uppercase tracking-widest active:scale-95 transition-transform"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryScreen;