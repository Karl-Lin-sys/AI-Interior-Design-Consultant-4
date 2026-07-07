import React, { useState } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { CompareSlider } from './components/CompareSlider';
import { ChatInterface, Message } from './components/ChatInterface';
import { Sparkles, ArrowLeft } from 'lucide-react';

const STYLES = [
  'Mid-Century Modern',
  'Scandinavian',
  'Industrial',
  'Bohemian',
  'Minimalist',
  'Coastal',
];

export default function App() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [currentStyle, setCurrentStyle] = useState<string>('Mid-Century Modern');
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      parts: [{ text: "Hello! I'm your AI Interior Design Consultant. I can help you reimagine your space. Try asking me to change the style, swap out furniture, or suggest colors!" }]
    }
  ]);

  const handleUpload = (base64: string) => {
    setOriginalImage(base64);
    // Automatically generate the first design
    generateDesign(base64, currentStyle);
  };

  const generateDesign = async (image: string, style: string, prompt?: string) => {
    setIsGenerating(true);
    setCurrentStyle(style);
    
    try {
      const res = await fetch('/api/generate-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, style, prompt }),
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setGeneratedImage(data.imageUrl);
    } catch (err) {
      console.error('Failed to generate design:', err);
      // Fallback to error state or retry logic
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRedesignRequest = async (style: string, prompt?: string) => {
    if (!originalImage) return;
    setGeneratedImage(null); // Clear to show loading state in slider
    await generateDesign(originalImage, style, prompt);
  };

  const reset = () => {
    setOriginalImage(null);
    setGeneratedImage(null);
    setMessages([{
      role: 'model',
      parts: [{ text: "Hello! I'm your AI Interior Design Consultant. I can help you reimagine your space. Try asking me to change the style, swap out furniture, or suggest colors!" }]
    }]);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100">
      <header className="px-8 py-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">AI Interior Consultant</h1>
            <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">Powered by Gemini</p>
          </div>
        </div>
        {originalImage && (
          <button 
            onClick={reset}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Start Over
          </button>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {!originalImage ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-500">
            <h2 className="text-4xl font-semibold tracking-tight text-center mb-4">
              Reimagine Your Space
            </h2>
            <p className="text-gray-500 text-center mb-12 max-w-lg text-lg">
              Upload a photo of your current room and let our AI consultant redesign it in seconds.
            </p>
            <ImageUploader onUpload={handleUpload} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Left Column: Visualization & Carousel */}
            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold tracking-tight">Visualization</h2>
                  {isGenerating && (
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      Designing...
                    </div>
                  )}
                </div>
                
                <CompareSlider originalImage={originalImage} generatedImage={generatedImage} />
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Style Inspiration</h3>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map((style) => (
                    <button
                      key={style}
                      onClick={() => handleRedesignRequest(style)}
                      disabled={isGenerating || currentStyle === style}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                        ${currentStyle === style 
                          ? 'bg-gray-900 text-white shadow-md' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                        }
                        disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Chat Interface */}
            <div className="lg:col-span-5 h-[600px]">
              <ChatInterface 
                messages={messages} 
                setMessages={setMessages} 
                isGeneratingDesign={isGenerating} 
                onRedesignRequest={handleRedesignRequest} 
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
