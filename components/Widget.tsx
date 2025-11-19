import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Upload, Download, RotateCw, ZoomIn, Image as ImageIcon, Check, X, Move, Maximize, AlignCenter } from 'lucide-react';
import getCroppedImg from '../utils/canvasUtils';

// Constants
const CM_TO_PX_RATIO_DISPLAY = 37.8; // Approx for display calculation logic if needed

interface AspectRatio {
  label: string;
  value: number;
  group: 'standard' | 'docs';
  desc?: string;
}

const ASPECT_RATIOS: AspectRatio[] = [
  // Standard Ratios
  { label: '1:1', value: 1 / 1, group: 'standard', desc: 'Квадрат' },
  { label: '9:16', value: 9 / 16, group: 'standard', desc: 'Stories' },
  { label: '16:9', value: 16 / 9, group: 'standard', desc: 'Экран' },
  { label: '3:4', value: 3 / 4, group: 'standard', desc: 'Верт. фото' },
  { label: '4:3', value: 4 / 3, group: 'standard', desc: 'Фото' },
  { label: '2:3', value: 2 / 3, group: 'standard', desc: '10x15' },
  { label: '3:2', value: 3 / 2, group: 'standard', desc: 'Классика' },
  { label: '9:21', value: 9 / 21, group: 'standard', desc: 'Верт. кино' },
  { label: '21:9', value: 21 / 9, group: 'standard', desc: 'Кино' },

  // Documents
  { label: '3x4 см', value: 3 / 4, group: 'docs', desc: 'Документ' },
  { label: '3.5x4.5', value: 3.5 / 4.5, group: 'docs', desc: 'РФ / Загран' },
  { label: '5x5 см', value: 1, group: 'docs', desc: 'Виза' }, // 5x5 is 1:1
  { label: 'A4', value: 210 / 297, group: 'docs', desc: 'Лист' },
];

