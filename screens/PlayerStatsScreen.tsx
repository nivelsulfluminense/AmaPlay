import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { removeBackground } from '@imgly/background-removal';
import * as htmlToImage from 'html-to-image';
import { dataService, Player } from '../services/dataService';

// Available Teams Data
const PRO_TEAMS = [
    { id: 'fla', name: 'Flamengo', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Clube_de_Regatas_do_Flamengo_logo.svg' },
    { id: 'pal', name: 'Palmeiras', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/10/Palmeiras_logo.svg' },
    { id: 'bot', name: 'Botafogo', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Botafogo_de_Futebol_e_Regatas_logo.svg' },
    { id: 'cam', name: 'Atlético-MG', logo: 'https://cdn.worldvectorlogo.com/logos/atletico-mineiro-mg-1.svg' },
    { id: 'gre', name: 'Grêmio', logo: 'https://cdn.worldvectorlogo.com/logos/gremio.svg' },
    { id: 'bah', name: 'Bahia', logo: 'https://logodownload.org/wp-content/uploads/2017/02/bahia-ec-logo-02.png' },
    { id: 'sp', name: 'São Paulo', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Brasao_do_Sao_Paulo_Futebol_Clube.svg' },
    { id: 'flu', name: 'Fluminense', logo: 'https://cdn.worldvectorlogo.com/logos/fluminense-rj.svg' },
    { id: 'int', name: 'Internacional', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Escudo_do_Sport_Club_Internacional.svg' },
    { id: 'cor', name: 'Corinthians', logo: 'https://cdn.worldvectorlogo.com/logos/corinthians-paulista-1.svg' },
    { id: 'vas', name: 'Vasco', logo: 'https://cdn.worldvectorlogo.com/logos/vasco-da-gama-rj.svg' },
    { id: 'san', name: 'Santos', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Santos_Logo.png' },
    { id: 'others', name: 'Outro', logo: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png' }
];

const AMATEUR_TEAMS = [
    { id: 101, name: 'Peladeiros FC', logo: 'https://cdn-icons-png.flaticon.com/512/1802/1802958.png' }, // Generic shield
    { id: 102, name: 'Várzea United', logo: 'https://cdn-icons-png.flaticon.com/512/3069/3069177.png' },
    { id: 103, name: 'Real Matismo', logo: 'https://cdn-icons-png.flaticon.com/512/3354/3354188.png' },
];

const TOP_COUNTRIES = [
    { code: 'br', name: 'Brasil', flag: 'https://flagcdn.com/w160/br.png' },
    { code: 'ar', name: 'Argentina', flag: 'https://flagcdn.com/w160/ar.png' },
    { code: 'pt', name: 'Portugal', flag: 'https://flagcdn.com/w160/pt.png' },
    { code: 'de', name: 'Alemanha', flag: 'https://flagcdn.com/w160/de.png' },
    { code: 'fr', name: 'França', flag: 'https://flagcdn.com/w160/fr.png' },
    { code: 'it', name: 'Itália', flag: 'https://flagcdn.com/w160/it.png' },
    { code: 'es', name: 'Espanha', flag: 'https://flagcdn.com/w160/es.png' },
    { code: 'us', name: 'EUA', flag: 'https://flagcdn.com/w160/us.png' },
];

const OTHER_COUNTRIES = [
    { code: 'ca', name: 'Canadá' },
    { code: 'mx', name: 'México' },
    { code: 'uy', name: 'Uruguai' },
    { code: 'co', name: 'Colômbia' },
    { code: 'cl', name: 'Chile' },
    { code: 'py', name: 'Paraguai' },
    { code: 'pe', name: 'Peru' },
    { code: 'ec', name: 'Equador' },
    { code: 've', name: 'Venezuela' },
    { code: 'bo', name: 'Bolívia' },
    { code: 'gb-eng', name: 'Inglaterra' },
    { code: 'nl', name: 'Holanda' },
    { code: 'be', name: 'Bélgica' },
    { code: 'hr', name: 'Croácia' },
    { code: 'ma', name: 'Marrocos' },
    { code: 'jp', name: 'Japão' },
    { code: 'kr', name: 'Coreia do Sul' },
    { code: 'sn', name: 'Senegal' },
    { code: 'cm', name: 'Camarões' },
    { code: 'gh', name: 'Gana' },
    { code: 'sa', name: 'Arábia Saudita' },
    { code: 'au', name: 'Austrália' },
    { code: 'cr', name: 'Costa Rica' },
    { code: 'pa', name: 'Panamá' },
];

// Initial Data for Teammates
// Initial Data for Teammates - REMOVED
// Data loaded from dataService

type ExportFormat = 'png' | 'jpeg' | 'svg';

const PlayerStatsScreen = () => {
    const navigate = useNavigate();
    const { userId, name, avatar, cardAvatar, setCardAvatar, teamId, stats, ovr, teamDetails, setStats } = useUser();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    // Load Saved Position
    const [positionCode] = useState(() => localStorage.getItem('amaplay_player_position') || 'mid');

    // Map Position Code to Display Text
    const posMap: Record<string, string> = { gk: 'GOL', def: 'ZAG', mid: 'MEI', fwd: 'ATA' };
    const displayPos = posMap[positionCode] || 'MEI';

    // Stats Logic - My Stats
    const [myStats, setMyStats] = useState(stats);

    // My Vote Status
    const [myVoteCount, setMyVoteCount] = useState(1);
    const [hasVotedSelf, setHasVotedSelf] = useState(false);

    // Teammates Logic
    const [teammates, setTeammates] = useState<any[]>([]);

    useEffect(() => {
        const loadTeammates = async () => {
            try {
                const players = await dataService.players.list();
                const teamPlayers = players
                    .filter(p => p.teamId === teamId)
                    .map(p => ({
                        id: p.id,
                        name: p.name,
                        pos: p.position,
                        avatar: p.avatar,
                        voteCount: p.voteCount || 0,
                        hasVoted: p.hasVoted || false,
                        stats: p.stats
                    }));
                setTeammates(teamPlayers);
            } catch (err) {
                console.error("Failed to load teammates", err);
            }
        };
        if (teamId) loadTeammates();
    }, [teamId]);

    // Rating Logic
    const [ratingTargetId, setRatingTargetId] = useState<number | string | null>(null);
    const [tempRating, setTempRating] = useState({
        pace: 50, shooting: 50, passing: 50, dribbling: 50, defending: 50, physical: 50
    });

    // Persistence
    const [country, setCountry] = useState(() => localStorage.getItem('amaplay_player_country') || '');
    const [heartTeamId] = useState(() => localStorage.getItem('amaplay_heart_team') || 'fla');
    const [customTextColor, setCustomTextColor] = useState(() => localStorage.getItem('amaplay_card_text_color') || '');

    const [isEditing, setIsEditing] = useState(() => !localStorage.getItem('amaplay_player_country'));

    // We use cardAvatar from context if it exists, otherwise we might initialize from avatar if user consents
    const [localAvatar, setLocalAvatar] = useState(cardAvatar || null);

    // Image Manipulation State
    const [imgScale, setImgScale] = useState(0.85);
    const [imgPosX, setImgPosX] = useState(0);
    const [imgPosY, setImgPosY] = useState(40);
    // Controls the gradient mask starting point (percentage)
    const [maskStart, setMaskStart] = useState(80);

    // Background Removal State
    const [removeBg, setRemoveBg] = useState(false);
    const [isProcessingBg, setIsProcessingBg] = useState(false);
    const [originalImage, setOriginalImage] = useState<string | null>(null);

    // Card Background State (Processed)
    const [activeCardBg, setActiveCardBg] = useState<string | null>(null);

    // Modals
    const [showRateModal, setShowRateModal] = useState(false);
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const [showPhotoChoiceModal, setShowPhotoChoiceModal] = useState(() => !cardAvatar && !!avatar);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
    const [isExporting, setIsExporting] = useState(false);

    // Calculate Overall Helper
    const calculateOvr = (stats: any) => Math.round(
        (stats.pace + stats.shooting + stats.passing + stats.dribbling + stats.defending + stats.physical) / 6
    );

    const myOverall = ovr;

    const getCardTier = (ovr: number) => {
        if (ovr >= 80) return 'gold';
        if (ovr >= 75) return 'silver';
        return 'bronze';
    };

    const tier = getCardTier(myOverall);

    // Card Theme Configs
    const cardStyles = {
        gold: {
            //bgImage: "https://ca.cardsplug.com/cdn/shop/files/FC25ShinyGold-Blank-min.png",
            bgImage: "https://pdf-service-static.s3.amazonaws.com/static/layout-images/cardstar/thumbnails/rare-gold-25.webp",

            bg: "bg-[#e8c976]",
            gradient: "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#fbeea5] via-[#dbb660] to-[#8d6e2e]",
            border: "border-[#fbeea5]",
            text: "text-[#3e2b12]",
            divider: "bg-[#3e2b12]/30",
        },
        silver: {
            //bgImage: "https://ca.cardsplug.com/cdn/shop/files/FC25ShinySilver-Blank-min.png",
            bgImage: "https://pdf-service-static.s3.amazonaws.com/static/layout-images/cardstar/thumbnails/rare-silver-25.webp",

            bg: "bg-[#c8c8c8]",
            gradient: "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#ffffff] via-[#c0c0c0] to-[#707070]",
            border: "border-[#e0e0e0]",
            text: "text-[#1a1a1a]",
            divider: "bg-[#1a1a1a]/30",
        },
        bronze: {
            // bgImage: "https://ca.cardsplug.com/cdn/shop/files/FC25ShinyBronze-Blank-min.png",
            bgImage: "https://pdf-service-static.s3.amazonaws.com/static/layout-images/cardstar/thumbnails/rare-bronze-25.webp",
            bg: "bg-[#dcb594]",
            gradient: "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#ebdccb] via-[#cfa682] to-[#8a6042]",
            border: "border-[#ebdccb]",
            text: "text-[#3d2411]",
            divider: "bg-[#3d2411]/30",
        }
    }[tier];

    // --- Background Removal Algorithm (Improved Chroma Key) ---
    const processBackgroundRemoval = (imageSrc: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = imageSrc;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject('No context');

                const width = 600;
                const height = (img.height / img.width) * width;
                canvas.width = width;
                canvas.height = height;

                ctx.drawImage(img, 0, 0, width, height);

                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;

                // Sample background from all 4 corners to improve accuracy
                const corners = [
                    0, // Top Left
                    (width - 1) * 4, // Top Right
                    (height - 1) * width * 4, // Bottom Left
                    ((height - 1) * width + width - 1) * 4 // Bottom Right
                ];

                // Calculate average background color
                let rBg = 0, gBg = 0, bBg = 0, count = 0;
                corners.forEach(idx => {
                    // Only count if not already transparent
                    if (data[idx + 3] > 0) {
                        rBg += data[idx];
                        gBg += data[idx + 1];
                        bBg += data[idx + 2];
                        count++;
                    }
                });

                // If corners are transparent (count == 0), the image is likely already a cutout
                if (count === 0) {
                    resolve(canvas.toDataURL());
                    return;
                }

                rBg /= count; gBg /= count; bBg /= count;

                const threshold = 55; // Sensitivity threshold

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    // Euclidean distance from background color
                    const dist = Math.sqrt(
                        Math.pow(r - rBg, 2) +
                        Math.pow(g - gBg, 2) +
                        Math.pow(b - bBg, 2)
                    );

                    if (dist < threshold) {
                        data[i + 3] = 0; // Make 100% transparent
                    } else if (dist < threshold + 15) {
                        // Smooth edges (anti-aliasing)
                        const alpha = (dist - threshold) / 15;
                        data[i + 3] = Math.floor(255 * alpha);
                    }
                }

                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL());
            };
            img.onerror = (e) => reject(e);
        });
    };

    // Process Card Background Effect
    useEffect(() => {
        let isMounted = true;
        if (cardStyles.bgImage) {
            processBackgroundRemoval(cardStyles.bgImage)
                .then(processedUrl => {
                    if (isMounted) setActiveCardBg(processedUrl);
                })
                .catch(err => {
                    console.warn("Card bg processing failed/CORS:", err);
                    if (isMounted) setActiveCardBg(cardStyles.bgImage);
                });
        } else {
            setActiveCardBg(null);
        }
        return () => { isMounted = false; };
    }, [cardStyles.bgImage]);


    const handleRemoveBg = async () => {
        if (removeBg) {
            if (originalImage) {
                setLocalAvatar(originalImage);
            }
            setRemoveBg(false);
        } else {
            if (!localAvatar) return;
            setIsProcessingBg(true);
            if (!originalImage) setOriginalImage(localAvatar);

            try {
                const blob = await removeBackground(localAvatar);
                const url = URL.createObjectURL(blob);
                setLocalAvatar(url);
                setRemoveBg(true);
            } catch (e) {
                console.error("BG removal failed", e);
                alert("Erro ao remover fundo. Tente outra imagem.");
            } finally {
                setIsProcessingBg(false);
            }
        }
    };

    const handleSaveSetup = async () => {
        const missing = [];
        if (!localAvatar) missing.push("uma foto");
        if (!country) missing.push("um país");

        if (missing.length > 0) {
            alert(`Para salvar o card, você precisa selecionar: ${missing.join(' e ')}.`);
            return;
        }

        localStorage.setItem('amaplay_player_country', country);
        localStorage.setItem('amaplay_card_text_color', customTextColor);

        try {
            // Save Country to DB
            if (userId && country) {
                const profile = await dataService.players.getById(userId);
                const currentAddress = profile?.address || {};

                await dataService.players.save({
                    id: userId,
                    address: { ...currentAddress, country },
                    cardAvatar: localAvatar
                });
            }

            // SAVE ONLY TO CARD AVATAR
            if (localAvatar && localAvatar !== cardAvatar) {
                setCardAvatar(localAvatar);
            }

            setIsEditing(false);
        } catch (error) {
            console.error("Error saving setup:", error);
            alert("Erro ao salvar no banco de dados, mas as alterações locais foram aplicadas.");
            setIsEditing(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setOriginalImage(result);
                setLocalAvatar(result);
                setImgScale(0.85); // Reset to slightly smaller
                setImgPosX(0);
                setImgPosY(40);
                setRemoveBg(false);
                setShowPhotoChoiceModal(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUseProfilePhoto = () => {
        setLocalAvatar(avatar);
        setOriginalImage(avatar);
        setShowPhotoChoiceModal(false);
    };

    // --- Export Logic ---
    const handleExport = async (action: 'download' | 'share') => {
        if (!cardRef.current) return;
        setIsExporting(true);

        try {
            // Force high quality
            const options = {
                quality: 1,
                pixelRatio: 2,
                style: { transform: 'none', margin: '0' } // Reset any hover scales during capture
            };

            let dataUrl = '';
            let filename = `amaplay-card-${name.toLowerCase().replace(/\s/g, '-')}`;

            if (exportFormat === 'svg') {
                dataUrl = await htmlToImage.toSvg(cardRef.current, options);
                filename += '.svg';
            } else if (exportFormat === 'jpeg') {
                dataUrl = await htmlToImage.toJpeg(cardRef.current, options);
                filename += '.jpg';
            } else {
                dataUrl = await htmlToImage.toPng(cardRef.current, options);
                filename += '.png';
            }

            if (action === 'download') {
                const link = document.createElement('a');
                link.download = filename;
                link.href = dataUrl;
                link.click();
            } else if (action === 'share') {
                if (navigator.share) {
                    // Must convert DataURL to Blob to File for sharing
                    const res = await fetch(dataUrl);
                    const blob = await res.blob();
                    const file = new File([blob], filename, { type: blob.type });

                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: 'Meu Card AmaPlay',
                            text: `Confira meu card oficial do AmaPlay! OVR: ${myOverall}`
                        });
                    } else {
                        alert("Seu dispositivo não suporta compartilhamento direto deste arquivo.");
                    }
                } else {
                    alert("Compartilhamento não suportado neste navegador. Tente baixar a imagem.");
                }
            }
        } catch (error) {
            console.error("Export error:", error);
            alert("Ocorreu um erro ao exportar o card.");
        } finally {
            setIsExporting(false);
            setShowExportModal(false);
        }
    };


    // --- Rating Logic ---
    const openRatingFor = (id: number | string) => {
        setRatingTargetId(id);
        setTempRating({ pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70 });
    };

    const submitRating = () => {
        if (ratingTargetId === null) return;

        if (ratingTargetId === 'self') {
            // Update Self Stats
            const newCount = myVoteCount + 1;
            const newStats = {
                pace: Math.round(((myStats.pace * myVoteCount) + tempRating.pace) / newCount),
                shooting: Math.round(((myStats.shooting * myVoteCount) + tempRating.shooting) / newCount),
                passing: Math.round(((myStats.passing * myVoteCount) + tempRating.passing) / newCount),
                dribbling: Math.round(((myStats.dribbling * myVoteCount) + tempRating.dribbling) / newCount),
                defending: Math.round(((myStats.defending * myVoteCount) + tempRating.defending) / newCount),
                physical: Math.round(((myStats.physical * myVoteCount) + tempRating.physical) / newCount),
            };
            setMyStats(newStats);
            setMyVoteCount(newCount);
            setHasVotedSelf(true);

            // Persist to database
            setStats(newStats).catch(console.error);

        } else {
            // Update Teammate
            setTeammates(prev => prev.map(tm => {
                if (tm.id === ratingTargetId) {
                    const newCount = tm.voteCount + 1;
                    const newStats = {
                        pace: Math.round(((tm.stats.pace * tm.voteCount) + tempRating.pace) / newCount),
                        shooting: Math.round(((tm.stats.shooting * tm.voteCount) + tempRating.shooting) / newCount),
                        passing: Math.round(((tm.stats.passing * tm.voteCount) + tempRating.passing) / newCount),
                        dribbling: Math.round(((tm.stats.dribbling * tm.voteCount) + tempRating.dribbling) / newCount),
                        defending: Math.round(((tm.stats.defending * tm.voteCount) + tempRating.defending) / newCount),
                        physical: Math.round(((tm.stats.physical * tm.voteCount) + tempRating.physical) / newCount),
                    };

                    // Persist to DB
                    dataService.players.save({
                        id: tm.id,
                        voteCount: newCount,
                        hasVoted: true,
                        stats: newStats
                    }).catch(console.error);

                    return {
                        ...tm,
                        hasVoted: true,
                        voteCount: newCount,
                        stats: newStats
                    };
                }
                return tm;
            }));
        }
        setRatingTargetId(null);
    };

    const getFlagUrl = (code: string) => `https://flagcdn.com/w160/${code}.png`;
    const selectedFlag = getFlagUrl(country || 'un');
    const heartTeamLogo = PRO_TEAMS.find(t => t.id === heartTeamId)?.logo || PRO_TEAMS[0].logo;
    const currentTeamLogo = teamDetails.logo || AMATEUR_TEAMS[0].logo;

    const ratingTarget = ratingTargetId === 'self'
        ? { name: 'Você', avatar: localAvatar || 'https://i.pravatar.cc/150?u=me' }
        : teammates.find(t => t.id === ratingTargetId);

    const isFormValid = !!localAvatar && !!country;

    return (
        <div className="bg-background-dark min-h-screen pb-24 flex flex-col items-center relative overflow-x-hidden">

            {/* Header */}
            <header className="flex items-center p-4 pt-6 pb-2 justify-between sticky top-0 z-40 w-full max-w-md bg-background-dark/80 backdrop-blur-sm">
                <button onClick={() => navigate(-1)} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-dark shadow-sm border border-white/10 hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-white">arrow_back</span>
                </button>
                <h2 className="text-white text-lg font-bold leading-tight flex-1 text-center pr-10">
                    {isEditing ? 'Editor de Card' : 'Seu Overall'}
                </h2>
            </header>

            {/* Main Content */}
            <main className="flex flex-col items-center w-full max-w-md px-4 pt-2 z-10">

                {/* Hidden File Input - Must be outside conditional rendering */}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

                {/* --- EA FC CARD DESIGN (Reference Layout) --- */}
                <div ref={cardRef} className={`relative w-[400px] h-[640px] transition-transform duration-500 hover:scale-[1.01] mb-6`}>

                    {/* Card Background Shape & Image */}
                    <div
                        className={`absolute inset-0 z-0 ${!activeCardBg ? cardStyles.gradient : ''} shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[2rem]`}
                        style={{
                            backgroundImage: activeCardBg ? `url('${activeCardBg}')` : undefined,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    >
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay rounded-[2rem]"></div>
                    </div>

                    {/* PLAYER IMAGE LAYER (Z-10) - Positioned Middle/Right */}
                    <div className="absolute inset-0 z-10 overflow-hidden rounded-[2rem]">
                        <div className="w-full h-full relative">
                            {isProcessingBg && (
                                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center">
                                    <div className="w-full h-1 bg-primary/50 shadow-[0_0_15px_#13ec5b] animate-[scan_1.5s_ease-in-out_infinite] absolute top-0"></div>
                                    <span className="text-xs font-bold text-primary bg-black/50 px-2 py-1 rounded backdrop-blur-sm mt-32">IA Processando...</span>
                                </div>
                            )}

                            {localAvatar ? (
                                <img
                                    src={localAvatar}
                                    alt="Player"
                                    className={`absolute object-cover transition-all duration-300 ${removeBg ? 'contrast-110 brightness-110 saturate-110' : ''}`}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        transform: `scale(${imgScale}) translate(${imgPosX}px, ${imgPosY}px)`,
                                        transformOrigin: 'top center',
                                        maskImage: `linear-gradient(to bottom, black ${maskStart}%, transparent 100%)`,
                                        WebkitMaskImage: `linear-gradient(to bottom, black ${maskStart}%, transparent 100%)`
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center pt-10">
                                    <span className={`material-symbols-outlined text-[150px] opacity-10 ${cardStyles.text}`} style={{ color: customTextColor || undefined }}>person</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CONTENT LAYER (Z-20) */}
                    <div className="absolute inset-0 z-20 flex flex-col pointer-events-none rounded-[2rem]">

                        {/* TOP LEFT: OVR & POS */}
                        <div className="absolute top-[80px] left-[50px] flex flex-col items-center w-[60px] text-center z-30">
                            <span
                                className={`text-[70px] font-black tracking-tighter leading-[0.8] ${!customTextColor ? cardStyles.text : ''} font-display drop-shadow-md`}
                                style={{ color: customTextColor || undefined }}
                            >
                                {myOverall}
                            </span>
                            <span
                                className={`text-[26px] font-bold uppercase ${!customTextColor ? cardStyles.text : ''} drop-shadow-md`}
                                style={{ color: customTextColor || undefined }}
                            >
                                {displayPos}
                            </span>
                        </div>

                        {/* BOTTOM SECTION: Name, Horizontal Stats, 3 Flags */}
                        <div className="mt-auto w-full pb-8 px-6 flex flex-col items-center z-30">

                            {/* Name */}
                            <div className="text-center mb-2 w-full">
                                <h2
                                    className={`text-[36px] font-black uppercase tracking-tight ${!customTextColor ? cardStyles.text : ''} font-display truncate drop-shadow-md leading-none`}
                                    style={{ color: customTextColor || undefined }}
                                >
                                    {name.toUpperCase()}
                                </h2>
                            </div>

                            <div
                                className={`h-[2px] w-[90%] ${!customTextColor ? cardStyles.divider : ''} mb-4 opacity-60`}
                                style={{ backgroundColor: customTextColor || undefined }}
                            ></div>

                            {/* Horizontal Stats Row */}
                            <div
                                className={`flex justify-between w-full px-2 mb-5 ${!customTextColor ? cardStyles.text : ''} font-display`}
                                style={{ color: customTextColor || undefined }}
                            >
                                <div className="flex flex-col items-center">
                                    <span className="font-bold text-xs opacity-80 uppercase tracking-tight">RIT</span>
                                    <span className="font-black text-2xl leading-none">{myStats.pace}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="font-bold text-xs opacity-80 uppercase tracking-tight">FIN</span>
                                    <span className="font-black text-2xl leading-none">{myStats.shooting}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="font-bold text-xs opacity-80 uppercase tracking-tight">PAS</span>
                                    <span className="font-black text-2xl leading-none">{myStats.passing}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="font-bold text-xs opacity-80 uppercase tracking-tight">DRI</span>
                                    <span className="font-black text-2xl leading-none">{myStats.dribbling}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="font-bold text-xs opacity-80 uppercase tracking-tight">DEF</span>
                                    <span className="font-black text-2xl leading-none">{myStats.defending}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="font-bold text-xs opacity-80 uppercase tracking-tight">FIS</span>
                                    <span className="font-black text-2xl leading-none">{myStats.physical}</span>
                                </div>
                            </div>

                            {/* Bottom Row: 3 "Flags" (Country, Heart Team, Current Team) */}
                            <div className="flex items-center justify-center gap-6 mt-1">
                                <img src={selectedFlag} alt="País" className="w-[36px] h-[24px] object-cover rounded-[2px] shadow-sm border border-black/10" />

                                <div
                                    className={`w-[1px] h-8 ${!customTextColor ? cardStyles.divider : ''} opacity-60`}
                                    style={{ backgroundColor: customTextColor || undefined }}
                                ></div>

                                <img src={heartTeamLogo} alt="Time" className="w-[36px] h-[36px] object-contain drop-shadow-md" />

                                <div
                                    className={`w-[1px] h-8 ${!customTextColor ? cardStyles.divider : ''} opacity-60`}
                                    style={{ backgroundColor: customTextColor || undefined }}
                                ></div>

                                <img src={currentTeamLogo} alt="Time Atual" className="w-[36px] h-[36px] object-contain drop-shadow-md" />
                            </div>

                            <div
                                className={`w-1/4 h-1 ${!customTextColor ? cardStyles.divider : ''} mx-auto mt-6 opacity-30`}
                                style={{ backgroundColor: customTextColor || undefined }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* --- EDITING CONTROLS --- */}
                {isEditing && (
                    <div className="w-full bg-surface-dark border border-white/10 rounded-2xl p-4 animate-in slide-in-from-bottom-10 fade-in duration-300 mb-8">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">tune</span>
                            Ajustar Imagem
                        </h3>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 text-xs font-bold flex flex-col items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-xl">add_a_photo</span>
                                Trocar Foto
                            </button>
                            <button
                                onClick={handleRemoveBg}
                                disabled={isProcessingBg}
                                className={`py-3 border rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-colors ${removeBg ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-slate-300'}`}
                            >
                                {isProcessingBg ? (
                                    <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
                                ) : (
                                    <span className="material-symbols-outlined text-xl">magic_button</span>
                                )}
                                Recortar Fundo (IA)
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-400 font-bold uppercase">
                                    <span>Zoom</span>
                                    <span>{(imgScale * 100).toFixed(0)}%</span>
                                </div>
                                <input
                                    type="range" min="0.5" max="3" step="0.1"
                                    value={imgScale}
                                    onChange={(e) => setImgScale(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-black/20 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-400 font-bold uppercase">
                                    <span>Posição Vertical</span>
                                </div>
                                <input
                                    type="range" min="-100" max="200" step="1"
                                    value={imgPosY}
                                    onChange={(e) => setImgPosY(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-black/20 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-400 font-bold uppercase">
                                    <span>Posição Horizontal</span>
                                </div>
                                <input
                                    type="range" min="-100" max="100" step="1"
                                    value={imgPosX}
                                    onChange={(e) => setImgPosX(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-black/20 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>

                            <div className="space-y-1 border-t border-white/5 pt-4">
                                <div className="flex justify-between text-xs text-slate-400 font-bold uppercase">
                                    <span>Corte Inferior (Fade)</span>
                                    <span>{maskStart}%</span>
                                </div>
                                <input
                                    type="range" min="50" max="100" step="1"
                                    value={maskStart}
                                    onChange={(e) => setMaskStart(parseInt(e.target.value))}
                                    className="w-full h-2 bg-black/20 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <p className="text-[10px] text-slate-500 pt-1">Ajuste para evitar que a foto cubra o texto.</p>
                            </div>
                        </div>

                        {/* Text Color Picker */}
                        <div className="mb-6 border-t border-white/5 pt-4">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cor do Texto</label>
                                {customTextColor && (
                                    <button
                                        onClick={() => setCustomTextColor('')}
                                        className="text-[10px] text-primary hover:underline"
                                    >
                                        Restaurar Padrão
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                                {[
                                    { color: '#ffffff', name: 'Branco' },
                                    { color: '#000000', name: 'Preto' },
                                    { color: '#3e2b12', name: 'Ouro' },
                                    { color: '#13ec5b', name: 'Neon' },
                                    { color: '#1a1a1a', name: 'Prata' },
                                    { color: '#3b82f6', name: 'Azul' },
                                ].map((c) => (
                                    <button
                                        key={c.color}
                                        onClick={() => setCustomTextColor(c.color)}
                                        className={`size-8 rounded-full border-2 shrink-0 transition-transform hover:scale-110 ${customTextColor === c.color ? 'border-white ring-2 ring-primary/50' : 'border-white/10'}`}
                                        style={{ backgroundColor: c.color }}
                                        title={c.name}
                                    />
                                ))}
                                <label className="size-8 rounded-full border-2 border-white/10 shrink-0 bg-[conic-gradient(at_center,_red,_yellow,_lime,_cyan,_blue,_magenta,_red)] relative cursor-pointer hover:scale-110 transition-transform">
                                    <input
                                        type="color"
                                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                        value={customTextColor || '#000000'}
                                        onChange={(e) => setCustomTextColor(e.target.value)}
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="mb-6 border-t border-white/10 pt-4">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Nacionalidade</label>
                            <div className="relative">
                                <button
                                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                                    className="w-full py-2 bg-background-dark border border-white/10 rounded-xl text-slate-300 text-sm font-medium hover:border-primary/50 transition-colors flex items-center justify-between px-4"
                                >
                                    <div className="flex items-center gap-2">
                                        {country && <img src={getFlagUrl(country)} alt="" className="w-5 h-3 rounded-sm" />}
                                        <span>{OTHER_COUNTRIES.find(c => c.code === country)?.name || TOP_COUNTRIES.find(c => c.code === country)?.name || 'Selecione o País'}</span>
                                    </div>
                                    <span className="material-symbols-outlined">expand_more</span>
                                </button>

                                {showCountryDropdown && (
                                    <div className="absolute top-full left-0 w-full mt-2 bg-[#1a1f1c] border border-white/10 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto no-scrollbar">
                                        <p className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Populares</p>
                                        {TOP_COUNTRIES.map((c) => (
                                            <button
                                                key={c.code}
                                                onClick={() => { setCountry(c.code); setShowCountryDropdown(false); }}
                                                className="w-full text-left px-4 py-3 text-slate-300 hover:bg-white/5 hover:text-primary text-sm flex items-center gap-3 border-b border-white/5 last:border-0"
                                            >
                                                <img src={getFlagUrl(c.code)} alt={c.name} className="w-6 h-4 object-cover rounded" />
                                                {c.name}
                                            </button>
                                        ))}
                                        <p className="px-4 py-2 text-xs font-bold text-slate-500 uppercase mt-2">Todos</p>
                                        {OTHER_COUNTRIES.map((c) => (
                                            <button
                                                key={c.code}
                                                onClick={() => { setCountry(c.code); setShowCountryDropdown(false); }}
                                                className="w-full text-left px-4 py-3 text-slate-300 hover:bg-white/5 hover:text-primary text-sm flex items-center gap-3 border-b border-white/5 last:border-0"
                                            >
                                                <img src={getFlagUrl(c.code)} alt={c.name} className="w-6 h-4 object-cover rounded" />
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleSaveSetup}
                            className={`w-full font-bold py-4 rounded-xl shadow-lg transition-colors ${!isFormValid
                                ? 'bg-surface-dark border border-white/10 text-slate-500' // Visual "disabled" style
                                : 'bg-primary text-background-dark hover:bg-primary-dark shadow-primary/20'
                                }`}
                        >
                            Salvar Card
                        </button>
                    </div>
                )}

                {/* Action Buttons (Read Mode) */}
                {!isEditing && (
                    <div className="w-full flex flex-col gap-3 mt-2 mb-8">
                        <div className="bg-surface-dark/80 backdrop-blur border border-white/10 p-4 rounded-2xl text-center">
                            <p className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">Baseado em avaliações do time</p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-primary text-sm">group</span>
                                <span className="text-white text-sm font-medium">Média de 12 avaliações</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowExportModal(true)}
                            className="w-full bg-primary hover:bg-primary-dark text-background-dark font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-2xl">share</span>
                            Compartilhar / Baixar Card
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setShowRateModal(true)}
                                className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                <span className="material-symbols-outlined text-lg">stars</span>
                                Avaliar Jogador
                            </button>

                            <button
                                onClick={() => setIsEditing(true)}
                                className="bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                <span className="material-symbols-outlined text-lg">edit</span>
                                Editar Card
                            </button>
                        </div>
                    </div>
                )}

            </main>

            {/* PHOTO CHOICE MODAL */}
            {showPhotoChoiceModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-surface-dark border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
                        <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 ring-2 ring-primary/20">
                            <span className="material-symbols-outlined text-primary text-4xl">add_a_photo</span>
                        </div>
                        <h3 className="text-white font-bold text-xl mb-2">Foto do Card</h3>
                        <p className="text-slate-300 text-sm mb-6">
                            Deseja usar sua foto de perfil atual para este card ou prefere escolher uma nova?
                        </p>

                        <div className="flex flex-col w-full gap-3">
                            <button
                                onClick={handleUseProfilePhoto}
                                className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <img src={avatar || ''} className="size-5 rounded-full object-cover" alt="" />
                                Usar Foto de Perfil
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-3.5 bg-primary hover:bg-primary-dark text-background-dark font-bold rounded-xl transition-colors shadow-lg shadow-primary/20"
                            >
                                Escolher Nova Foto
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EXPORT MODAL */}
            {showExportModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-surface-dark border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-white font-bold text-xl">Compartilhar Card</h3>
                            <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <p className="text-slate-300 text-sm mb-4">Escolha o formato da imagem:</p>

                        <div className="flex gap-3 mb-6">
                            {['png', 'jpeg', 'svg'].map((format) => (
                                <button
                                    key={format}
                                    onClick={() => setExportFormat(format as ExportFormat)}
                                    className={`flex-1 py-3 rounded-xl font-bold uppercase text-sm border-2 transition-all ${exportFormat === format
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                                        }`}
                                >
                                    {format === 'jpeg' ? 'JPG' : format}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => handleExport('share')}
                                disabled={isExporting || exportFormat === 'svg'} // SVG sharing often not supported
                                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${exportFormat === 'svg'
                                    ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                                    : 'bg-primary hover:bg-primary-dark text-background-dark shadow-lg shadow-primary/20'
                                    }`}
                            >
                                {isExporting ? (
                                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">share</span>
                                        Compartilhar {exportFormat === 'svg' ? '(Indisponível para SVG)' : 'Agora'}
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => handleExport('download')}
                                disabled={isExporting}
                                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {isExporting ? (
                                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">download</span>
                                        Baixar Arquivo
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rate Teammates Modal */}
            {showRateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-surface-dark border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-background-dark">
                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">stars</span>
                                {ratingTargetId ? 'Avaliar Jogador' : 'Avaliar Jogador'}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowRateModal(false);
                                    setRatingTargetId(null);
                                }}
                                className="text-slate-400 hover:text-white"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="overflow-y-auto p-5 flex-1 no-scrollbar">
                            {!ratingTargetId ? (
                                // LIST VIEW
                                <>
                                    <p className="text-slate-400 text-sm mb-4">Escolha um jogador para compor o Overall:</p>
                                    <div className="flex flex-col gap-3">
                                        {/* Self Rating Item */}
                                        <div key="self" className="flex items-center gap-4 bg-background-dark p-3 rounded-2xl border border-white/5 hover:border-primary/30 transition-colors">
                                            <img src={localAvatar || 'https://i.pravatar.cc/150?u=me'} alt="Você" className="size-12 rounded-full border-2 border-primary/20 object-cover" />
                                            <div className="flex-1">
                                                <h4 className="text-white font-bold">{name} (Você)</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] bg-white/10 text-slate-300 px-1.5 py-0.5 rounded uppercase font-bold">{displayPos}</span>
                                                    <span className="text-xs text-primary font-bold">OVR {myOverall}</span>
                                                </div>
                                            </div>
                                            {hasVotedSelf ? (
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                                                    <button
                                                        onClick={() => openRatingFor('self')}
                                                        className="text-xs font-bold text-slate-400 hover:text-white underline"
                                                    >
                                                        Editar
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => openRatingFor('self')}
                                                    className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-bold hover:bg-primary hover:text-background-dark transition-colors"
                                                >
                                                    Avaliar
                                                </button>
                                            )}
                                        </div>

                                        {teammates.map((tm) => (
                                            <div key={tm.id} className="flex items-center gap-4 bg-background-dark p-3 rounded-2xl border border-white/5 hover:border-primary/30 transition-colors">
                                                <img src={tm.avatar} alt={tm.name} className="size-12 rounded-full border-2 border-primary/20" />
                                                <div className="flex-1">
                                                    <h4 className="text-white font-bold">{tm.name}</h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] bg-white/10 text-slate-300 px-1.5 py-0.5 rounded uppercase font-bold">{tm.pos}</span>
                                                        <span className="text-xs text-primary font-bold">OVR {calculateOvr(tm.stats)}</span>
                                                        <span className="text-[10px] text-slate-500">({tm.voteCount} votos)</span>
                                                    </div>
                                                </div>

                                                {tm.hasVoted ? (
                                                    <div className="flex items-center gap-3">
                                                        <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                                                        <button
                                                            onClick={() => openRatingFor(tm.id)}
                                                            className="text-xs font-bold text-slate-400 hover:text-white underline"
                                                        >
                                                            Editar
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => openRatingFor(tm.id)}
                                                        className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-bold hover:bg-primary hover:text-background-dark transition-colors"
                                                    >
                                                        Avaliar
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                // RATING FORM VIEW
                                <div className="flex flex-col gap-6">
                                    <div className="flex items-center gap-4 mb-2">
                                        <img src={ratingTarget?.avatar} alt="" className="size-16 rounded-full border-2 border-white/10 object-cover" />
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{ratingTarget?.name}</h3>
                                            <p className="text-slate-400 text-sm">Insira suas notas (0-99)</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                        {Object.keys(tempRating).map((attr) => (
                                            <div key={attr} className="flex flex-col gap-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs font-bold text-slate-300 uppercase">
                                                        {attr === 'pace' ? 'RIT' :
                                                            attr === 'shooting' ? 'FIN' :
                                                                attr === 'passing' ? 'PAS' :
                                                                    attr === 'dribbling' ? 'DRI' :
                                                                        attr === 'defending' ? 'DEF' : 'FIS'}
                                                    </label>
                                                    <span className="text-primary font-bold text-sm">{(tempRating as any)[attr]}</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="99"
                                                    value={(tempRating as any)[attr]}
                                                    onChange={(e) => setTempRating({ ...tempRating, [attr]: parseInt(e.target.value) })}
                                                    className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-3 mt-4">
                                        <button
                                            onClick={() => setRatingTargetId(null)}
                                            className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5"
                                        >
                                            Voltar
                                        </button>
                                        <button
                                            onClick={submitRating}
                                            className="flex-1 py-3 rounded-xl bg-primary text-background-dark font-bold hover:bg-primary-dark shadow-lg shadow-primary/20"
                                        >
                                            Confirmar
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

export default PlayerStatsScreen;