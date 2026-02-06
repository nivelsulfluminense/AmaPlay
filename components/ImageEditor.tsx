import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { removeBackground } from '@imgly/background-removal';

interface ImageEditorProps {
    imageSrc: string;
    onSave: (processedImage: string) => void;
    onCancel: () => void;
    aspectRatio?: number; // 1 for square (logo), 0.7 for card (portrait)
    allowBackgroundRemoval?: boolean;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({
    imageSrc,
    onSave,
    onCancel,
    aspectRatio = 1,
    allowBackgroundRemoval = true
}) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentImage, setCurrentImage] = useState(imageSrc);

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string> => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return '';

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        return canvas.toDataURL('image/png');
    };

    const handleSave = async () => {
        if (!croppedAreaPixels) return;
        setIsProcessing(true);
        try {
            const croppedImage = await getCroppedImg(currentImage, croppedAreaPixels);
            onSave(croppedImage);
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRemoveBg = async () => {
        setIsProcessing(true);
        try {
            // Remove BG from original source slightly more reliable before crop, 
            // but typical workflow is Crop -> then Remove BG or Remove BG -> then Crop.
            // Let's do Remove BG on the CURRENT image (which might be raw).
            const blob = await removeBackground(currentImage);
            const url = URL.createObjectURL(blob);
            setCurrentImage(url);
        } catch (e) {
            console.error("BG Removal failed", e);
            alert("Erro ao remover fundo");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col">
            <div className="flex-1 relative w-full h-full bg-black">
                <Cropper
                    image={currentImage}
                    crop={crop}
                    zoom={zoom}
                    aspect={aspectRatio}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                />
            </div>

            <div className="bg-surface-dark p-6 border-t border-white/10 space-y-4">
                <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-slate-400">Zoom</span>
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5"
                    >
                        Cancelar
                    </button>

                    {allowBackgroundRemoval && (
                        <button
                            onClick={handleRemoveBg}
                            disabled={isProcessing}
                            className="flex-1 py-3 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold hover:bg-purple-500/30 flex justify-center items-center gap-2"
                        >
                            {isProcessing ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : <span className="material-symbols-outlined">magic_button</span>}
                            Remover Fundo
                        </button>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={isProcessing}
                        className="flex-1 py-3 rounded-xl bg-primary text-background-dark font-bold hover:bg-primary-dark"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};
