
import { GoogleGenAI, GenerateContentResponse, Chat, Type, Modality, FunctionDeclaration } from "@google/genai";

// IMPORTANT: This service assumes the API key is set in the environment.
// In a real browser environment, this would be handled securely by a backend proxy
// or a build process that replaces `process.env.API_KEY`.
// For this example, we assume it's available.

const getGenAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// --- Text & Chat ---

export const getQuickTip = async (): Promise<string> => {
    try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: 'Give me a short, actionable fitness or nutrition tip. Make it concise and easy to understand.',
        });
        return response.text;
    } catch (error) {
        console.error("Error getting quick tip:", error);
        return "Couldn't fetch a tip right now. Try again later!";
    }
};

export const createChat = (): Chat => {
    const ai = getGenAI();
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: 'You are a friendly and encouraging fitness and nutrition coach. Provide helpful, safe, and motivating advice. Keep your answers concise unless asked for details.',
        },
    });
};

export const generateMealPlan = async (prompt: string): Promise<string> => {
    try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 32768 },
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error generating meal plan:", error);
        return "Sorry, I couldn't generate the meal plan. Please check your request and try again.";
    }
};

// --- Image & Video Understanding ---

export const analyzeMealImage = async (base64Image: string, mimeType: string): Promise<string> => {
    try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Image,
                        },
                    },
                    {
                        text: 'Analyze this image of a meal. Identify the food items and estimate the total calories and macronutrients (protein, carbs, fat). Return the response as a JSON object with keys: "dishName", "calories", "protein", "carbs", "fat", and "description".',
                    },
                ],
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error analyzing meal image:", error);
        return "Could not analyze the image. Please try another one.";
    }
};

export const analyzeWorkoutForm = async (description: string): Promise<string> => {
    try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `A user has uploaded a video of their workout. Based on their description, provide detailed feedback on their form for the exercise. Description: "${description}". Be encouraging and provide 2-3 actionable tips for improvement.`,
        });
        return response.text;
    } catch (error) {
        console.error("Error analyzing workout form:", error);
        return "Failed to get form feedback. Please try again.";
    }
};

// --- Generation (Image, Video, Audio) ---

export const generateMotivationImage = async (prompt: string, aspectRatio: string): Promise<string> => {
    try {
        const ai = getGenAI();
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio,
            },
        });
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("Failed to generate image.");
    }
};

export const editImageWithPrompt = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
    try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: { data: base64Image, mimeType },
                    },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        throw new Error("No image data in response.");
    } catch (error) {
        console.error("Error editing image:", error);
        throw new Error("Failed to edit image.");
    }
};

export const generateTextToSpeech = async (text: string): Promise<string> => {
    try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: `Say with a clear and encouraging tone: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? "";
    } catch (error) {
        console.error("Error with TTS:", error);
        throw new Error("Failed to generate audio.");
    }
};

export const generateVideo = async (prompt: string, aspectRatio: '16:9' | '9:16', image?: { base64: string, mimeType: string }) => {
    try {
        const ai = getGenAI();
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt,
            ...(image && { image: { imageBytes: image.base64, mimeType: image.mimeType } }),
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio,
            },
        });
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error("Video generation completed but no download link was found.");
        }
        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!videoResponse.ok) {
            throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
        }
        const videoBlob = await videoResponse.blob();
        return URL.createObjectURL(videoBlob);
    } catch (error) {
        console.error("Error generating video:", error);
        throw error;
    }
};

// --- Grounding ---

export const getGroundedAnswer = async (prompt: string): Promise<GenerateContentResponse> => {
     try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        return response;
    } catch (error) {
        console.error("Error getting grounded answer:", error);
        throw new Error("Failed to get a grounded response.");
    }
};

export const getMapsAnswer = async (prompt: string, location: { latitude: number; longitude: number; }): Promise<GenerateContentResponse> => {
    try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleMaps: {} }],
                toolConfig: {
                    retrievalConfig: { latLng: location },
                }
            },
        });
        return response;
    } catch (error) {
        console.error("Error getting maps answer:", error);
        throw new Error("Failed to get a maps-grounded response.");
    }
};
