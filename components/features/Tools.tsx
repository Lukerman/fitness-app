
import React, { useState, ChangeEvent } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { generateMealPlan, analyzeWorkoutForm, generateMotivationImage, editImageWithPrompt, generateVideo, generateTextToSpeech } from '../../services/geminiService';
import { fileToBase64, decodeAudioData, decodeBase64 } from '../../utils/helpers';
import { SlidersHorizontal, Image as ImageIcon, Video, Pencil, Volume2 } from 'lucide-react';

const Tools: React.FC = () => {
    // Shared state
    const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
    const [result, setResult] = useState<Record<string, any>>({});
    const [error, setError] = useState<Record<string, string>>({});

    // Meal planner state
    const [mealPrompt, setMealPrompt] = useState('Generate a 3-day high-protein meal plan for weight loss, around 1800 calories per day.');
    
    // Form analyzer state
    const [formDescription, setFormDescription] = useState('A video of me doing barbell squats. I think my back is rounding a bit.');

    // Image generator state
    const [imagePrompt, setImagePrompt] = useState('An energetic person running on a beach during a vibrant sunset.');
    const [aspectRatio, setAspectRatio] = useState('16:9');

    // Image editor state
    const [editImageFile, setEditImageFile] = useState<File | null>(null);
    const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
    const [editPrompt, setEditPrompt] = useState('Add a dramatic, cinematic filter.');
    
    // Video generator state
    const [videoPrompt, setVideoPrompt] = useState('A photorealistic video of a person performing a perfect kettlebell swing.');
    const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [videoImageFile, setVideoImageFile] = useState<File | null>(null);
    const [videoImagePreview, setVideoImagePreview] = useState<string | null>(null);
    const [hasApiKey, setHasApiKey] = useState(false);

    const handleAction = async (action: string, payload?: any) => {
        setIsLoading(prev => ({ ...prev, [action]: true }));
        setError(prev => ({ ...prev, [action]: '' }));
        setResult(prev => ({ ...prev, [action]: null }));

        try {
            let response;
            switch(action) {
                case 'mealPlan':
                    response = await generateMealPlan(mealPrompt);
                    break;
                case 'formAnalysis':
                    response = await analyzeWorkoutForm(formDescription);
                    break;
                case 'imageGen':
                    response = await generateMotivationImage(imagePrompt, aspectRatio);
                    break;
                case 'imageEdit':
                    if (!editImageFile) throw new Error("Please select an image to edit.");
                    const base64 = await fileToBase64(editImageFile);
                    response = await editImageWithPrompt(base64, editImageFile.type, editPrompt);
                    break;
                case 'videoGen':
                    let imagePayload;
                    if (videoImageFile) {
                        const base64 = await fileToBase64(videoImageFile);
                        imagePayload = { base64, mimeType: videoImageFile.type };
                    }
                    response = await generateVideo(videoPrompt, videoAspectRatio, imagePayload);
                    break;
                case 'tts':
                    const textToSpeak = result.formAnalysis || 'No analysis to read.';
                    const audioBase64 = await generateTextToSpeech(textToSpeak);
                    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                    const audioBuffer = await decodeAudioData(decodeBase64(audioBase64), audioContext, 24000, 1);
                    const source = audioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(audioContext.destination);
                    source.start();
                    response = 'Audio playing...'; // Just for feedback
                    break;
                default:
                    throw new Error("Unknown action");
            }
            setResult(prev => ({...prev, [action]: response}));
        } catch (err: any) {
            console.error(err);
            // Veo API key check
            if (err.message?.includes('Requested entity was not found')) {
                setError(prev => ({...prev, [action]: 'API Key not valid. Please select a key.'}));
                setHasApiKey(false);
            } else {
                setError(prev => ({...prev, [action]: err.message || 'An error occurred.'}));
            }
        } finally {
            setIsLoading(prev => ({ ...prev, [action]: false }));
        }
    };
    
    const checkApiKey = async () => {
        // @ts-ignore
        if (await window.aistudio.hasSelectedApiKey()) {
            setHasApiKey(true);
        }
    };
    
    useState(() => {
        checkApiKey();
    });

    const selectApiKey = async () => {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        setHasApiKey(true); // Assume success to avoid race condition
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>, type: 'edit' | 'video') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                if(type === 'edit') {
                    setEditImageFile(file);
                    setEditImagePreview(reader.result as string);
                } else {
                    setVideoImageFile(file);
                    setVideoImagePreview(reader.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-on-surface">AI Fitness Tools</h1>

            {/* Meal Planner */}
            <Card>
                <h2 className="text-xl font-bold mb-2">AI Meal Planner</h2>
                <p className="text-on-surface-variant mb-4">Describe your dietary needs for a custom meal plan.</p>
                <textarea className="w-full bg-background p-2 rounded-md border border-gray-600" rows={3} value={mealPrompt} onChange={e => setMealPrompt(e.target.value)} />
                <Button onClick={() => handleAction('mealPlan')} isLoading={isLoading['mealPlan']} className="mt-2 w-full">Generate Meal Plan</Button>
                {result.mealPlan && <div className="mt-4 p-2 bg-background rounded whitespace-pre-wrap">{result.mealPlan}</div>}
                {error.mealPlan && <p className="mt-2 text-red-500">{error.mealPlan}</p>}
            </Card>

            {/* Form Analyzer */}
            <Card>
                <h2 className="text-xl font-bold mb-2">Workout Form Analyzer</h2>
                <p className="text-on-surface-variant mb-4">Upload a video of your exercise and describe it for AI feedback. (Video upload is simulated)</p>
                <textarea className="w-full bg-background p-2 rounded-md border border-gray-600" placeholder="Describe your workout..." value={formDescription} onChange={e => setFormDescription(e.target.value)} />
                <Button onClick={() => handleAction('formAnalysis')} isLoading={isLoading['formAnalysis']} className="mt-2 w-full">Analyze Form</Button>
                {result.formAnalysis && (
                    <div className="mt-4 p-2 bg-background rounded">
                        <p className="whitespace-pre-wrap">{result.formAnalysis}</p>
                        <Button onClick={() => handleAction('tts')} isLoading={isLoading['tts']} variant="secondary" size="sm" className="mt-2">
                           <Volume2 className="mr-2 h-4 w-4"/> Read Aloud
                        </Button>
                    </div>
                )}
                {error.formAnalysis && <p className="mt-2 text-red-500">{error.formAnalysis}</p>}
            </Card>

            {/* Image Generator */}
            <Card>
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold mb-2">Motivation Image Generator</h2>
                    <ImageIcon className="text-primary"/>
                </div>
                <p className="text-on-surface-variant mb-4">Create an inspiring image for your fitness journey.</p>
                <input type="text" className="w-full bg-background p-2 rounded-md border border-gray-600" value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} />
                <div className="flex items-center gap-4 mt-2">
                    <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="bg-background p-2 rounded-md border border-gray-600">
                        <option value="1:1">1:1</option>
                        <option value="16:9">16:9</option>
                        <option value="9:16">9:16</option>
                        <option value="4:3">4:3</option>
                        <option value="3:4">3:4</option>
                    </select>
                    <Button onClick={() => handleAction('imageGen')} isLoading={isLoading['imageGen']} className="flex-grow">Generate Image</Button>
                </div>
                 {isLoading.imageGen && <div className="mt-4"><Spinner/></div>}
                {result.imageGen && <img src={result.imageGen} alt="Generated motivation" className="mt-4 rounded-lg" />}
                {error.imageGen && <p className="mt-2 text-red-500">{error.imageGen}</p>}
            </Card>

            {/* Image Editor */}
            <Card>
                <div className="flex justify-between items-center">
                     <h2 className="text-xl font-bold mb-2">Progress Photo Editor</h2>
                     <Pencil className="text-primary"/>
                </div>
                <p className="text-on-surface-variant mb-4">Upload a photo and use a text prompt to edit it.</p>
                <input type="file" id="edit-upload" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'edit')} />
                <Button onClick={() => document.getElementById('edit-upload')?.click()} className="w-full">Select Photo</Button>
                {editImagePreview && (
                    <div className="my-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div>
                            <p className="font-semibold mb-1">Original</p>
                            <img src={editImagePreview} alt="To be edited" className="rounded-lg w-full" />
                        </div>
                         <div>
                            <p className="font-semibold mb-1">Edited</p>
                            <div className="w-full aspect-square bg-background rounded-lg flex items-center justify-center">
                                {isLoading.imageEdit && <Spinner/>}
                                {result.imageEdit && <img src={result.imageEdit} alt="Edited result" className="rounded-lg w-full"/>}
                                {!isLoading.imageEdit && !result.imageEdit && <ImageIcon className="text-gray-500 h-12 w-12"/>}
                            </div>
                        </div>
                    </div>
                )}
                {editImageFile && (
                    <>
                        <input type="text" placeholder="e.g., Add a retro filter" className="w-full bg-background mt-4 p-2 rounded-md border border-gray-600" value={editPrompt} onChange={e => setEditPrompt(e.target.value)} />
                        <Button onClick={() => handleAction('imageEdit')} isLoading={isLoading['imageEdit']} className="mt-2 w-full">Edit Image</Button>
                    </>
                )}
                {error.imageEdit && <p className="mt-2 text-red-500">{error.imageEdit}</p>}
            </Card>
            
            {/* Video Generator */}
            <Card>
                <div className="flex justify-between items-center">
                     <h2 className="text-xl font-bold mb-2">Exercise Video Visualizer</h2>
                     <Video className="text-primary"/>
                </div>
                 <p className="text-on-surface-variant mb-4">Generate a video of an exercise from a text prompt, optionally with a starting image. <span className="font-bold">This can take a few minutes.</span></p>
                {!hasApiKey ? (
                    <div className="p-4 rounded-lg bg-yellow-900/50 text-yellow-200">
                        <p className="font-bold">API Key Required for Video Generation</p>
                        <p className="text-sm mb-2">Veo requires selecting an API key for a project with billing enabled.</p>
                        <Button onClick={selectApiKey}>Select API Key</Button>
                        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline ml-4">Learn about billing</a>
                    </div>
                ) : (
                    <>
                        <input type="text" className="w-full bg-background p-2 rounded-md border border-gray-600" value={videoPrompt} onChange={e => setVideoPrompt(e.target.value)} />
                        
                        <div className="mt-2">
                             <input type="file" id="video-img-upload" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'video')} />
                             <Button onClick={() => document.getElementById('video-img-upload')?.click()} variant="secondary" className="w-full">Add Optional Starting Image</Button>
                             {videoImagePreview && <img src={videoImagePreview} className="mt-2 rounded-lg max-h-40 mx-auto" alt="Video start preview"/>}
                        </div>

                        <div className="flex items-center gap-4 mt-2">
                            <select value={videoAspectRatio} onChange={e => setVideoAspectRatio(e.target.value as '16:9' | '9:16')} className="bg-background p-2 rounded-md border border-gray-600">
                                <option value="16:9">16:9 (Landscape)</option>
                                <option value="9:16">9:16 (Portrait)</option>
                            </select>
                            <Button onClick={() => handleAction('videoGen')} isLoading={isLoading['videoGen']} className="flex-grow">Generate Video</Button>
                        </div>
                        {isLoading.videoGen && (
                             <div className="mt-4 text-center">
                                <Spinner/>
                                <p className="text-primary animate-pulse-fast mt-2">Generating video... Please wait.</p>
                                <p className="text-sm text-on-surface-variant">This may take several minutes.</p>
                             </div>
                        )}
                        {result.videoGen && <video src={result.videoGen} controls autoPlay muted loop className="mt-4 rounded-lg w-full" />}
                        {error.videoGen && <p className="mt-2 text-red-500">{error.videoGen}</p>}
                    </>
                )}
            </Card>

        </div>
    );
};

export default Tools;