const Widget: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number>(1); // Default 1:1
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Custom dimensions state
  const [customWidth, setCustomWidth] = useState<string>('');
  const [customHeight, setCustomHeight] = useState<string>('');
  const [unit, setUnit] = useState<'px' | 'cm'>('px');
  
  // If restrictPosition is false, user can shrink image inside crop area (creating margins)
  const [restrictPosition, setRestrictPosition] = useState(true);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
      setZoom(1);
      setRotation(0);
      setCrop({ x: 0, y: 0 });
      // Default to unrestricted mode to allow easier fitting
      setRestrictPosition(false); 
    }
  };

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result as string));
      reader.readAsDataURL(file);
    });
  };

  const handleDownload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      setIsProcessing(true);
      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation,
        { horizontal: false, vertical: false },
        '#ffffff'
      );
      
      if (croppedImage) {
        const link = document.createElement('a');
        link.href = croppedImage;
        link.download = `cropped-image-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomRatio = () => {
    const w = parseFloat(customWidth);
    const h = parseFloat(customHeight);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      setAspect(w / h);
    }
  };

  const handleReset = () => {
    setImageSrc(null);
    setCustomWidth('');
    setCustomHeight('');
    setZoom(1);
    setRotation(0);
    setCrop({ x: 0, y: 0 });
  };

  const handleCenter = () => {
    setCrop({ x: 0, y: 0 });
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
      
      {/* Header */}
      {!imageSrc && (
         <div className="p-8 text-center border-b border-slate-100 bg-slate-50 flex flex-col items-center justify-center min-h-[400px]">
            <div className="bg-blue-100 p-4 rounded-full mb-4">
              <ImageIcon className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Редактор Пропорций</h2>
            <p className="text-slate-500 mb-6 max-w-xs mx-auto text-sm">
              Загрузите изображение, чтобы обрезать его под нужный формат или размер с белыми полями или без.
            </p>
            <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-full transition shadow-md active:scale-95 flex items-center gap-2">
              <Upload size={18} />
              <span>Загрузить фото</span>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
         </div>
      )}

      {imageSrc && (
        <div className="flex flex-col lg:flex-row h-full">
          
          {/* Left: Canvas Area */}
          <div className="relative w-full lg:w-2/3 h-[50vh] lg:h-[600px] bg-slate-900 overflow-hidden group">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              restrictPosition={restrictPosition}
              minZoom={0.1}
              style={{
                containerStyle: { background: '#ffffff' }, // White background to visualize fields
                mediaStyle: {  },
                cropAreaStyle: { border: '2px solid rgba(59, 130, 246, 0.5)', boxShadow: '0 0 0 9999em rgba(255, 255, 255, 0.85)' },
              }}
            />
            
            <div className="absolute top-4 left-4 flex gap-2">
                <button 
                onClick={handleReset}
                className="bg-white/90 hover:bg-white text-slate-700 p-2 rounded-full shadow-sm transition border border-slate-200"
                title="Закрыть"
                >
                <X size={20} />
                </button>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md pointer-events-none opacity-0 group-hover:opacity-100 transition z-10">
                {restrictPosition ? 'Режим: Заполнение' : 'Режим: С полями'}
            </div>
          </div>

          {/* Right: Controls */}
          <div className="w-full lg:w-1/3 p-5 bg-white flex flex-col gap-6 overflow-y-auto lg:h-[600px] border-l border-slate-100">
            
            {/* Sliders */}
            <div className="space-y-5">
              <div>
                  <div className="flex items-center justify-between text-sm font-medium text-slate-700 mb-2">
                    <span className="flex items-center gap-2"><ZoomIn size={16} /> Размер фото</span>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleCenter}
                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded flex items-center gap-1 transition"
                            title="По центру"
                        >
                            <AlignCenter size={12} />
                            Центр
                        </button>
                        <span className="text-slate-400 w-8 text-right">{Math.round(zoom * 100)}%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    value={zoom}
                    min={0.1}
                    max={3}
                    step={0.05}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
                      <span>Мелко</span>
                      <span>Крупно</span>
                  </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm font-medium text-slate-700 mb-2">
                    <span className="flex items-center gap-2"><RotateCw size={16} /> Поворот</span>
                    <span className="text-slate-400">{rotation}°</span>
                </div>
                <input
                    type="range"
                    value={rotation}
                    min={0}
                    max={360}
                    step={1}
                    aria-labelledby="Rotation"
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="w-full"
                />
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Fit Mode */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <label className="text-sm font-medium text-slate-700">Режим заполнения</label>
                    <span className="text-[10px] text-slate-400">Как фото помещается в рамку</span>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setRestrictPosition(true)}
                        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition ${restrictPosition ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        title="Фото всегда заполняет рамку целиком"
                    >
                        <Maximize size={14} />
                        Без полей
                    </button>
                    <button 
                        onClick={() => setRestrictPosition(false)}
                        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition ${!restrictPosition ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        title="Можно уменьшить фото меньше рамки (белые поля)"
                    >
                        <Move size={14} />
                        С полями
                    </button>
                </div>
            </div>

            <hr className="border-slate-100" />

            {/* Predefined Ratios */}
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-3">Популярные форматы</h3>
              <div className="grid grid-cols-3 gap-2">
                {ASPECT_RATIOS.filter(r => r.group === 'standard').map((r) => (
                  <button
                    key={r.label}
                    onClick={() => setAspect(r.value)}
                    className={`px-1 py-2 text-xs rounded-md border transition flex flex-col items-center gap-0.5
                      ${Math.abs(aspect - r.value) < 0.01
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <span className="font-bold">{r.label}</span>
                    <span className="text-[9px] opacity-70 font-normal whitespace-nowrap">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-3">Для документов</h3>
              <div className="grid grid-cols-2 gap-2">
                {ASPECT_RATIOS.filter(r => r.group === 'docs').map((r) => (
                  <button
                    key={r.label}
                    onClick={() => setAspect(r.value)}
                    className={`px-3 py-2 text-xs rounded-md border transition flex flex-col items-center justify-center gap-0.5 h-14
                      ${Math.abs(aspect - r.value) < 0.01
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                     <span className="font-bold">{r.label}</span>
                     <span className="text-[9px] opacity-70 font-normal text-center leading-3">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Ratio */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                 <h3 className="text-sm font-medium text-slate-700">Свой размер</h3>
                 <div className="flex rounded border border-slate-300 bg-white overflow-hidden">
                    <button 
                        onClick={() => setUnit('px')}
                        className={`px-2 py-0.5 text-[10px] font-bold ${unit === 'px' ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}
                    >PX</button>
                    <div className="w-px bg-slate-300"></div>
                    <button 
                        onClick={() => setUnit('cm')}
                        className={`px-2 py-0.5 text-[10px] font-bold ${unit === 'cm' ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}
                    >CM</button>
                 </div>
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                   <label className="text-[10px] text-slate-500 uppercase font-semibold ml-1">Ширина</label>
                   <input 
                    type="number" 
                    placeholder={unit === 'px' ? "1000" : "3.0"} 
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                    className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                   />
                </div>
                <div className="flex-1">
                   <label className="text-[10px] text-slate-500 uppercase font-semibold ml-1">Высота</label>
                   <input 
                    type="number" 
                    placeholder={unit === 'px' ? "1000" : "4.0"} 
                    value={customHeight}
                    onChange={(e) => setCustomHeight(e.target.value)}
                    className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                   />
                </div>
                <button 
                    onClick={handleCustomRatio}
                    className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded mb-[1px] transition"
                >
                    <Check size={18} />
                </button>
              </div>
            </div>

            <div className="mt-auto pt-4">
              <button
                onClick={handleDownload}
                disabled={isProcessing}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-white font-medium shadow-lg transition transform active:scale-[0.98]
                  ${isProcessing ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isProcessing ? (
                   <span>Обработка...</span>
                ) : (
                   <>
                     <Download size={20} />
                     <span>Скачать результат</span>
                   </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Widget;