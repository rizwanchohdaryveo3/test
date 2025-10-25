
import { GoogleGenAI } from "@google/genai";
import type { AspectRatio } from '../types';

// FIX: Removed conflicting global declaration for window.aistudio.
// The TypeScript compiler error indicates that this is already declared elsewhere.
const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                resolve('');
            }
        };
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};


export const generateVideoFromImage = async (
    prompt: string,
    imageFile: File,
    aspectRatio: AspectRatio,
    onProgress: (message: string) => void
): Promise<string> => {
    
    // Create a new instance every time to get the latest API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    onProgress("Converting image...");
    const imagePart = await fileToGenerativePart(imageFile);
    
    if (!imagePart.inlineData.data) {
        throw new Error("Failed to convert image to base64.");
    }
    
    onProgress("Starting video generation...");
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        image: {
            imageBytes: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType,
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio,
        }
    });

    onProgress("Processing your video... this may take a few minutes.");
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        onProgress("Still processing... checking status.");
        try {
            operation = await ai.operations.getVideosOperation({ operation: operation });
        } catch(e: any) {
             if (e.message?.includes("Requested entity was not found")) {
                throw new Error("API_KEY_ERROR");
            }
            throw e;
        }
    }

    if (operation.error) {
        throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    onProgress("Finalizing video...");
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Could not retrieve video download link.");
    }

    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes("API key not valid")) {
             throw new Error("API_KEY_ERROR");
        }
        throw new Error(`Failed to download video: ${response.statusText}`);
    }
    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);
};