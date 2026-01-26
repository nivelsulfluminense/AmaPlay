import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import * as faceapi from '@vladmandic/face-api';
import { dataService, CustomTeam } from '../services/dataService';

const RegisterProfileScreen = () => {
  const navigate = useNavigate();
  const { setName, markSetupComplete, setAvatar, teamDetails, teamId, role, intendedRole, isApproved } = useUser();

  // Form States
  const [inputValue, setInputValue] = useState('');
  const [position, setPosition] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Heart Team Selection States
  const [selectedHeartTeam, setSelectedHeartTeam] = useState<string | null>(null);
  const [showChangeTeamModal, setShowChangeTeamModal] = useState(false);

  // Amateur Teams to Join
  const [requestedTeams, setRequestedTeams] = useState<string[]>([]);
  const [customTeams, setCustomTeams] = useState<CustomTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [isPublicProfile, setIsPublicProfile] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  // Load Face API Models
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Loading models from a reliable CDN for face-api
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/model/';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
        console.log("FaceAPI Models Loaded");
      } catch (error) {
        console.error("Failed to load FaceAPI models:", error);
        // Fallback: app continues but automatic centering won't work
      }
    };
    loadModels();
  }, []);

  // Load Custom Teams
  useEffect(() => {
    const loadTeams = async () => {
      setLoadingTeams(true);
      try {
        const teams = await dataService.customTeams.list();
        setCustomTeams(teams.filter(t => t.isPublic)); // Only show public teams
      } catch (err) {
        console.error("Failed to load custom teams", err);
      } finally {
        setLoadingTeams(false);
      }
    };
    loadTeams();
  }, []);

  // Algorithm to Center Face
  const processFaceCentering = async (imageSrc: string): Promise<string> => {
    if (!modelsLoaded) return imageSrc;

    return new Promise(async (resolve) => {
      try {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageSrc;

        img.onload = async () => {
          try {
            // 1. Detect Face
            // Using TinyFaceDetector for speed on mobile devices
            const detection = await faceapi.detectSingleFace(
              img,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 })
            );

            if (!detection) {
              console.log("No face detected, using original");
              resolve(imageSrc);
              return;
            }

            // 2. Calculate Crop Coordinates
            const box = detection.box;

            // Calculate center of the face
            const faceCenterX = box.x + (box.width / 2);
            const faceCenterY = box.y + (box.height / 2);

            // Determine crop size
            // We want the face to occupy roughly 40-50% of the avatar circle
            // So the crop box size should be roughly 2x - 2.5x the detected face size
            let cropSize = Math.max(box.width, box.height) * 2.2;

            // Clamp crop size so we don't zoom in *too* much if face is huge, or out too much
            // Also ensure crop size doesn't exceed image dimensions (taking the smaller dimension)
            const minImgDim = Math.min(img.width, img.height);
            if (cropSize > minImgDim) cropSize = minImgDim;

            // Calculate top-left source coordinates (sx, sy) to center the crop around faceCenter
            let sx = faceCenterX - (cropSize / 2);
            let sy = faceCenterY - (cropSize / 2);

            // Boundary checks: Keep the crop within the image
            if (sx < 0) sx = 0;
            if (sy < 0) sy = 0;
            if (sx + cropSize > img.width) sx = img.width - cropSize;
            if (sy + cropSize > img.height) sy = img.height - cropSize;

            // 3. Draw to Canvas
            const canvas = document.createElement('canvas');
            const size = 512; // Output resolution
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            if (ctx) {
              // Draw the cropped area onto the full canvas
              ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, size, size);
              const centeredDataUrl = canvas.toDataURL('image/jpeg', 0.9);
              resolve(centeredDataUrl);
            } else {
              resolve(imageSrc);
            }

          } catch (e) {
            console.error("Error during detection:", e);
            resolve(imageSrc);
          }
        };

        img.onerror = () => resolve(imageSrc);

      } catch (e) {
        resolve(imageSrc);
      }
    });
  };

  const isValid = !!previewImage && inputValue.trim().length > 0 && position !== "" && !!selectedHeartTeam;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setValidationError(null);
      setIsAnalyzing(true);

      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawResult = reader.result as string;

        // Temporarily show raw image while processing
        setPreviewImage(rawResult);

        // Run Face Centering Algorithm
        const processedImage = await processFaceCentering(rawResult);

        setPreviewImage(processedImage);
        setAvatar(processedImage);
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleContinue = async () => {
    if (!isValid) {
      const missing = [];
      if (!previewImage) missing.push("Foto");
      if (!inputValue.trim()) missing.push("Nome");
      if (!position) missing.push("Posição");
      if (!selectedHeartTeam) missing.push("Time");

      setValidationError(`Falta preencher: ${missing.join(', ')}`);

      if (navigator.vibrate) navigator.vibrate(50);
      setTimeout(() => setValidationError(null), 3000);
      return;
    }

    setIsAnalyzing(true);
    try {
      // Update basic profile info
      await setName(inputValue);

      // Map positions correctly for the database
      const positionMapping: Record<string, string> = {
        'gk': 'GOL',
        'def': 'ZAG',
        'mid': 'MEI',
        'fwd': 'ATA'
      };

      const dbPosition = positionMapping[position] || position.toUpperCase();

      // Update extended profile info in Supabase
      const { authService } = await import('../services/authService');
      await authService.updateProfile({
        position: dbPosition as any,
        is_public: isPublicProfile,
        heart_team: selectedHeartTeam,
        is_setup_complete: true
      });

      markSetupComplete();

      // If user is already approved (e.g., first manager), go straight to Dashboard
      if (isApproved) {
        navigate('/dashboard');
      } else {
        setShowSuccessModal(true);
      }
    } catch (err: any) {
      setValidationError(err.message || 'Erro ao finalizar cadastro');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleTeamRequest = (teamId: string) => {
    setRequestedTeams(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleTeamClick = (teamId: string) => {
    if (selectedHeartTeam === teamId) {
      // If clicking the already selected team, show confirmation to change
      setShowChangeTeamModal(true);
    } else {
      // Select the team
      setSelectedHeartTeam(teamId);
      setValidationError(null); // Clear error on interaction
    }
  };

  const confirmChangeTeam = () => {
    setSelectedHeartTeam(null);
    setShowChangeTeamModal(false);
  };

  // Camera Logic
  const startCamera = async () => {
    setShowCamera(true);
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setShowCamera(false);
        alert("Não foi possível acessar a câmera. Verifique as permissões.");
      }
    }, 100);
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // Flip horizontally if using user facing camera to correct mirror effect
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0);
      }

      const rawResult = canvas.toDataURL('image/jpeg');

      stopCamera();

      // Process
      setIsAnalyzing(true);
      setPreviewImage(rawResult); // Show raw immediately/temporarily

      // Run face centering
      const processed = await processFaceCentering(rawResult);
      setPreviewImage(processed);
      setAvatar(processed);
      setIsAnalyzing(false);
    }
  };

  const professionalTeams = [
    { id: 'fla', name: 'Flamengo', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Clube_de_Regatas_do_Flamengo_logo.svg' },
    { id: 'pal', name: 'Palmeiras', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/10/Palmeiras_logo.svg' },
    { id: 'bot', name: 'Botafogo', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Botafogo_de_Futebol_e_Regatas_logo.svg' },
    { id: 'cam', name: 'Atlético-MG', logo: 'https://cdn.worldvectorlogo.com/logos/atletico-mineiro-mg-1.svg' },
    { id: 'gre', name: 'Grêmio', logo: 'https://cdn.worldvectorlogo.com/logos/gremio.svg' },
    { id: 'bah', name: 'Bahia', logo: 'https://logodownload.org/wp-content/uploads/2017/02/bahia-ec-logo-02.png' },
    { id: 'sp', name: 'São Paulo', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Brasao_do_Sao_Paulo_Futebol_Clube.svg' },
    { id: 'flu', name: 'Fluminense', logo: 'https://cdn.worldvectorlogo.com/logos/fluminense-rj.svg' },
    { id: 'int', name: 'Internacional', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Escudo_do_Sport_Club_Internacional.svg' },
    { id: 'for', name: 'Fortaleza', logo: 'https://cdn.worldvectorlogo.com/logos/fortaleza-1.svg' },
    { id: 'cor', name: 'Corinthians', logo: 'https://cdn.worldvectorlogo.com/logos/corinthians-paulista-1.svg' },
    { id: 'vas', name: 'Vasco', logo: 'https://cdn.worldvectorlogo.com/logos/vasco-da-gama-rj.svg' },
    { id: 'cru', name: 'Cruzeiro', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/90/Cruzeiro_Esporte_Clube_%28logo%29.svg' },
    { id: 'cap', name: 'Athletico-PR', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/43/Athletico_Paranaense_%28Logo_2019%29.svg' },
    { id: 'vit', name: 'Vitória', logo: 'https://cdn.worldvectorlogo.com/logos/vitoria-2.svg' },
    { id: 'san', name: 'Santos', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Santos_Logo.png' },
    { id: 'cuy', name: 'Cuiabá', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/68/Cuiab%C3%A1_EC_crest.png' },
    { id: 'cfc', name: 'Coritiba', logo: 'https://logodownload.org/wp-content/uploads/2017/02/coritiba-logo-escudo.png' },
    { id: 'juv', name: 'Juventude', logo: 'https://logodownload.org/wp-content/uploads/2017/02/ec-juventude-logo-escudo.png' },
    { id: 'cea', name: 'Ceará', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Cear%C3%A1_Sporting_Club_logo.svg' },
  ];

  return (
    <div className="flex flex-col h-full min-h-screen w-full relative">
      <header className="flex flex-col sticky top-0 z-20 bg-background-dark/95 backdrop-blur-sm">
        <div className="flex items-center p-4 pb-2 justify-between">
          <button onClick={() => navigate('/register-privacy')} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-dark shadow-sm active:scale-95 transition-transform">
            <span className="material-symbols-outlined text-white">arrow_back_ios_new</span>
          </button>
          <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Cadastro</h2>
          <div className="size-10"></div>
        </div>
        <div className="flex flex-col gap-3 px-6 pb-4">
          <div className="flex gap-6 justify-between items-end">
            <p className="text-slate-400 text-sm font-medium leading-normal">Passo 3 de 3</p>
            <p className="text-primary text-xs font-bold uppercase tracking-wider">Perfil do Jogador</p>
          </div>
          <div className="rounded-full bg-surface-dark h-1.5 overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: '100%' }}></div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-6 pb-28 overflow-y-auto w-full no-scrollbar">
        <div className="flex flex-col items-start pt-4 pb-6">
          <h1 className="text-white tracking-tight text-3xl font-extrabold leading-tight mb-2">Entre para o Time</h1>
          <p className="text-slate-400 text-base font-normal leading-normal">Adicione sua foto e escolha seus times.</p>
        </div>

        <div className="flex justify-center mb-8 w-full">
          <div className={`relative ${!previewImage && 'animate-pulse'}`}>
            <div
              className={`size-32 rounded-full overflow-hidden border-4 shadow-lg bg-surface-dark flex items-center justify-center bg-cover bg-center transition-all relative ${!previewImage ? 'border-primary/50' : 'border-surface-dark'} ${isAnalyzing ? 'brightness-50' : ''}`}
              style={{
                backgroundImage: previewImage
                  ? `url('${previewImage}')`
                  : "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD5yc3paTULDk93D9_RmLz37WGQkgHrMrjzXWakK7MpyqqsCvwjupZLT_Z1CQW4ZSKakE9PUF9cWTKb8lxhZf2DJs7ArYViW79cPnXU8JcVJtYzjl15gbiUK817gBh3vED49A7gHoaFTrIyHkp40qD1W88nTMqPjQ-PgGCrAe8Ed0Hp0dD_68ydVKsK7Oc9cR5qtuwFl8_xsQxvvegvDLlShVNJPE2BjgEhQR9_y0PPhgopYQIpuVjrZ5mOyf42V1dw3qN1vjA_7n8')"
              }}
            >
              {isAnalyzing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-3xl animate-spin">face</span>
                  <span className="text-[10px] text-primary font-bold mt-1">Centralizando...</span>
                </div>
              )}
            </div>

            {!isAnalyzing && (
              <>
                {/* Camera Button (Left) */}
                <button
                  onClick={(e) => { e.preventDefault(); startCamera(); }}
                  className="absolute bottom-0 -left-2 size-10 rounded-full text-white bg-surface-dark border border-white/10 flex items-center justify-center shadow-lg active:scale-90 transition-transform hover:bg-white/10"
                  title="Tirar Foto"
                >
                  <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                </button>

                {/* Upload Button (Right) */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`absolute bottom-0 -right-2 size-10 rounded-full text-primary-content border border-transparent flex items-center justify-center shadow-lg active:scale-90 transition-transform ${!previewImage ? 'bg-primary animate-bounce' : 'bg-primary'}`}
                  title="Galeria"
                >
                  <span className="material-symbols-outlined text-[20px] font-bold">add_photo_alternate</span>
                </button>
              </>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              disabled={isAnalyzing}
            />
          </div>
        </div>

        <form className="flex flex-col gap-6 w-full" onSubmit={(e) => { e.preventDefault(); handleContinue(); }}>
          {/* Personal Info */}
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium ml-2 text-slate-300" htmlFor="fullname">Nome de Exibição <span className="text-danger">*</span></label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-slate-400">person</span>
                <input
                  className="w-full bg-surface-dark border-transparent focus:border-primary focus:ring-0 rounded-full py-4 pl-12 pr-4 text-white placeholder:text-slate-400 transition-all shadow-sm"
                  id="fullname"
                  placeholder="Seu nome ou apelido"
                  type="text"
                  value={inputValue}
                  onChange={(e) => { setInputValue(e.target.value); setValidationError(null); }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium ml-2 text-slate-300" htmlFor="position">Posição Principal <span className="text-danger">*</span></label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-slate-400">sports_soccer</span>
                <select
                  className={`w-full bg-surface-dark border-transparent focus:border-primary focus:ring-0 rounded-full py-4 pl-12 pr-10 appearance-none cursor-pointer transition-all shadow-sm ${position ? 'text-white' : 'text-slate-400'}`}
                  id="position"
                  value={position}
                  onChange={(e) => { setPosition(e.target.value); setValidationError(null); }}
                >
                  <option disabled value="">Selecione sua posição</option>
                  <option value="gk" className="text-white bg-surface-dark">Goleiro</option>
                  <option value="def" className="text-white bg-surface-dark">Defensor</option>
                  <option value="mid" className="text-white bg-surface-dark">Meio-campo</option>
                  <option value="fwd" className="text-white bg-surface-dark">Atacante</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 text-slate-400 pointer-events-none">expand_more</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/10 w-full my-2"></div>

          {/* Time do Coração (Grid/Selected) */}
          <div className="flex flex-col gap-3 min-h-[140px]">
            <div className="flex justify-between items-baseline px-2">
              <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Time do Coração <span className="text-danger">*</span></label>
            </div>
            {!selectedHeartTeam && (
              <p className="text-xs text-slate-500 px-2 -mt-2 mb-2">Escolha seu time da Série A.</p>
            )}

            <div className={`transition-all duration-300 ${selectedHeartTeam ? 'flex justify-center py-4' : 'grid grid-cols-4 gap-4'}`}>
              {professionalTeams.map((team) => {
                // If a team is selected and this is NOT the selected team, hide it
                if (selectedHeartTeam && selectedHeartTeam !== team.id) return null;

                const isSelected = selectedHeartTeam === team.id;

                return (
                  <div
                    key={team.id}
                    onClick={() => handleTeamClick(team.id)}
                    className={`flex flex-col items-center gap-2 cursor-pointer group transition-all duration-300 
                      ${isSelected ? 'scale-125 z-10' : 'opacity-60 hover:opacity-100'}
                    `}
                  >
                    <div className={`rounded-full p-1 flex items-center justify-center bg-surface-dark border-2 transition-all shadow-md overflow-hidden 
                      ${isSelected ? 'size-24 border-primary shadow-primary/30 ring-4 ring-primary/10' : 'size-16 border-transparent'}
                    `}>
                      <img src={team.logo} alt={team.name} className="w-full h-full object-contain p-1" />
                    </div>
                    <span className={`font-bold text-center transition-all ${isSelected ? 'text-primary text-sm mt-1' : 'text-slate-400 text-[10px]'}`}>
                      {team.name}
                      {isSelected && <span className="block text-[10px] text-slate-400 font-normal">Toque para alterar</span>}
                    </span>
                  </div>
                );
              })}

              {/* Special logic for 'Outro' option */}
              {(!selectedHeartTeam || selectedHeartTeam === 'others') && (
                <div
                  onClick={() => handleTeamClick('others')}
                  className={`flex flex-col items-center gap-2 cursor-pointer group transition-all duration-300 
                     ${selectedHeartTeam === 'others' ? 'scale-125 z-10' : 'opacity-60 hover:opacity-100'}
                   `}
                >
                  <div className={`rounded-full bg-surface-dark border-2 border-dashed flex items-center justify-center 
                     ${selectedHeartTeam === 'others' ? 'size-24 border-primary shadow-primary/30 ring-4 ring-primary/10' : 'size-16 border-slate-600'}
                   `}>
                    <span className={`material-symbols-outlined ${selectedHeartTeam === 'others' ? 'text-primary text-3xl' : 'text-slate-400'}`}>add</span>
                  </div>
                  <span className={`font-bold text-center transition-all ${selectedHeartTeam === 'others' ? 'text-primary text-sm mt-1' : 'text-slate-400 text-[10px]'}`}>
                    Outro
                    {selectedHeartTeam === 'others' && <span className="block text-[10px] text-slate-400 font-normal">Toque para alterar</span>}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-white/10 w-full my-2"></div>

          {/* Amateur Teams to Join */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-baseline px-2">
              <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Times para Jogar</label>
            </div>
            <p className="text-xs text-slate-500 px-2 -mt-2 mb-2">Selecione os times amadores que você participa.</p>

            <div className="relative mb-3">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">search</span>
              <input
                type="text"
                placeholder="Buscar time pelo nome..."
                className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:border-primary focus:ring-0"
              />
            </div>

            <div className="flex flex-col gap-3">
              {loadingTeams ? (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-3 rounded-xl bg-surface-dark/50 border border-white/5 h-16 animate-pulse" />
                  ))}
                </div>
              ) : customTeams.length > 0 ? (
                customTeams.map((team) => {
                  const isRequested = requestedTeams.includes(team.id);
                  return (
                    <div key={team.id} className="flex items-center p-3 rounded-xl bg-surface-dark border border-white/5 gap-3">
                      <div className="size-12 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold text-lg">
                        {team.logo ? <img src={team.logo} alt={team.name} className="w-full h-full object-contain rounded-lg" /> : team.name.substring(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-bold text-sm truncate">{team.name}</h4>
                        <p className="text-slate-400 text-xs flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">location_on</span>
                          {team.location}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleTeamRequest(team.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${isRequested
                          ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                          : 'bg-primary text-background-dark hover:bg-primary-dark'
                          }`}
                      >
                        {isRequested ? (
                          <>
                            <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
                            Pendente
                          </>
                        ) : (
                          'Solicitar'
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <span className="material-symbols-outlined text-3xl mb-2 opacity-50">group_off</span>
                  <p className="text-sm">Nenhum time disponível no momento.</p>
                </div>
              )}
            </div>
          </div>

        </form>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background-dark via-background-dark to-transparent z-10 w-full max-w-md mx-auto">
        {validationError && (
          <div className="mb-2 w-full flex justify-center animate-bounce">
            <div className="bg-red-500/90 backdrop-blur text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">info</span>
              {validationError}
            </div>
          </div>
        )}
        <button
          onClick={handleContinue}
          disabled={isAnalyzing}
          className={`w-full font-bold text-lg rounded-full py-4 shadow-lg transition-all flex items-center justify-center gap-2 group
            ${isValid && !isAnalyzing
              ? 'bg-primary text-primary-content shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98]'
              : 'bg-surface-dark border border-white/10 text-slate-500 opacity-90 cursor-not-allowed'}
          `}
        >
          {isAnalyzing ? 'Processando...' : 'Finalizar'}
          {!isAnalyzing && <span className={`material-symbols-outlined text-xl transition-transform ${isValid ? 'group-hover:translate-x-1' : ''}`}>check</span>}
        </button>
      </div>

      {/* Confirmation Modal */}
      {showChangeTeamModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-dark border border-white/10 p-6 rounded-2xl shadow-2xl max-w-xs w-full flex flex-col items-center text-center">
            <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-primary text-3xl">cached</span>
            </div>
            <h3 className="text-white text-xl font-bold mb-2">Mudar time?</h3>
            <p className="text-slate-300 text-sm mb-6">Você deseja mudar o time do coração selecionado?</p>

            <div className="flex w-full gap-3">
              <button
                onClick={() => setShowChangeTeamModal(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors"
              >
                Não
              </button>
              <button
                onClick={confirmChangeTeam}
                className="flex-1 py-3 rounded-xl bg-primary text-background-dark font-bold hover:bg-primary-dark transition-colors shadow-[0_0_15px_rgba(19,236,91,0.2)]"
              >
                Sim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-surface-dark border border-primary/20 p-8 rounded-[32px] shadow-2xl max-w-sm w-full flex flex-col items-center text-center">
            <div className="size-20 rounded-full bg-primary flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(19,236,91,0.4)]">
              <span className="material-symbols-outlined text-background-dark text-4xl font-bold">check</span>
            </div>

            <h3 className="text-white text-2xl font-black mb-3 italic uppercase tracking-tight">Cadastro bem sucedido!</h3>

            <p className="text-slate-300 text-base leading-relaxed mb-8">
              Entre em contato com o <span className="text-white font-bold text-primary">presidente</span> ou o <span className="text-white font-bold text-primary">vice-presidente</span> do seu time para fazer parte da família <span className="text-white font-bold">"{teamDetails.name}"</span> para desfrutar a experiência do AmaPlay.
            </p>

            <button
              onClick={() => navigate('/pre-dash')}
              className="w-full py-4 rounded-full bg-primary text-background-dark font-black text-lg hover:bg-primary-dark transition-all shadow-[0_10px_20px_rgba(19,236,91,0.2)] active:scale-95"
            >
              IR PARA O DASHBOARD
            </button>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
            <button
              onClick={stopCamera}
              className="size-10 rounded-full bg-black/40 text-white flex items-center justify-center"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover transform -scale-x-100" // Mirror effect
            />
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex justify-center items-center gap-8">
            <button
              onClick={capturePhoto}
              className="size-20 rounded-full border-4 border-white flex items-center justify-center bg-transparent active:bg-white/20 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
              <div className="size-16 rounded-full bg-white"></div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterProfileScreen;