
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { createChat } from '../../services/geminiService';
import { GoogleGenAI, LiveSession, Modality, Blob, LiveServerMessage } from '@google/genai';
import { decodeBase64, decodeAudioData } from '../../utils/helpers';
import { Send, Mic, Square } from 'lucide-react';
import type { Chat } from '@google/genai';

type Message = {
  sender: 'user' | 'bot';
  text: string;
};

// --- Live API Audio Helper ---
const createAudioBlob = (data: Float32Array): Blob => {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  const binary = Array.from(int16).map(val => String.fromCharCode(val)).join('');
  return {
    data: btoa(binary),
    mimeType: 'audio/pcm;rate=16000',
  };
};

const AiCoach: React.FC = () => {
  const [mode, setMode] = useState<'text' | 'voice'>('text');

  // Text Chat State
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Voice Chat State
  const [isLive, setIsLive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcription, setTranscription] = useState<{user: string, model: string}[]>([]);
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);


  useEffect(() => {
    setChat(createChat());
    setMessages([{ sender: 'bot', text: "Hello! I'm your AI Fitness Coach. How can I help you today?" }]);
  }, []);

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !chat) return;
    const userMessage = { sender: 'user' as const, text: currentMessage };
    setMessages((prev) => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const response = await chat.sendMessage({ message: userMessage.text });
      const botMessage = { sender: 'bot' as const, text: response.text };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [...prev, { sender: 'bot', text: 'Sorry, something went wrong.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startLiveConversation = useCallback(async () => {
    setIsConnecting(true);
    setTranscription([]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      let nextStartTime = 0;

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: 'You are a friendly and helpful fitness coach.',
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = inputAudioContext;
            const source = inputAudioContext.createMediaStreamSource(stream);
            sourceRef.current = source;
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createAudioBlob(inputData);
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
              if (base64Audio) {
                  nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
                  const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), outputAudioContext, 24000, 1);
                  const source = outputAudioContext.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(outputAudioContext.destination);
                  source.start(nextStartTime);
                  nextStartTime += audioBuffer.duration;
              }

              if (message.serverContent?.inputTranscription) {
                currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
              }
              if (message.serverContent?.outputTranscription) {
                currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
              }
              if (message.serverContent?.turnComplete) {
                const userInput = currentInputTranscriptionRef.current;
                const modelOutput = currentOutputTranscriptionRef.current;
                setTranscription(prev => [...prev, {user: userInput, model: modelOutput}]);
                currentInputTranscriptionRef.current = '';
                currentOutputTranscriptionRef.current = '';
              }
          },
          onerror: (e) => console.error('Live API Error:', e),
          onclose: () => setIsLive(false),
        },
      });

      await sessionPromiseRef.current;
      setIsConnecting(false);
      setIsLive(true);
    } catch (error) {
      console.error('Failed to start live conversation:', error);
      setIsConnecting(false);
    }
  }, []);

  const stopLiveConversation = useCallback(async () => {
    if (sessionPromiseRef.current) {
        const session = await sessionPromiseRef.current;
        session.close();
        sessionPromiseRef.current = null;
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    if (sourceRef.current) sourceRef.current.disconnect();
    if (scriptProcessorRef.current) scriptProcessorRef.current.disconnect();
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    
    setIsLive(false);
    setIsConnecting(false);
  }, []);
  
  useEffect(() => {
    return () => {
      if (isLive) {
        stopLiveConversation();
      }
    };
  }, [isLive, stopLiveConversation]);


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-on-surface">AI Coach</h1>
      <div className="flex bg-surface rounded-lg p-1">
        <button onClick={() => setMode('text')} className={`w-1/2 py-2 rounded-md transition-colors ${mode === 'text' ? 'bg-primary text-background' : 'hover:bg-gray-700'}`}>Text Chat</button>
        <button onClick={() => setMode('voice')} className={`w-1/2 py-2 rounded-md transition-colors ${mode === 'voice' ? 'bg-primary text-background' : 'hover:bg-gray-700'}`}>Voice Chat</button>
      </div>

      {mode === 'text' && (
        <Card className="flex flex-col h-[60vh]">
          <div className="flex-grow overflow-y-auto pr-2 space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${msg.sender === 'user' ? 'bg-primary text-background' : 'bg-gray-700 text-on-surface'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
             {isLoading && <div className="flex justify-start"><div className="p-3 rounded-lg bg-gray-700"><Spinner size="sm"/></div></div>}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-grow bg-background p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="Ask a fitness question..."
            />
            <Button onClick={handleSendMessage} disabled={isLoading || !currentMessage.trim()}><Send /></Button>
          </div>
        </Card>
      )}

      {mode === 'voice' && (
        <Card className="text-center">
            <h2 className="text-xl font-bold mb-2">Live Conversation</h2>
            <p className="text-on-surface-variant mb-4">Talk with your AI coach in real-time. Just start speaking.</p>
            {!isLive && !isConnecting && (
                <Button onClick={startLiveConversation} className="w-full">
                    <Mic className="mr-2"/> Start Voice Chat
                </Button>
            )}
            {isConnecting && <Spinner />}
            {isLive && (
                <Button onClick={stopLiveConversation} variant="secondary" className="w-full bg-red-600 hover:bg-red-700">
                    <Square className="mr-2"/> Stop Conversation
                </Button>
            )}
            <div className="mt-4 text-left h-[40vh] overflow-y-auto p-2 bg-background rounded-lg">
                <h3 className="font-bold mb-2 text-primary">Live Transcription</h3>
                {transcription.length === 0 && <p className="text-on-surface-variant">Conversation will appear here...</p>}
                {transcription.map((turn, index) => (
                    <div key={index} className="mb-3">
                        <p><strong className="text-primary">You:</strong> {turn.user}</p>
                        <p><strong className="text-secondary">Coach:</strong> {turn.model}</p>
                    </div>
                ))}
                {isLive && !isConnecting && <p className="text-green-400 animate-pulse-fast">Listening...</p>}
            </div>
        </Card>
      )}
    </div>
  );
};

export default AiCoach;
