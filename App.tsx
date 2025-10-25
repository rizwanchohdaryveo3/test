
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { AspectRatio, GenerationState } from './types';
import { generateVideoFromImage } from './services/geminiService';
import { UploadIcon, VideoIcon, AspectRatioLandscapeIcon, AspectRatioPortraitIcon } from './components/icons';
import Spinner from './components/Spinner';


const ApiKeySelector: React.FC<{ onKeySelected: () => void }> = ({ onKeySelected }) => {
  const handleSelectKey = async () => {
    try {
      await window.aistudio.openSelectKey();
      onKeySelected();
    } catch (e) {
      console.error("Failed to open API key selector", e);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-800 rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-white">Welcome to Veo Video Generator</h2>
      <p className="text-gray-300 mb-6 max-w-md">
        To generate videos, you need to select an API key. This app uses the Veo API, which requires billing to be enabled on your project.
      </p>
      <button
        onClick={handleSelectKey}
        className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 transition-colors duration-200"
      >
        Select API Key
      </button>
      <p className="text-sm text-gray-400 mt-4">
        Learn more about <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-400">Veo billing</a>.
      </p>
    </div>
  );
};


export default function App() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [script, setScript] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [generationState, setGenerationState] = useState<GenerationState>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [apiKeySelected, setApiKeySelected] = useState<boolean | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkApiKey = useCallback(async () => {
    try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setApiKeySelected(hasKey);
        if(!hasKey) {
            setGenerationState('selecting_key');
        } else {
            setGenerationState('idle');
        }
    } catch(e) {
        console.error("aistudio.hasSelectedApiKey not available.", e);
        setApiKeySelected(false);
        setGenerationState('selecting_key');
    }
  }, []);

  useEffect(() => {
    checkApiKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!imageFile || !script || !apiKeySelected) return;

    setGenerationState('loading');
    setError(null);
    setVideoUrl(null);

    try {
      const url = await generateVideoFromImage(
        script,
        imageFile,
        aspectRatio,
        setLoadingMessage
      );
      setVideoUrl(url);
      setGenerationState('success');
    } catch (e: any) {
        if(e.message === "API_KEY_ERROR") {
            setError("Your API Key is invalid or missing permissions. Please select a valid key.");
            setApiKeySelected(false);
            setGenerationState('selecting_key');
        } else {
            setError(e.message || 'An unknown error occurred.');
            setGenerationState('error');
        }
    } finally {
        setLoadingMessage('');
    }
  };
  
  const resetState = () => {
      setImageFile(null);
      setImagePreview(null);
      setScript('');
      setVideoUrl(null);
      setError(null);
      setGenerationState(apiKeySelected ? 'idle' : 'selecting_key');
  }

  const isGenerating = generationState === 'loading' || generationState === 'polling';
  const isFormDisabled = isGenerating || !apiKeySelected;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-4">
      <main className="w-full max-w-4xl bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
        <div className="p-8">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
              Veo AI Video Generator
            </h1>
            <p className="text-gray-400 mt-2">Bring your photos to life with a script and AI.</p>
          </header>

          {apiKeySelected === false && <ApiKeySelector onKeySelected={() => {
              setApiKeySelected(true);
              setGenerationState('idle');
          }}/>}

          {apiKeySelected && (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Input Section */}
              <div className="flex flex-col space-y-6">
                
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">1. Upload a Photo</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative flex justify-center items-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${ isFormDisabled ? 'opacity-50 cursor-not-allowed' : 'border-gray-600 hover:border-indigo-500 bg-gray-700/50 hover:bg-gray-700'}`}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="h-full w-full object-cover rounded-lg" />
                    ) : (
                      <div className="text-center text-gray-400">
                        <UploadIcon className="mx-auto h-12 w-12" />
                        <p>Click to upload an image</p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={isFormDisabled}
                    />
                  </div>
                </div>

                {/* Script Input */}
                <div>
                  <label htmlFor="script" className="block text-sm font-medium text-gray-300 mb-2">2. Write your Script</label>
                  <textarea
                    id="script"
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    placeholder="e.g., A cinematic shot of this object on a beach at sunset."
                    rows={4}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isFormDisabled}
                  />
                </div>

                {/* Aspect Ratio */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">3. Choose Aspect Ratio</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setAspectRatio('16:9')} disabled={isFormDisabled} className={`flex items-center justify-center p-4 rounded-lg border-2 transition ${aspectRatio === '16:9' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-700 border-gray-600 hover:border-gray-500 disabled:opacity-50'}`}>
                            <AspectRatioLandscapeIcon className="h-6 w-6 mr-2"/> Landscape (16:9)
                        </button>
                        <button onClick={() => setAspectRatio('9:16')} disabled={isFormDisabled} className={`flex items-center justify-center p-4 rounded-lg border-2 transition ${aspectRatio === '9:16' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-700 border-gray-600 hover:border-gray-500 disabled:opacity-50'}`}>
                            <AspectRatioPortraitIcon className="h-6 w-6 mr-2"/> Portrait (9:16)
                        </button>
                    </div>
                </div>
                
                 {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={!imageFile || !script || isGenerating}
                    className="w-full flex items-center justify-center py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 transition disabled:opacity-50 disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    {isGenerating ? <><Spinner className="w-5 h-5 mr-2"/> Generating...</> : <><VideoIcon className="h-5 w-5 mr-2"/>Generate Video</>}
                </button>
              </div>

              {/* Output Section */}
              <div className="flex items-center justify-center bg-gray-900 rounded-lg min-h-[30rem] border border-gray-700">
                {isGenerating && (
                    <div className="text-center p-4">
                        <Spinner className="w-16 h-16 mx-auto" />
                        <p className="mt-4 font-semibold text-lg">Generating Video</p>
                        <p className="text-gray-400 text-sm mt-1">{loadingMessage}</p>
                    </div>
                )}
                {generationState === 'success' && videoUrl && (
                    <div className="w-full p-2">
                        <video src={videoUrl} controls autoPlay loop className="w-full rounded-md" />
                        <button onClick={resetState} className="mt-4 w-full text-center py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-lg transition">Create Another Video</button>
                    </div>
                )}
                 {generationState === 'error' && error && (
                    <div className="text-center p-4 text-red-400">
                        <p className="font-bold">Generation Failed</p>
                        <p className="text-sm mt-2">{error}</p>
                        <button onClick={resetState} className="mt-4 text-white py-2 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition">Try Again</button>
                    </div>
                 )}
                {generationState === 'idle' && !videoUrl && (
                    <div className="text-center text-gray-500 p-4">
                        <VideoIcon className="mx-auto h-16 w-16" />
                        <p>Your generated video will appear here.</p>
                    </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
