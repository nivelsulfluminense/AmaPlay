import React, { useState, useEffect } from 'react';
import { dataService, LegacyInventoryItem as InventoryItem } from '../services/dataService';

const InventoryScreen = () => {
  const [showModal, setShowModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [filter, setFilter] = useState('');

  // Async Data State
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formMaxQty, setFormMaxQty] = useState('');
  const [formCategory, setFormCategory] = useState('Equipamento');
  const [formStatus, setFormStatus] = useState<'excellent' | 'good' | 'fair' | 'poor'>('excellent');

  // Load Data
  useEffect(() => {
    loadItems();
  }, []);

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
    setFormName('');
    setFormQty('');
    setFormMaxQty('');
    setFormCategory('Equipamento');
    setFormStatus('excellent');
    setShowModal(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setFormName(item.name);
    setFormQty(item.quantity.toString());
    setFormMaxQty(item.maxQuantity.toString());
    setFormCategory(item.category);
    setFormStatus(item.status); // @ts-ignore
    setShowModal(true);
  };

  const handleSaveItem = async () => {
    if (!formName || !formQty) return;

    const qty = parseInt(formQty);
    const max = formMaxQty ? parseInt(formMaxQty) : qty;

    const newItemData = {
      name: formName,
      category: formCategory,
      quantity: qty,
      maxQuantity: max,
      status: formStatus,
      image: "https://cdn-icons-png.flaticon.com/512/679/679720.png",
      color: determineColor(formStatus)
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
    alert("Relatório de inventário gerado!");
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(filter.toLowerCase()) ||
    item.category.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="bg-background-dark min-h-screen pb-24 relative">
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
          <button className="flex items-center justify-center size-10 rounded-full bg-surface-dark text-white hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined">filter_list</span>
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
      <div className="w-full overflow-x-auto no-scrollbar px-4 pt-2 pb-6">
        <div className="flex gap-3 min-w-max">
          <div className="flex min-w-[140px] flex-col gap-1 rounded-xl p-5 bg-surface-dark shadow-sm border border-white/5">
            <div className="flex items-center gap-2 text-gray-400">
              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
              <p className="text-sm font-medium leading-normal">Total de Itens</p>
            </div>
            <p className="text-white text-3xl font-bold leading-tight mt-1">{totalItems}</p>
          </div>
          <div className="flex min-w-[140px] flex-col gap-1 rounded-xl p-5 bg-surface-dark shadow-sm border border-white/5 relative overflow-hidden">
            <div className="absolute right-0 top-0 p-3 opacity-10">
              <span className="material-symbols-outlined text-[64px] text-primary">build</span>
            </div>
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-[20px] filled">build</span>
              <p className="text-sm font-medium leading-normal">Manutenção</p>
            </div>
            <p className="text-3xl font-bold leading-tight mt-1 text-primary">3</p>
          </div>
          <div className="flex min-w-[140px] flex-col gap-1 rounded-xl p-5 bg-surface-dark shadow-sm border border-white/5">
            <div className="flex items-center gap-2 text-orange-400">
              <span className="material-symbols-outlined text-[20px]">warning</span>
              <p className="text-sm font-medium leading-normal">Estoque Baixo</p>
            </div>
            <p className="text-3xl font-bold leading-tight mt-1 text-orange-400">{lowStock}</p>
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
      <div className="flex flex-col gap-3 px-4">
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-surface-dark rounded-xl animate-pulse" />)}
          </div>
        )}

        {!isLoading && filteredItems.map((item) => {
          const percentage = Math.min((item.quantity / item.maxQuantity) * 100, 100);
          return (
            <div key={item.id} className="group flex items-center gap-4 bg-surface-dark rounded-xl p-3 pr-4 shadow-sm border border-white/5 transition-transform active:scale-[0.99]">
              <div className="bg-center bg-no-repeat bg-contain rounded-lg size-16 shrink-0 bg-white/5 p-2" style={{ backgroundImage: `url('${item.image}')` }}></div>
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
      <div className="fixed bottom-0 left-0 right-0 z-30 p-4 pb-8 bg-gradient-to-t from-background-dark via-background-dark to-transparent pt-12">
        <div className="flex gap-4 max-w-lg mx-auto">
          <button
            onClick={handleReportProblem}
            className="flex-1 h-14 rounded-full border border-white/20 bg-background-dark/80 backdrop-blur-md flex items-center justify-center gap-2 text-white font-bold hover:bg-white/5 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined">assignment</span>
            Relatório
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex-1 h-14 rounded-full bg-primary flex items-center justify-center gap-2 text-background-dark font-bold shadow-[0_0_20px_rgba(19,236,91,0.3)] hover:shadow-[0_0_25px_rgba(19,236,91,0.5)] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined">add_circle</span>
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
                <label className="text-xs font-bold text-slate-400 uppercase">Nome do Item</label>
                <input
                  type="text"
                  className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary"
                  placeholder="Ex: Bomba de Ar"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

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
                  <option>Equipamento</option>
                  <option>Médico</option>
                  <option>Treino</option>
                  <option>Uniformes</option>
                  <option>Outros</option>
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
                disabled={!formName || !formQty || isLoading}
                className={`flex-1 py-3 rounded-xl bg-primary text-background-dark font-bold hover:bg-primary-dark ${(!formName || !formQty || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryScreen;