import React from 'react';

interface PlayerStats {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
}

interface PlayerCardProps {
    name: string;
    ovr: number;
    position: string;
    avatar?: string | null;
    stats: PlayerStats;
    countryFlag?: string;
    teamLogo?: string;
    heartTeamLogo?: string;
    customTextColor?: string | null;
    scale?: number;
    className?: string; // Additional classes
    onClick?: () => void;
}

const getCardTier = (ovr: number) => {
    if (ovr >= 80) return 'gold';
    if (ovr >= 75) return 'silver';
    return 'bronze';
};

const cardStyles = {
    gold: {
        bgImage: "https://pdf-service-static.s3.amazonaws.com/static/layout-images/cardstar/thumbnails/rare-gold-25.webp",
        bg: "bg-[#e8c976]",
        gradient: "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#fbeea5] via-[#dbb660] to-[#8d6e2e]",
        border: "border-[#fbeea5]",
        text: "text-[#3e2b12]",
        divider: "bg-[#3e2b12]/30",
    },
    silver: {
        bgImage: "https://pdf-service-static.s3.amazonaws.com/static/layout-images/cardstar/thumbnails/rare-silver-25.webp",
        bg: "bg-[#c8c8c8]",
        gradient: "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#ffffff] via-[#c0c0c0] to-[#707070]",
        border: "border-[#e0e0e0]",
        text: "text-[#1a1a1a]",
        divider: "bg-[#1a1a1a]/30",
    },
    bronze: {
        bgImage: "https://pdf-service-static.s3.amazonaws.com/static/layout-images/cardstar/thumbnails/rare-bronze-25.webp",
        bg: "bg-[#dcb594]",
        gradient: "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#ebdccb] via-[#cfa682] to-[#8a6042]",
        border: "border-[#ebdccb]",
        text: "text-[#3d2411]",
        divider: "bg-[#3d2411]/30",
    }
};

const PlayerCard: React.FC<PlayerCardProps> = ({
    name,
    ovr,
    position,
    avatar,
    stats,
    countryFlag,
    teamLogo,
    heartTeamLogo,
    customTextColor,
    scale = 1,
    className = "",
    onClick
}) => {
    const tier = getCardTier(ovr);
    const style = cardStyles[tier as keyof typeof cardStyles];
    const activeCardBg = style.bgImage;

    return (
        <div
            onClick={onClick}
            className={`relative w-[400px] h-[640px] transition-transform duration-500 hover:scale-[1.01] ${className} ${onClick ? 'cursor-pointer' : ''}`}
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
            {/* Card Background Shape & Image */}
            <div
                className={`absolute inset-0 z-0 ${!activeCardBg ? style.gradient : ''} shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[2rem]`}
                style={{
                    backgroundImage: activeCardBg ? `url('${activeCardBg}')` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay rounded-[2rem]"></div>
            </div>

            {/* PLAYER IMAGE LAYER (Z-10) */}
            <div className="absolute inset-0 z-10 overflow-hidden rounded-[2rem]">
                <div className="w-full h-full relative">
                    {avatar ? (
                        <img
                            src={avatar}
                            alt="Player"
                            className="absolute object-cover w-full h-full"
                            style={{
                                maskImage: `linear-gradient(to bottom, black 85%, transparent 100%)`,
                                WebkitMaskImage: `linear-gradient(to bottom, black 85%, transparent 100%)`
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center pt-10">
                            <span className={`material-symbols-outlined text-[150px] opacity-10 ${style.text}`} style={{ color: customTextColor || undefined }}>person</span>
                        </div>
                    )}
                </div>
            </div>

            {/* CONTENT LAYER (Z-20) */}
            <div className="absolute inset-0 z-20 flex flex-col pointer-events-none rounded-[2rem]">

                {/* TOP LEFT: OVR & POS */}
                <div className="absolute top-[80px] left-[50px] flex flex-col items-center w-[60px] text-center z-30">
                    <span
                        className={`text-[70px] font-black tracking-tighter leading-[0.8] ${!customTextColor ? style.text : ''} font-display drop-shadow-md`}
                        style={{ color: customTextColor || undefined }}
                    >
                        {ovr}
                    </span>
                    <span
                        className={`text-[26px] font-bold uppercase ${!customTextColor ? style.text : ''} drop-shadow-md`}
                        style={{ color: customTextColor || undefined }}
                    >
                        {position}
                    </span>
                </div>

                {/* BOTTOM SECTION: Name, Horizontal Stats, 3 Flags */}
                <div className="mt-auto w-full pb-8 px-6 flex flex-col items-center z-30">

                    {/* Name */}
                    <div className="text-center mb-2 w-full">
                        <h2
                            className={`text-[36px] font-black uppercase tracking-tight ${!customTextColor ? style.text : ''} font-display truncate drop-shadow-md leading-none`}
                            style={{ color: customTextColor || undefined }}
                        >
                            {name.toUpperCase()}
                        </h2>
                    </div>

                    <div
                        className={`h-[2px] w-[90%] ${!customTextColor ? style.divider : ''} mb-4 opacity-60`}
                        style={{ backgroundColor: customTextColor || undefined }}
                    ></div>

                    {/* Horizontal Stats Row */}
                    <div
                        className={`flex justify-between w-full px-2 mb-5 ${!customTextColor ? style.text : ''} font-display`}
                        style={{ color: customTextColor || undefined }}
                    >
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-xs opacity-80 uppercase tracking-tight">RIT</span>
                            <span className="font-black text-2xl leading-none">{stats.pace}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-xs opacity-80 uppercase tracking-tight">FIN</span>
                            <span className="font-black text-2xl leading-none">{stats.shooting}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-xs opacity-80 uppercase tracking-tight">PAS</span>
                            <span className="font-black text-2xl leading-none">{stats.passing}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-xs opacity-80 uppercase tracking-tight">DRI</span>
                            <span className="font-black text-2xl leading-none">{stats.dribbling}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-xs opacity-80 uppercase tracking-tight">DEF</span>
                            <span className="font-black text-2xl leading-none">{stats.defending}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-xs opacity-80 uppercase tracking-tight">FIS</span>
                            <span className="font-black text-2xl leading-none">{stats.physical}</span>
                        </div>
                    </div>

                    {/* Bottom Row: 3 "Flags" (Country, Heart Team, Current Team) */}
                    <div className="flex items-center justify-center gap-6 mt-1">
                        {countryFlag && (
                            <img src={countryFlag} alt="País" className="w-[36px] h-[24px] object-cover rounded-[2px] shadow-sm border border-black/10" />
                        )}

                        <div
                            className={`w-[1px] h-8 ${!customTextColor ? style.divider : ''} opacity-60`}
                            style={{ backgroundColor: customTextColor || undefined }}
                        ></div>

                        {heartTeamLogo && (
                            <img src={heartTeamLogo} alt="Time" className="w-[36px] h-[36px] object-contain drop-shadow-md" />
                        )}

                        <div
                            className={`w-[1px] h-8 ${!customTextColor ? style.divider : ''} opacity-60`}
                            style={{ backgroundColor: customTextColor || undefined }}
                        ></div>

                        {teamLogo && (
                            <img src={teamLogo} alt="Time Atual" className="w-[36px] h-[36px] object-contain drop-shadow-md" />
                        )}
                    </div>

                    <div
                        className={`w-1/4 h-1 ${!customTextColor ? style.divider : ''} mx-auto mt-6 opacity-30`}
                        style={{ backgroundColor: customTextColor || undefined }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

export default PlayerCard;
