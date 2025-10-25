
import React, { useState, useCallback, ChangeEvent } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { analyzeMealImage } from '../../services/geminiService';
import { fileToBase64 } from '../../utils/helpers';
import { Camera, Mic, Square } from 'lucide-react';

const Logger: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mealAnalysis, setMealAnalysis] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [isRecording, setIsRecording] = useState(false);
  const [workoutTranscript, setWorkoutTranscript] = useState('');

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setMealAnalysis(null);
      setError('');

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeMeal = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setError('');
    setMealAnalysis(null);
    try {
      const base64Image = await fileToBase64(selectedFile);
      const resultText = await analyzeMealImage(base64Image, selectedFile.type);
      
      // Clean the response to parse JSON
      const jsonString = resultText.replace(/```json\n|```/g, '').trim();
      const resultJson = JSON.parse(jsonString);

      setMealAnalysis(resultJson);
    } catch (err) {
      setError('Failed to analyze meal. The response might not be valid JSON. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Note: This uses browser Web Speech API for transcription.
  // The transcribed text would then be sent to Gemini for structuring, which is omitted for brevity.
  const handleToggleRecording = () => {
    alert("Voice logging uses the browser's Speech Recognition API. The transcribed text can then be structured by Gemini.");
    setIsRecording(!isRecording);
    // In a real app, you would integrate `window.SpeechRecognition` here.
    if (!isRecording) {
      setWorkoutTranscript("Recording... (say 'log 3 sets of 10 squats')")
    } else {
      setWorkoutTranscript("Logged: 3 sets of 10 squats.")
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-on-surface">Log Activity</h1>
      
      <Card>
        <h2 className="text-xl font-bold mb-2">Log a Meal with AI</h2>
        <p className="text-on-surface-variant mb-4">Upload a photo of your meal and let Gemini analyze it for you.</p>
        
        <input type="file" id="meal-upload" accept="image/*" className="hidden" onChange={handleFileChange} />
        <Button onClick={() => document.getElementById('meal-upload')?.click()} className="w-full justify-center">
            <Camera className="mr-2 h-5 w-5" /> Select Photo
        </Button>

        {preview && (
          <div className="mt-4">
            <img src={preview} alt="Meal preview" className="rounded-lg max-h-60 w-auto mx-auto" />
          </div>
        )}

        {selectedFile && (
          <Button onClick={handleAnalyzeMeal} isLoading={isLoading} disabled={isLoading} className="mt-4 w-full">
            Analyze Meal
          </Button>
        )}

        {isLoading && <div className="mt-4"><Spinner /></div>}
        {error && <p className="mt-4 text-red-500">{error}</p>}
        {mealAnalysis && (
          <div className="mt-4 p-4 bg-background rounded-lg text-left">
            <h3 className="font-bold text-lg text-primary">{mealAnalysis.dishName}</h3>
            <p><strong>Calories:</strong> {mealAnalysis.calories} kcal</p>
            <p><strong>Protein:</strong> {mealAnalysis.protein}g</p>
            <p><strong>Carbs:</strong> {mealAnalysis.carbs}g</p>
            <p><strong>Fat:</strong> {mealAnalysis.fat}g</p>
            <p className="mt-2 text-sm text-on-surface-variant">{mealAnalysis.description}</p>
          </div>
        )}
      </Card>
      
      <Card>
        <h2 className="text-xl font-bold mb-2">Log a Workout</h2>
        <p className="text-on-surface-variant mb-4">Log your workout manually or use your voice.</p>
        <textarea
            className="w-full bg-background p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-primary focus:outline-none"
            rows={4}
            placeholder="e.g., Bench Press: 3 sets, 10 reps, 135lbs"
            value={workoutTranscript}
            onChange={(e) => setWorkoutTranscript(e.target.value)}
        />
        <div className="mt-4 flex gap-4">
            <Button className="flex-1">Log Manually</Button>
            <Button onClick={handleToggleRecording} variant="secondary" className="flex-1">
                {isRecording ? <Square className="mr-2 h-5 w-5" /> : <Mic className="mr-2 h-5 w-5" />}
                {isRecording ? 'Stop' : 'Log with Voice'}
            </Button>
        </div>
      </Card>

    </div>
  );
};

export default Logger;
