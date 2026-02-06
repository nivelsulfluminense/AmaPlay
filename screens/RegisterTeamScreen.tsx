import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../services/supabase';
import { removeBackground } from '@imgly/background-removal';
import { ImageEditor } from '../components/ImageEditor';

const COLORS = [
  { hex: '#13ec5b', name: 'Verde Neon' },
  { hex: '#ffffff', name: 'Branco' },
  { hex: '#000000', name: 'Preto' },
  { hex: '#ef4444', name: 'Vermelho' },
  { hex: '#3b82f6', name: 'Azul Real' },
  { hex: '#eab308', name: 'Amarelo' },
  { hex: '#f97316', name: 'Laranja' },
  { hex: '#a855f7', name: 'Roxo' },
  { hex: '#ec4899', name: 'Rosa' },
  { hex: '#64748b', name: 'Cinza' },
  { hex: '#1e3a8a', name: 'Azul Marinho' },
  { hex: '#7f1d1d', name: 'Vinho' },
];

const RegisterTeamScreen = () => {
  const navigate = useNavigate();
  const { teamId, teamDetails, createTeam, joinTeam, setTeamId, setTeamDetails, isLoading: isContextLoading, role, intendedRole } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flow State
  const [mode, setMode] = useState<'create' | 'join' | 'select' | 'confirm' | null>(null);

  // Detect if user already has a team (Pres/VP case)
  // Detect if user already has a team (Pres/VP case)
  React.useEffect(() => {
    // 🛡️ HARDENED LOGIC: Se tem teamId e é gestor, vai para confirmação
    if (teamId && (intendedRole === 'presidente' || intendedRole === 'vice-presidente')) {
      setMode('confirm');
    }
  }, [teamId, intendedRole]);
  const [searchTerm, setSearchTerm] = useState('');
  const [foundTeams, setFoundTeams] = useState<any[]>([]);
  const [recentTeams, setRecentTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch recent teams on mount
  React.useEffect(() => {
    const fetchRecentTeams = async () => {
      try {
        const { data, error } = await supabase
          .from('teams')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        if (error) throw error;
        setRecentTeams(data || []);
        // Initialize search results with recent teams for immediate choices
        if (!searchTerm) {
          setFoundTeams(data || []);
        }
      } catch (err) {
        console.error("Failed to fetch recent teams", err);
      }
    };
    fetchRecentTeams();
  }, []);

  // Form State
  const [teamName, setTeamName] = useState(teamDetails.name);
  const [primaryColor, setPrimaryColor] = useState(teamDetails.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(teamDetails.secondaryColor);
  const [logo, setLogo] = useState<string | null>(teamDetails.logo);

  // Logo Editor State
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [rawLogo, setRawLogo] = useState<string | null>(null);

  // Color Picker Modal State
  const [showColorPicker, setShowColorPicker] = useState<'primary' | 'secondary' | null>(null);

  // --- Handlers ---

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawLogo(reader.result as string);
        setShowImageEditor(true);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const handleSaveLogo = (processedImage: string) => {
    setLogo(processedImage);
    setShowImageEditor(false);
  };

  const handleContinue = async () => {
    if (!teamName.trim()) return;

    try {
      await createTeam({
        name: teamName,
        primaryColor,
        secondaryColor,
        logo
      });
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Erro ao criar time');
    }
  };

  const handleSearchTeams = async () => {
    if (searchTerm.length < 3) return;
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .limit(10);
      if (error) throw error;
      setFoundTeams(data || []);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleJoin = async () => {
    if (!selectedTeam) return;
    try {
      await joinTeam(selectedTeam.id);
      navigate('/register-privacy');
    } catch (err: any) {
      alert(err.message || 'Erro ao entrar no time');
    }
  };

  const handleClearTeam = async () => {
    try {
      if (intendedRole === 'presidente' || intendedRole === 'vice-presidente') {
        // If they created it, we might want to keep it in DB but unassign it from them?
        // Or if they just want to "change", we nullify their team_id.
        await setTeamId(null);
        setTeamDetails({
          name: '',
          primaryColor: '#13ec5b',
          secondaryColor: '#ffffff',
          logo: null
        });
        setMode(null);
      }
    } catch (err) {
      console.error("Failed to clear team", err);
    }
  };

  return (
    <div className="flex h-full min-h-screen w-full flex-col relative bg-background-dark">
      <div className="flex items-center p-4 pb-2 justify-between z-10 sticky top-0 bg-background-dark/95 backdrop-blur-sm">
        <button onClick={() => navigate('/register-role')} className="text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="size-10"></div>
      </div>

      <div className="flex flex-col gap-3 px-6 pt-2 pb-6">
        <div className="flex gap-6 justify-between items-end">
          <p className="text-slate-400 text-sm font-medium leading-normal uppercase tracking-wider">Passo 2 de 3</p>
          <span className="text-primary text-xs font-bold bg-primary/10 px-2 py-1 rounded">66%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-surface-dark overflow-hidden">
          <div className="h-full rounded-full bg-primary shadow-glow transition-all duration-500 ease-out" style={{ width: '66%' }}></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-28">
        {!mode ? (
          <div className="px-6 py-8 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-5">
            <h1 className="text-white tracking-tight text-[32px] font-bold leading-[1.1]">
              Seu time já foi <span className="text-primary">cadastrado?</span>
            </h1>
            <p className="text-slate-300 text-base font-normal leading-relaxed">
              Verifique se alguém já criou o esquadrão no AmaFut antes de começar.
            </p>

            <div className="flex flex-col gap-4 mt-4">
              <button
                onClick={() => setMode('join')}
                className="w-full p-6 pb-2 rounded-2xl bg-surface-dark border border-white/10 hover:border-primary/50 transition-all text-left flex flex-col gap-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="material-symbols-outlined text-primary text-3xl group-hover:scale-110 transition-transform">search</span>
                  <span className="material-symbols-outlined text-slate-600 group-hover:text-primary">arrow_forward</span>
                </div>
                <h3 className="text-white text-xl font-bold">Sim, procurar meu time</h3>
                <p className="text-slate-400 text-sm">Vou pedir para participar de um time que já existe.</p>
              </button>

              <button
                onClick={() => setMode('create')}
                className="w-full p-6 pb-2 rounded-2xl bg-surface-dark border border-white/10 hover:border-primary/50 transition-all text-left flex flex-col gap-2 group animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <div className="flex items-center justify-between">
                  <span className="material-symbols-outlined text-primary text-3xl group-hover:scale-110 transition-transform">add_circle</span>
                  <span className="material-symbols-outlined text-slate-600 group-hover:text-primary">arrow_forward</span>
                </div>
                <h3 className="text-white text-xl font-bold">Não, cadastrar novo time</h3>
                <p className="text-slate-400 text-sm">Eu sou o responsável por criar este esquadrão.</p>
              </button>
            </div>
          </div>
        ) : mode === 'confirm' ? (
          <div className="px-6 py-8 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-5">
            <div className="flex flex-col gap-2">
              <h1 className="text-white tracking-tight text-[32px] font-bold leading-[1.1]">
                Olá, <span className="text-primary">{intendedRole === 'presidente' ? 'Presidente' : 'Vice'}!</span>
              </h1>
              <p className="text-slate-300 text-base font-normal leading-relaxed">
                Detectamos que você já possui um time cadastrado. Deseja prosseguir com ele?
              </p>
            </div>

            {/* Team Card Preview */}
            <div className="p-6 rounded-2xl bg-surface-dark border border-primary/30 shadow-[0_0_20px_rgba(19,236,91,0.1)] flex items-center gap-4">
              <div className="size-20 rounded-full bg-background-dark border-2 border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                {teamDetails.logo ? (
                  <img src={teamDetails.logo} className="w-full h-full object-contain p-2" />
                ) : (
                  <span className="material-symbols-outlined text-4xl text-slate-600">shield</span>
                )}
              </div>
              <div className="flex-grow">
                <h3 className="text-white text-2xl font-black italic uppercase tracking-tight">{teamDetails.name}</h3>
                <div className="flex gap-2 mt-2">
                  <div className="size-4 rounded-full border border-white/10" style={{ backgroundColor: teamDetails.primaryColor }}></div>
                  <div className="size-4 rounded-full border border-white/10" style={{ backgroundColor: teamDetails.secondaryColor }}></div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-4">
              <button
                onClick={() => navigate('/register-privacy')}
                className="w-full p-4 rounded-xl bg-primary text-background-dark font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-glow"
              >
                Confirmar Time
                <span className="material-symbols-outlined font-bold text-xl">check_circle</span>
              </button>

              <button
                onClick={handleClearTeam}
                className="w-full p-4 rounded-xl bg-surface-dark border border-white/10 text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                Trocar de Time
                <span className="material-symbols-outlined text-xl">cached</span>
              </button>

              <button
                onClick={() => setMode('join')}
                className="w-full p-4 rounded-xl bg-background-dark border border-white/5 text-slate-400 font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                Jogar em mais um time
                <span className="material-symbols-outlined text-lg">add_box</span>
              </button>
            </div>
          </div>
        ) : mode === 'join' ? (
          <div className="px-6 py-4 flex flex-col gap-6 animate-in fade-in slide-in-from-right-5">
            <div className="flex flex-col gap-2">
              <h1 className="text-white text-[28px] font-bold leading-tight">Procurar <span className="text-primary">Time</span></h1>
              <p className="text-slate-400 text-sm">Digite o nome do time para solicitar sua entrada.</p>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Ex: Peladeiros FC"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value.length === 0) {
                    setFoundTeams(recentTeams);
                  }
                }}
                onKeyUp={(e) => e.key === 'Enter' && handleSearchTeams()}
                className="w-full bg-surface-dark text-white rounded-xl border border-white/10 px-4 py-4 pr-12 focus:ring-2 focus:ring-primary outline-none"
              />
              <button
                onClick={handleSearchTeams}
                className="absolute right-3 top-1/2 -translate-y-1/2 size-10 flex items-center justify-center text-primary"
              >
                <span className="material-symbols-outlined">search</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {isSearching && (
                <div className="flex justify-center py-8">
                  <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
                </div>
              )}

              {!isSearching && foundTeams.length > 0 && (
                <>
                  {!searchTerm && (
                    <div className="flex items-center gap-2 px-1 mb-1">
                      <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Times Recém Cadastrados</p>
                    </div>
                  )}
                  {foundTeams.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTeam(t)}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${selectedTeam?.id === t.id ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(19,236,91,0.2)]' : 'bg-surface-dark border-white/5 hover:border-white/20'}`}
                    >
                      <div className="size-12 rounded-full bg-background-dark border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        {t.logo ? <img src={t.logo} className="w-full h-full object-contain" /> : <span className="material-symbols-outlined text-slate-600">shield</span>}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white font-bold">{t.name}</p>
                        <p className="text-slate-500 text-xs">{t.location || 'Sem localização'}</p>
                      </div>
                      {selectedTeam?.id === t.id && <span className="material-symbols-outlined text-primary">check_circle</span>}
                    </button>
                  ))}
                </>
              )}

              {!isSearching && searchTerm.length > 3 && foundTeams.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-slate-500">Nenhum time encontrado para "{searchTerm}"</p>
                  <button onClick={() => setMode('create')} className="text-primary font-bold mt-2 hover:underline transition-all">Criar este time agora</button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 pb-2">
              <h1 className="text-white tracking-tight text-[32px] font-bold leading-[1.1]">
                Dados do <span className="text-primary">Time</span>
              </h1>
              <p className="text-slate-300 text-base font-normal leading-relaxed pt-2">
                Defina a identidade visual e o nome do seu esquadrão.
              </p>
            </div>

            {/* LOGO UPLOAD SECTION */}
            <div className="flex flex-col items-center justify-center py-8 px-6">
              <div
                className="relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className={`absolute -inset-1 rounded-full border-2 border-dashed transition-colors ${logo ? 'border-primary' : 'border-slate-600 group-hover:border-primary'}`}></div>

                <div className="size-32 rounded-full bg-surface-dark flex items-center justify-center relative overflow-hidden border-4 border-background-dark z-10 transition-transform group-hover:scale-95 shadow-xl">
                  {logo ? (
                    <img src={logo} alt="Escudo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-500 group-hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-4xl">shield</span>
                      <span className="text-[10px] font-bold uppercase">Upload</span>
                    </div>
                  )}
                </div>

                <div className="absolute bottom-1 right-1 z-20 bg-primary text-background-dark rounded-full p-2 shadow-lg flex items-center justify-center border-2 border-background-dark active:scale-90 transition-transform">
                  <span className="material-symbols-outlined text-[18px]">{logo ? 'edit' : 'add_a_photo'}</span>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-400 font-medium">Escudo do time (Opcional)</p>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div className="px-6 space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-white text-base font-semibold" htmlFor="teamName">Nome do Time</label>
                <div className="relative">
                  <input
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full bg-surface-dark text-white placeholder:text-slate-500 rounded-xl border-none px-4 py-4 focus:ring-2 focus:ring-primary focus:bg-surface-dark transition-all outline-none text-lg font-medium shadow-inner"
                    id="teamName"
                    placeholder="Ex: Peladeiros FC"
                    type="text"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary">
                    <span className="material-symbols-outlined">sports_soccer</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <label className="text-white text-base font-semibold">Cores do Uniforme</label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Primary Color Button */}
                  <button
                    onClick={() => setShowColorPicker('primary')}
                    className="flex flex-col gap-3 p-4 rounded-xl bg-surface-dark hover:bg-[#1f3d2b] transition-colors group text-left relative overflow-hidden border border-white/5 shadow-md active:scale-[0.98]"
                  >
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cor Principal</span>
                    <div className="flex items-center gap-3">
                      <div
                        className="size-8 rounded-full shadow-sm border border-white/10 ring-2 ring-white/5"
                        style={{ backgroundColor: primaryColor }}
                      ></div>
                      <span className="text-sm font-bold text-white uppercase">{COLORS.find(c => c.hex === primaryColor)?.name || primaryColor}</span>
                    </div>
                    <span className="absolute right-3 top-3 text-slate-600 group-hover:text-primary transition-colors material-symbols-outlined text-lg">palette</span>
                  </button>

                  {/* Secondary Color Button */}
                  <button
                    onClick={() => setShowColorPicker('secondary')}
                    className="flex flex-col gap-3 p-4 rounded-xl bg-surface-dark hover:bg-[#1f3d2b] transition-colors group text-left relative overflow-hidden border border-white/5 shadow-md active:scale-[0.98]"
                  >
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cor Secundária</span>
                    <div className="flex items-center gap-3">
                      <div
                        className="size-8 rounded-full shadow-sm border border-white/10 ring-2 ring-white/5"
                        style={{ backgroundColor: secondaryColor }}
                      ></div>
                      <span className="text-sm font-bold text-white uppercase">{COLORS.find(c => c.hex === secondaryColor)?.name || secondaryColor}</span>
                    </div>
                    <span className="absolute right-3 top-3 text-slate-600 group-hover:text-primary transition-colors material-symbols-outlined text-lg">palette</span>
                  </button>
                </div>

                {/* Visual Preview */}
                <div
                  className="mt-2 p-4 rounded-xl flex items-center gap-4 transition-colors duration-500 shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor} 50%, ${secondaryColor} 50%, ${secondaryColor} 100%)`
                  }}
                >
                  <div className="relative size-12 shrink-0 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full overflow-hidden border border-white/20 shadow-inner">
                    {logo ? (
                      <img src={logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-3xl text-white drop-shadow-md z-10">checkroom</span>
                    )}
                  </div>
                  <div className="flex-1 bg-black/40 backdrop-blur-sm rounded-lg p-2 px-3">
                    <p className="text-sm font-bold text-white">Visual do Uniforme</p>
                    <p className="text-xs text-slate-300">{teamName || 'Nome do Time'}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-dark via-background-dark to-transparent pt-12 z-20 text-center">
        {mode && (
          <div className="max-w-md mx-auto flex items-center gap-4">
            <button
              onClick={() => {
                if (mode === 'join' && selectedTeam) setSelectedTeam(null);
                else setMode(null);
              }}
              className="flex-1 py-4 rounded-full text-slate-300 font-semibold hover:bg-white/5 transition-colors"
            >
              Voltar
            </button>
            <button
              onClick={mode === 'create' ? handleContinue : handleJoin}
              disabled={(mode === 'create' && !teamName.trim()) || (mode === 'join' && !selectedTeam) || isContextLoading}
              className={`flex-[2] py-4 rounded-full font-bold text-lg transition-all flex items-center justify-center gap-2 group
                  ${((mode === 'create' && !teamName.trim()) || (mode === 'join' && !selectedTeam) || isContextLoading)
                  ? 'bg-surface-dark border border-white/10 text-slate-500 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary-dark text-background-dark shadow-[0_0_20px_rgba(19,236,91,0.3)] hover:shadow-[0_0_30px_rgba(19,236,91,0.5)]'}
              `}
            >
              {isContextLoading ? 'Processando...' : (
                mode === 'join' && selectedTeam && (intendedRole === 'presidente' || intendedRole === 'vice-presidente')
                  ? `Solicitar ${intendedRole.charAt(0).toUpperCase() + intendedRole.slice(1)}`
                  : 'Continuar'
              )}
              {!isContextLoading && <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>}
            </button>
          </div>
        )}
        {!mode && (
          <button
            onClick={() => navigate('/register-role')}
            className="text-slate-500 text-sm font-medium hover:text-white transition-colors"
          >
            Alterar minha função
          </button>
        )}
      </div>

      {/* --- LOGO EDITOR MODAL --- */}
      {showImageEditor && rawLogo && (
        <ImageEditor
          imageSrc={rawLogo}
          onSave={handleSaveLogo}
          onCancel={() => setShowImageEditor(false)}
          aspectRatio={1}
          allowBackgroundRemoval={true}
        />
      )}

      {/* --- COLOR PICKER MODAL --- */}
      {showColorPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
          <div className="bg-surface-dark w-full max-w-sm rounded-t-2xl sm:rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-10">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-background-dark">
              <h3 className="text-white font-bold text-lg">
                Escolher {showColorPicker === 'primary' ? 'Cor Principal' : 'Cor Secundária'}
              </h3>
              <button onClick={() => setShowColorPicker(null)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-4 gap-4 no-scrollbar">
              {COLORS.map((color) => (
                <button
                  key={color.hex}
                  onClick={() => {
                    if (showColorPicker === 'primary') setPrimaryColor(color.hex);
                    else setSecondaryColor(color.hex);
                    setShowColorPicker(null);
                  }}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div
                    className={`size-12 rounded-full border-2 transition-transform group-hover:scale-110 shadow-lg ${(showColorPicker === 'primary' ? primaryColor : secondaryColor) === color.hex
                      ? 'border-white ring-2 ring-primary' : 'border-white/10'
                      }`}
                    style={{ backgroundColor: color.hex }}
                  ></div>
                  <span className={`text-[10px] font-bold text-center ${(showColorPicker === 'primary' ? primaryColor : secondaryColor) === color.hex
                    ? 'text-white' : 'text-slate-500'
                    }`}>
                    {color.name}
                  </span>
                </button>
              ))}

              {/* Custom Color Input */}
              <label className="flex flex-col items-center gap-2 group cursor-pointer relative">
                <div className="size-12 rounded-full border-2 border-white/10 bg-[conic-gradient(at_center,_red,_yellow,_lime,_cyan,_blue,_magenta,_red)] flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <span className="material-symbols-outlined text-white drop-shadow-md">add</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500">Personalizado</span>
                <input
                  type="color"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  value={showColorPicker === 'primary' ? primaryColor : secondaryColor}
                  onChange={(e) => {
                    if (showColorPicker === 'primary') setPrimaryColor(e.target.value);
                    else setSecondaryColor(e.target.value);
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}



    </div>
  );
};

export default RegisterTeamScreen;