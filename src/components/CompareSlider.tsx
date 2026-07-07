import React, { useState, useRef, useEffect } from 'react';
import { GripVertical } from 'lucide-react';

interface CompareSliderProps {
  originalImage: string;
  generatedImage: string | null;
}

export function CompareSlider({ originalImage, generatedImage }: CompareSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPosition(percent);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) handleMove(e.touches[0].clientX);
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[500px] md:h-[600px] bg-gray-100 rounded-2xl overflow-hidden select-none cursor-ew-resize touch-none"
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onMouseDown={(e) => {
        setIsDragging(true);
        handleMove(e.clientX);
      }}
      onTouchStart={(e) => {
        setIsDragging(true);
        handleMove(e.touches[0].clientX);
      }}
    >
      {/* Original Image (Background) */}
      <img
        src={originalImage}
        alt="Original space"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* Generated Image (Foreground) */}
      {generatedImage && (
        <div
          className="absolute inset-0 w-full h-full overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img
            src={generatedImage}
            alt="Generated design"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        </div>
      )}

      {/* Slider Handle */}
      {generatedImage && (
        <div
          className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10 flex items-center justify-center"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div className="w-8 h-8 bg-white text-gray-800 rounded-full shadow-lg flex items-center justify-center pointer-events-none">
            <GripVertical className="w-5 h-5" />
          </div>
        </div>
      )}
      
      {!generatedImage && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-20">
          <div className="bg-white px-6 py-3 rounded-full shadow-lg font-medium animate-pulse">
            Generating Design...
          </div>
        </div>
      )}

      {/* Labels */}
      <div className="absolute bottom-4 left-4 bg-black/50 text-white text-sm px-3 py-1 rounded-full backdrop-blur-md z-0">
        Original
      </div>
      {generatedImage && (
        <div className="absolute bottom-4 right-4 bg-black/50 text-white text-sm px-3 py-1 rounded-full backdrop-blur-md z-20">
          Reimagined
        </div>
      )}
    </div>
  );
}
