import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const ProSelectionScreen = () => {
   const navigate = useNavigate();
   const { isPro, isInitialized } = useUser();

   // Bloqueio de acesso: Só entra se for PRO
   useEffect(() => {
      if (isInitialized && !isPro) {
         navigate('/scouts');
      }
   }, [isPro, isInitialized, navigate]);

   if (!isInitialized || !isPro) {
      return (
         <div className="flex h-screen items-center justify-center bg-background-dark">
            <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
         </div>
      );
   }

   return (
      <div className="flex flex-col h-full min-h-screen w-full bg-background-dark relative overflow-hidden">
         {/* Dynamic Background */}
         <div className="absolute inset-0 bg-mesh-pattern opacity-40 animate-pulse"></div>
         <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-primary/5 to-transparent"></div>

         {/* Header */}
         <header className="flex items-center p-4 pt-6 pb-2 justify-between sticky top-0 z-20">
            <button
               onClick={() => navigate('/dashboard')}
               className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-dark/50 backdrop-blur-md shadow-sm border border-white/10 hover:bg-white/10 transition-colors"
            >
               <span className="material-symbols-outlined text-white">close</span>
            </button>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-dark/50 backdrop-blur-md border border-white/10">
               <span className="material-symbols-outlined text-primary text-sm">military_tech</span>
               <span className="text-white text-sm font-bold tracking-wide">AMAFUT PRO</span>
            </div>
            <div className="size-10"></div>
         </header>

         <main className="flex-1 flex flex-col items-center justify-center px-6 gap-8 relative z-10 pb-20">
            <div className="text-center space-y-2 mb-4">
               <h1 className="text-4xl font-black text-white italic tracking-tighter drop-shadow-lg">
                  ESCOLHA SEU<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-300">MODO DE JOGO</span>
               </h1>
               <p className="text-slate-400 font-medium">Evolua sua carreira e conquiste o mundo.</p>
            </div>

            {/* Scouts Card */}
            <button
               className="group w-full relative h-40 rounded-3xl overflow-hidden border-2 border-white/10 hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-2xl"
               onClick={() => navigate('/scouts-performance')}
            >
               <div className="absolute inset-0 bg-gradient-to-r from-green-900 via-[#102216] to-[#102216]"></div>
               <div className="absolute inset-0 bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuBNoW6h5lgeCwkVbzVa2p-7s8VlYb75nb2kdjDEyDqTKvEt4WBiA8zOQfAHcMekilka2Rj7olYQew26k2aikJqcsVpgZboqI49SrFiYg8O5TRSmhfBSIfeKm7kHM4pSihcEP1cDE8yio6voOkdAkuUqY41sLghcaqum_TiNLgNDJTRH35Yo4EwHoY81m2rBrhpBCLQCzhtUVodzPljzj56x525jHVl9wxfQeifC6gR6LrChemvm0z6wKqptUFWd05YD7i4lHIEC5Q0')] bg-cover bg-center opacity-30 mix-blend-overlay group-hover:opacity-40 transition-opacity"></div>

               <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-4">
                  <div className="size-16 rounded-2xl bg-gradient-to-br from-primary to-green-700 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
                     <span className="material-symbols-outlined text-background-dark text-4xl">visibility</span>
                  </div>
                  <div className="text-left">
                     <h2 className="text-2xl font-black text-white italic">SCOUTS</h2>
                     <p className="text-green-200 text-xs font-bold uppercase tracking-wider">Seja Descoberto</p>
                  </div>
               </div>

               <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0 duration-300">
                  <span className="material-symbols-outlined text-white text-3xl">arrow_forward_ios</span>
               </div>
            </button>

            {/* VS Divider */}
            <div className="relative py-2">
               <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-10 bg-background-dark rounded-full border-2 border-white/10 flex items-center justify-center z-10">
                  <span className="text-xs font-black text-slate-500">OU</span>
               </div>
               <div className="w-64 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            </div>

            {/* Overall Card */}
            <button
               className="group w-full relative h-40 rounded-3xl overflow-hidden border-2 border-white/10 hover:border-blue-400/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-2xl"
               onClick={() => navigate('/player-stats')} // Placeholder navigation
            >
               <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-[#102216] to-[#102216]"></div>
               <div className="absolute inset-0 bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuAor5X-aVJYC_HaXfa0WHiArEKDV-kbPsTSP8hg8ApqWwc-KGjyn_PO4TsbP6AIitM5A8cGJI2yIeFNfZ2iBeCYvNJdu7-VDCfJsx3jEzE3eMe3elZq-8272XhGKjDo47R0RQx9mrTBF5UouadcOCBTl55XoMx3SkdYaYz1jaJgRYfDnmYtUrOPct6zUBGtaes9C7pSqnjqbzX9uZmt2u5ULIiyKBtr8HuaThuD0oYdmPZGumLp6y4KJuGbWWuKGFXRGPSy6HmLs64')] bg-cover bg-center opacity-30 mix-blend-overlay group-hover:opacity-40 transition-opacity"></div>

               <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-4">
                  <div className="size-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                     <span className="material-symbols-outlined text-white text-4xl">hexagon</span>
                  </div>
                  <div className="text-left">
                     <h2 className="text-2xl font-black text-white italic">OVERALL</h2>
                     <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">Seu Card & Atributos</p>
                  </div>
               </div>

               <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0 duration-300">
                  <span className="material-symbols-outlined text-white text-3xl">arrow_forward_ios</span>
               </div>
            </button>

         </main>
      </div>
   );
};

export default ProSelectionScreen;