import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { useUser } from '../contexts/UserContext';

const ScoutsScreen = () => {
  const navigate = useNavigate();
  const { name, avatar } = useUser(); // Get current user info
  const [loading, setLoading] = useState(false);
  const [cep, setCep] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState({
    street: '',
    neighborhood: '',
    city: '',
    state: ''
  });
  const [number, setNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [isWhatsapp, setIsWhatsapp] = useState(true);
  const [fullName, setFullName] = useState(name || '');

  // Mask Functions
  const maskCep = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{5})(\d)/, '$1-$2')
      .substring(0, 9);
  };

  const maskPhone = (value: string) => {
    let v = value.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);

    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    v = v.replace(/(\d)(\d{4})$/, "$1-$2");
    return v;
  };

  // Address Fetch Logic
  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setAddress({
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf
          });
        }
      } catch (error) {
        console.error("Erro ao buscar CEP", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCep(maskCep(e.target.value));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(maskPhone(e.target.value));
  };

  // Age Calculation Logic
  useEffect(() => {
    if (birthDate) {
      const birth = new Date(birthDate);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        calculatedAge--;
      }
      setAge(calculatedAge);
    } else {
      setAge(null);
    }
  }, [birthDate]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Try to find existing player by name/avatar logic or just create new for current user
      // For this mock, we'll search by name or create
      const players = await dataService.players.list();
      const existing = players.find(p => p.name === fullName || p.name === name);

      const playerData: any = {
        name: fullName,
        phone,
        birthDate,
        address: {
          cep,
          ...address,
          number
        },
        // Maintain existing fields if updating
        ...(existing || {
          position: 'ATA', // Default
          avatar: avatar || 'https://i.pravatar.cc/150?u=me',
          teamId: parseInt(localStorage.getItem('amaplay_current_team_id') || '101'),
          stats: { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70 },
          ovr: 70,
          maxScout: 0
        })
      };

      if (existing) {
        await dataService.players.save({ ...playerData, id: existing.id });
      } else {
        await dataService.players.save(playerData);
      }

      // Navigate to pro-selection
      navigate('/pro-selection');
    } catch (e) {
      console.error("Error saving profile", e);
      alert("Erro ao salvar dados.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen w-full bg-background-dark">
      <header className="flex items-center p-4 pb-2 justify-between sticky top-0 z-20 bg-background-dark/95 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-dark shadow-sm hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-white">arrow_back</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight">AmaPlay Pro</h2>
        <div className="size-10"></div>
      </header>

      <main className="flex-1 flex flex-col px-6 py-6 overflow-y-auto no-scrollbar pb-28">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Dados Complementares</h1>
          <p className="text-slate-400 text-sm">Preencha suas informações para completar seu perfil de atleta e participar do game.</p>
        </div>

        <form className="flex flex-col gap-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>

          {/* Nome Completo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-slate-300 ml-1">Nome Completo</label>
            <input
              type="text"
              className="w-full bg-surface-dark border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-primary focus:ring-0 transition-colors placeholder:text-slate-600"
              placeholder="Digite seu nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          {/* Data de Nascimento & Idade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-300 ml-1">Nascimento</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-surface-dark border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-primary focus:ring-0 transition-colors [color-scheme:dark]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-300 ml-1">Idade</label>
              <div className="w-full bg-surface-dark/50 border border-white/5 rounded-xl px-4 py-3.5 text-slate-400 font-medium">
                {age !== null ? `${age} anos` : '-'}
              </div>
            </div>
          </div>

          {/* Telefone & WhatsApp */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-slate-300 ml-1">Celular</label>
            <div className="flex gap-3">
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                maxLength={15}
                className="flex-1 bg-surface-dark border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-primary focus:ring-0 transition-colors placeholder:text-slate-600"
                placeholder="(00) 00000-0000"
              />
              <button
                type="button"
                onClick={() => setIsWhatsapp(!isWhatsapp)}
                className={`px-4 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all min-w-[80px] ${isWhatsapp ? 'bg-[#25D366]/20 border-[#25D366] text-[#25D366]' : 'bg-surface-dark border-white/10 text-slate-500'}`}
              >
                <i className="fa-brands fa-whatsapp text-xl"></i>
                <span className="material-symbols-outlined text-2xl">chat</span>
                <span className="text-[10px] font-bold uppercase">{isWhatsapp ? 'É Whats' : 'Não é'}</span>
              </button>
            </div>
          </div>

          <div className="h-px bg-white/10 w-full my-2"></div>

          {/* Endereço Section */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">location_on</span>
              Endereço
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-300 ml-1">CEP</label>
              <div className="relative">
                <input
                  type="text"
                  value={cep}
                  onChange={handleCepChange}
                  onBlur={handleCepBlur}
                  maxLength={9}
                  className="w-full bg-surface-dark border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-primary focus:ring-0 transition-colors placeholder:text-slate-600"
                  placeholder="00000-000"
                />
                {loading && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-300 ml-1">Rua / Logradouro</label>
              <input
                type="text"
                value={address.street}
                readOnly
                className="w-full bg-surface-dark/50 border border-white/5 rounded-xl px-4 py-3.5 text-slate-300 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-300 ml-1">Número</label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full bg-surface-dark border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-primary focus:ring-0 transition-colors"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-300 ml-1">Bairro</label>
                <input
                  type="text"
                  value={address.neighborhood}
                  readOnly
                  className="w-full bg-surface-dark/50 border border-white/5 rounded-xl px-4 py-3.5 text-slate-300 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-300 ml-1">Cidade</label>
                <input
                  type="text"
                  value={address.city}
                  readOnly
                  className="w-full bg-surface-dark/50 border border-white/5 rounded-xl px-4 py-3.5 text-slate-300 focus:outline-none"
                />
              </div>
              <div className="col-span-1 flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-300 ml-1">UF</label>
                <input
                  type="text"
                  value={address.state}
                  readOnly
                  className="w-full bg-surface-dark/50 border border-white/5 rounded-xl px-4 py-3.5 text-slate-300 focus:outline-none"
                />
              </div>
            </div>
          </div>

        </form>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background-dark via-background-dark to-transparent z-10 w-full max-w-md mx-auto">
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-primary text-primary-content font-bold text-lg rounded-full py-4 shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {loading ? 'Salvando...' : 'Salvar Dados'}
          {!loading && <span className="material-symbols-outlined text-xl">save</span>}
        </button>
      </div>
    </div>
  );
};

export default ScoutsScreen;