import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PlayerPaymentsScreen = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'pending' | 'history'>('pending');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lists State
  const [pendingItems, setPendingItems] = useState([
    { id: 1, title: 'Mensalidade Outubro', due: '10 Out', amount: 50.00, type: 'monthly' },
    { id: 2, title: 'Churrasco Pós-Jogo', due: '07 Out', amount: 35.00, type: 'extra' },
  ]);

  const [historyItems, setHistoryItems] = useState([
    { id: 3, title: 'Mensalidade Setembro', date: '10 Set', amount: 50.00, status: 'paid' },
    { id: 4, title: 'Aluguel Quadra (Extra)', date: '02 Set', amount: 15.00, status: 'paid' },
    { id: 5, title: 'Mensalidade Agosto', date: '10 Ago', amount: 50.00, status: 'paid' },
  ]);

  const totalPending = pendingItems.reduce((acc, item) => acc + item.amount, 0);

  // Upload/Scanning States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [processStep, setProcessStep] = useState(0); // 0: Idle, 1: Scanning, 2: Extracting, 3: Validating, 4: Success
  const [successData, setSuccessData] = useState<any>(null);

  // --- Handlers ---

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScannedImage(reader.result as string);
        startScanningProcess();
      };
      reader.readAsDataURL(file);
    }
  };

  const startScanningProcess = () => {
    setIsProcessing(true);
    setProcessStep(1); // Scanning UI

    // Simulate Step 1: Scanning Image (1.5s)
    setTimeout(() => {
        setProcessStep(2); // Extracting Data
        
        // Simulate Step 2: Extraction (1.5s)
        setTimeout(() => {
            setProcessStep(3); // Validating
            
            // Simulate Step 3: Validation & Matching (1.5s)
            setTimeout(() => {
                // LOGIC: Find a matching item. For Demo, we match the first pending item or default to $50
                const matchedItem = pendingItems.find(i => i.amount === 50.00) || pendingItems[0];
                
                if (matchedItem) {
                    setProcessStep(4); // Success
                    setSuccessData({
                        amount: matchedItem.amount,
                        date: new Date().toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'}),
                        receiver: 'AmaPlay FC',
                        itemTitle: matchedItem.title
                    });

                    // Update Lists after a brief delay to show success
                    setTimeout(() => {
                        completePayment(matchedItem);
                    }, 1500);
                } else {
                    alert("Nenhuma pendência encontrada com o valor do comprovante.");
                    resetModal();
                }

            }, 1500);
        }, 1500);
    }, 1500);
  };

  const completePayment = (item: any) => {
      // Remove from pending
      setPendingItems(prev => prev.filter(i => i.id !== item.id));
      
      // Add to history
      const newHistoryItem = {
          id: Date.now(),
          title: item.title,
          date: new Date().toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'}),
          amount: item.amount,
          status: 'paid'
      };
      setHistoryItems(prev => [newHistoryItem, ...prev]);
      
      // Close modal
      setTimeout(() => {
          resetModal();
          setFilter('history'); // Switch tab to show the new item
      }, 1000);
  };

  const resetModal = () => {
      setShowUploadModal(false);
      setIsProcessing(false);
      setScannedImage(null);
      setProcessStep(0);
      setSuccessData(null);
  };

  return (
    <div className="bg-background-dark min-h-screen pb-24 relative">
      <header className="flex items-center p-4 pt-6 pb-2 justify-between sticky top-0 z-20 bg-background-dark/95 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-dark shadow-sm hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-white">arrow_back</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight flex-1 text-center pr-10">Meus Pagamentos</h2>
      </header>

      <main className="flex flex-col gap-6 px-4 pt-4">
        {/* Total Pending Card with Upload Area */}
        <div className="bg-gradient-to-br from-surface-dark to-[#1a202c] p-6 rounded-3xl border border-white/5 shadow-lg relative overflow-hidden">
           <div className="absolute right-0 bottom-0 opacity-5">
              <span className="material-symbols-outlined text-[120px] text-white">account_balance_wallet</span>
           </div>
           
           <div className="relative z-10">
               <p className="text-slate-400 text-sm font-medium mb-1">Total Pendente</p>
               <h1 className="text-white text-4xl font-bold tracking-tight mb-4">
                   R$ {totalPending.toFixed(2)}
               </h1>
               
               <button 
                  onClick={() => setShowUploadModal(true)}
                  disabled={totalPending === 0}
                  className={`w-full font-bold py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 
                    ${totalPending > 0 ? 'bg-primary text-background-dark hover:bg-primary-dark shadow-primary/20' : 'bg-surface-dark text-slate-500 cursor-not-allowed border border-white/5'}`}
               >
                  <span className="material-symbols-outlined">qr_code_scanner</span>
                  {totalPending > 0 ? 'Enviar Comprovante Pix' : 'Tudo Pago!'}
               </button>
           </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-surface-dark p-1 rounded-xl border border-white/5">
          <button 
            onClick={() => setFilter('pending')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'pending' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Pendentes
          </button>
          <button 
            onClick={() => setFilter('history')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'history' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Histórico
          </button>
        </div>

        {/* List */}
        <div className="flex flex-col gap-3 min-h-[200px]">
           {filter === 'pending' ? (
              pendingItems.length > 0 ? (
                  pendingItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-surface-dark border border-l-4 border-l-yellow-500 border-white/5 rounded-xl">
                    <div className="flex items-start gap-3">
                        <div className="size-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 mt-1">
                            <span className="material-symbols-outlined text-xl">
                                {item.type === 'monthly' ? 'calendar_month' : 'local_dining'}
                            </span>
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-sm">{item.title}</h4>
                            <p className="text-red-400 text-xs font-medium mt-0.5">Vence: {item.due}</p>
                        </div>
                    </div>
                    <span className="text-white font-bold">R$ {item.amount.toFixed(2)}</span>
                    </div>
                ))
              ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                      <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
                      <p className="text-sm font-medium">Nenhuma pendência!</p>
                  </div>
              )
           ) : (
              historyItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-surface-dark border border-white/5 rounded-xl opacity-80 hover:opacity-100 transition-opacity">
                   <div className="flex items-start gap-3">
                      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mt-1">
                         <span className="material-symbols-outlined text-xl">check</span>
                      </div>
                      <div>
                         <h4 className="text-white font-bold text-sm">{item.title}</h4>
                         <p className="text-slate-500 text-xs mt-0.5">{item.date}</p>
                      </div>
                   </div>
                   <span className="text-slate-300 font-medium line-through decoration-slate-600">R$ {item.amount.toFixed(2)}</span>
                </div>
              ))
           )}
        </div>
      </main>

      {/* --- UPLOAD & SCANNER MODAL --- */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background-dark animate-in slide-in-from-bottom-10 duration-300">
            {/* Modal Header */}
            <div className="flex items-center p-4 pt-6 justify-between bg-background-dark">
                <button onClick={resetModal} className="flex size-10 items-center justify-center rounded-full bg-surface-dark text-white">
                    <span className="material-symbols-outlined">close</span>
                </button>
                <h3 className="text-white font-bold">Comprovante Pix</h3>
                <div className="size-10"></div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                
                {!isProcessing ? (
                    // Initial State: Dropzone
                    <div className="w-full max-w-sm flex flex-col items-center gap-6">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full aspect-[3/4] rounded-3xl border-2 border-dashed border-white/20 bg-surface-dark flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 hover:bg-surface-dark/80 transition-all group"
                        >
                            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-4xl text-primary">add_photo_alternate</span>
                            </div>
                            <div className="text-center px-6">
                                <p className="text-white font-bold text-lg">Toque para enviar</p>
                                <p className="text-slate-400 text-sm mt-1">Reconhecimento automático dos dados do comprovante</p>
                            </div>
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept="image/*" 
                            className="hidden" 
                        />
                    </div>
                ) : (
                    // Processing State
                    <div className="w-full max-w-sm flex flex-col items-center relative">
                        {/* Image Preview with Scan Animation */}
                        <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 shadow-2xl mb-8">
                            {scannedImage && <img src={scannedImage} alt="Comprovante" className="w-full h-full object-cover opacity-60" />}
                            
                            {/* Scanning Line Animation */}
                            {processStep < 4 && (
                                <div className="absolute inset-0 z-10">
                                    <div className="w-full h-1 bg-primary shadow-[0_0_20px_#13ec5b] absolute animate-[scan_2s_linear_infinite]"></div>
                                </div>
                            )}

                            {/* Success Overlay */}
                            {processStep === 4 && (
                                <div className="absolute inset-0 z-20 bg-primary/90 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                                    <div className="size-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-xl">
                                        <span className="material-symbols-outlined text-6xl text-primary">check</span>
                                    </div>
                                    <h3 className="text-background-dark text-2xl font-black italic">PAGAMENTO CONFIRMADO!</h3>
                                </div>
                            )}

                            {/* Status Text Overlay */}
                            <div className="absolute bottom-6 left-0 right-0 text-center z-10">
                                <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                                    {processStep < 4 && <span className="material-symbols-outlined text-primary animate-spin text-sm">progress_activity</span>}
                                    <span className="text-white text-xs font-bold uppercase tracking-wider">
                                        {processStep === 1 && 'Digitalizando Imagem...'}
                                        {processStep === 2 && 'Extraindo Dados do Pix...'}
                                        {processStep === 3 && 'Validando Pendência...'}
                                        {processStep === 4 && 'Validado com Sucesso'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Extracted Data Visualization (Steps 2 & 3) */}
                        <div className="w-full bg-surface-dark border border-white/10 rounded-2xl p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-xs font-bold uppercase">Valor</span>
                                <div className="flex items-center gap-2">
                                    {processStep >= 2 ? (
                                        <span className="text-white font-mono font-bold animate-in fade-in slide-in-from-right-4">R$ {successData?.amount.toFixed(2) || '50.00'}</span>
                                    ) : (
                                        <div className="h-4 w-16 bg-white/10 rounded animate-pulse"></div>
                                    )}
                                    {processStep >= 3 && <span className="material-symbols-outlined text-primary text-sm">check_circle</span>}
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-xs font-bold uppercase">Favorecido</span>
                                <div className="flex items-center gap-2">
                                    {processStep >= 2 ? (
                                        <span className="text-white font-mono font-bold animate-in fade-in slide-in-from-right-4">AmaPlay FC</span>
                                    ) : (
                                        <div className="h-4 w-24 bg-white/10 rounded animate-pulse"></div>
                                    )}
                                    {processStep >= 3 && <span className="material-symbols-outlined text-primary text-sm">check_circle</span>}
                                </div>
                            </div>
                            {processStep >= 3 && (
                                <div className="pt-2 border-t border-white/5 mt-2 animate-in fade-in">
                                    <div className="flex justify-between items-center text-primary">
                                        <span className="text-xs font-bold uppercase">Item Identificado</span>
                                        <span className="text-sm font-bold">{successData?.itemTitle || 'Mensalidade Outubro'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default PlayerPaymentsScreen;