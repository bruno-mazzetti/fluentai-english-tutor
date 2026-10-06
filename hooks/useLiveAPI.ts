import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type, Tool } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array, resampleTo16k } from '../utils/audioUtils';
import { 
  LearnerProfile, 
  loadLearnerProfile, 
  saveLearnerProfile, 
  formatMemoryForSystemInstruction,
  DEFAULT_LEARNER_PROFILE 
} from '../utils/learnerMemory';

// Audio configuration constants
const OUTPUT_SAMPLE_RATE = 24000; // Expected output rate from Gemini
const BUFFER_SIZE = 4096;
const SEND_CHUNK_SIZE = 2048; // Send ~128ms chunks at 16kHz

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// Voice Configuration Types
export interface VoiceOption {
  id: string; // API voice name
  name: string; // Display name
  accent?: string;
  tone?: string;
  description: string;
  style: string; // For CSS logic
  tag?: string;
}

export const VOICES: VoiceOption[] = [
  { 
    id: 'Puck', 
    name: 'Puck (The Mate)', 
    accent: 'British',
    tone: 'Playful & Energetic',
    description: 'Casual, lively, and encouraging. Great for everyday banter, idioms, and natural slang.', 
    style: 'from-orange-500 to-amber-500',
    tag: 'Popular'
  },
  { 
    id: 'Zephyr', 
    name: 'Zephyr (The Conversationalist)', 
    accent: 'Modern',
    tone: 'Warm & Natural',
    description: 'Smooth, friendly, and contemporary. Ideal for effortless fluency and relaxed conversation.', 
    style: 'from-sky-500 to-blue-600',
    tag: 'New'
  },
  { 
    id: 'Charon', 
    name: 'Charon (The Professor)', 
    accent: 'British RP',
    tone: 'Authoritative & Rigorous',
    description: 'Deep, serious, and articulate. Excellent for grammar rules, sentence structure, and discipline.', 
    style: 'from-slate-600 to-slate-800',
    tag: 'Academic'
  },
  { 
    id: 'Aoede', 
    name: 'Aoede (The Diplomat)', 
    accent: 'British RP',
    tone: 'Polite & Professional',
    description: 'Clear, elegant, and poised. Perfect for professional English, job interviews, and formal speech.', 
    style: 'from-emerald-500 to-teal-600',
    tag: 'Business'
  },
  { 
    id: 'Kore', 
    name: 'Kore (The Patient Guide)', 
    accent: 'Gentle',
    tone: 'Soft & Reassuring',
    description: 'Very patient, calm, and soothing. Ideal for beginners or building confidence without stress.', 
    style: 'from-pink-500 to-rose-500',
    tag: 'Beginner'
  },
  { 
    id: 'Fenrir', 
    name: 'Fenrir (The Broadcaster)', 
    accent: 'International',
    tone: 'Dynamic & Fast-paced',
    description: 'Vibrant, sharp, and resonant. Great for listening comprehension at full native speed.', 
    style: 'from-indigo-600 to-violet-700',
    tag: 'Advanced'
  },
  { 
    id: 'Orus', 
    name: 'Orus (The Scholar)', 
    accent: 'Standard',
    tone: 'Methodical & Articulate',
    description: 'Rich, structured, and didactic. Excellent for deep vocabulary expansion and false friends.', 
    style: 'from-amber-600 to-orange-700',
    tag: 'New'
  },
  { 
    id: 'Leda', 
    name: 'Leda (The Motivator)', 
    accent: 'Engaging',
    tone: 'Enthusiastic & Clear',
    description: 'Upbeat and encouraging. Keeps you motivated through tricky conjugation drills and corrections.', 
    style: 'from-purple-500 to-fuchsia-600',
    tag: 'New'
  },
  { 
    id: 'Autonoe', 
    name: 'Autonoe (The Linguist)', 
    accent: 'Phonetic precision',
    tone: 'Expressive & Melodic',
    description: 'Clear phonetic delivery. Exceptional for accent reduction, mouth placement, and intonation.', 
    style: 'from-cyan-500 to-teal-500',
    tag: 'Phonetics'
  },
  { 
    id: 'Callirrhoe', 
    name: 'Callirrhoe (The Analyst)', 
    accent: 'Analytical',
    tone: 'Calm & Measured',
    description: 'Focused on precision and clarity. Ideal for text analysis, essay reviews, and document discussion.', 
    style: 'from-blue-500 to-indigo-600',
    tag: 'New'
  },
  { 
    id: 'Enceladus', 
    name: 'Enceladus (The Mentor)', 
    accent: 'Warm Baritone',
    tone: 'Reassuring & Deep',
    description: 'Deep and grounded pacing. Gives thoughtful explanations and constructive feedback.', 
    style: 'from-emerald-600 to-green-800',
    tag: 'New'
  }
];

export interface ConnectOptions {
  useSearch?: boolean;
  voiceName?: string;
  learnerProfile?: LearnerProfile;
  activeDocumentText?: string;
}

interface UseLiveAPIResult {
  connect: (optionsOrUseSearch?: boolean | ConnectOptions, voiceName?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  connectionState: ConnectionState;
  volume: number;
  error: string | null;
  micError: string | null;
  transcripts: ChatMessage[];
  clearConversation: () => void;
  currentVisualCue: string | null;
  sendTextMessage: (text: string) => void;
  sendImageMessage: (base64: string, mimeType: string) => void;
  isAiSpeaking: boolean;
  isMicEnabled: boolean;
  isSearchActive: boolean;
}

// Tool definition for visual mouth cues
const pronunciationTool: FunctionDeclaration = {
  name: "showMouthDiagram",
  description: "Show a visual diagram of mouth/tongue placement for a specific English sound.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      sound: {
        type: Type.STRING,
        description: "The phoneme to visualize. Use 'f_v' for F/V sounds, 'th' for TH sounds.",
        enum: ["th", "r", "l", "f_v", "w"]
      }
    },
    required: ["sound"]
  }
};

// Tool definition for persistent memory updates
const recordLearnerNoteTool: FunctionDeclaration = {
  name: "recordLearnerNote",
  description: "Record a newly introduced vocabulary word, grammar rule, or identified weakness into the student's persistent notebook.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        description: "Type of learning note",
        enum: ["vocabulary", "weakness", "grammar", "achievement"]
      },
      title: {
        type: Type.STRING,
        description: "The word, expression, or short grammar rule name"
      },
      content: {
        type: Type.STRING,
        description: "Definition, translation, or phonetic guideline"
      },
      example: {
        type: Type.STRING,
        description: "Optional natural example sentence in English"
      }
    },
    required: ["type", "title", "content"]
  }
};

export const useLiveAPI = (): UseLiveAPIResult => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [currentVisualCue, setCurrentVisualCue] = useState<string | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  
  // Initialize transcripts safely from localStorage with validation
  const [transcripts, setTranscripts] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('conversation_history');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .slice(-100)
        .filter(item => item && (item.role === 'user' || item.role === 'model') && typeof item.text === 'string')
        .map(item => ({
          role: item.role,
          text: String(item.text).substring(0, 5000)
        }));
    } catch (e) {
      console.error('Failed to safely load conversation history', e);
      return [];
    }
  });

  // Save transcripts capped to 100 messages to prevent storage exhaustion
  useEffect(() => {
    try {
      const capped = transcripts.slice(-100);
      localStorage.setItem('conversation_history', JSON.stringify(capped));
    } catch (e) {
      console.error('Failed to save conversation history', e);
    }
  }, [transcripts]);

  // Refs for persistent objects across renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Audio Input Buffering
  const pcmDataBufferRef = useRef<Float32Array>(new Float32Array(0));
  
  // High-performance session tracking
  const activeSessionRef = useRef<any>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const isConnectedRef = useRef<boolean>(false);
  const isDisconnectingRef = useRef<boolean>(false);
  
  // Refs for transcription accumulation
  const currentInputTransRef = useRef<string>('');
  const currentOutputTransRef = useRef<string>('');
  const visualCueTimerRef = useRef<number | null>(null);
  
  // Volume throttling
  const lastVolumeUpdateRef = useRef<number>(0);

  // Calculate RMS volume for visualizer
  const calculateVolume = (data: Float32Array) => {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / data.length);
    return Math.min(1, rms * 5); 
  };

  const clearConversation = useCallback(() => {
    setTranscripts([]);
    try {
      localStorage.removeItem('conversation_history');
    } catch (e) {
      console.error('Failed to clear conversation history', e);
    }
  }, []);

  const disconnect = useCallback(async () => {
    isDisconnectingRef.current = true;
    isConnectedRef.current = false;

    // Explicitly close session to prevent "Network Error" on reconnect
    if (activeSessionRef.current) {
        try {
            if (typeof activeSessionRef.current.close === 'function') {
                activeSessionRef.current.close();
            }
        } catch (e) {
            console.warn("Error closing session:", e);
        }
        activeSessionRef.current = null;
    }
    sessionPromiseRef.current = null;

    setConnectionState('disconnected');
    setVolume(0);
    setCurrentVisualCue(null);
    setIsAiSpeaking(false);
    setIsMicEnabled(false);
    currentInputTransRef.current = '';
    currentOutputTransRef.current = '';
    pcmDataBufferRef.current = new Float32Array(0);

    if (visualCueTimerRef.current) {
      clearTimeout(visualCueTimerRef.current);
      visualCueTimerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
    }

    scheduledSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    scheduledSourcesRef.current.clear();

    if (audioContextRef.current) {
      try { 
          await audioContextRef.current.close(); 
      } catch(e) {
          console.error("Error closing audio context:", e);
      }
      audioContextRef.current = null;
    }
    isDisconnectingRef.current = false;
  }, []);

  const sendTextMessage = useCallback((text: string) => {
    const cleanText = (typeof text === 'string' ? text.trim() : '').substring(0, 4000);
    if (!cleanText) return;

    const dispatch = (session: any) => {
      try {
        if (typeof session.sendClientContent === 'function') {
          session.sendClientContent({
            turns: [{
              role: 'user',
              parts: [{ text: cleanText }]
            }],
            turnComplete: true
          });
        } else if (typeof session.send === 'function') {
          session.send({
            clientContent: {
              turns: [{
                role: 'user',
                parts: [{ text: cleanText }]
              }],
              turnComplete: true
            }
          });
        } else if (session.conn && typeof session.conn.send === 'function') {
          session.conn.send(JSON.stringify({
            clientContent: {
              turns: [{
                role: 'user',
                parts: [{ text: cleanText }]
              }],
              turnComplete: true
            }
          }));
        } else {
          console.warn("No compatible send method found on active session:", session);
        }
      } catch (e) {
        console.error("Failed to send text:", e);
      }
    };

    if (activeSessionRef.current && isConnectedRef.current) {
      setTranscripts(prev => [...prev, { role: 'user', text: cleanText }]);
      dispatch(activeSessionRef.current);
    } else if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => {
        if (session && !isDisconnectingRef.current) {
          setTranscripts(prev => [...prev, { role: 'user', text: cleanText }]);
          dispatch(session);
        }
      }).catch(err => {
        console.error("Failed to resolve session for sending text:", err);
      });
    } else {
      console.warn("Cannot send message: No active session or connection in progress.");
    }
  }, []);

  const sendImageMessage = useCallback((base64: string, mimeType: string) => {
    const dispatch = (session: any) => {
      try {
        if (typeof session.sendClientContent === 'function') {
          session.sendClientContent({
            turns: [{
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64
                  }
                },
                {
                  text: "Please analyze this image from an English learning perspective. Describe what you see, teach 2-3 relevant vocabulary words, and ask me a question about it in English."
                }
              ]
            }],
            turnComplete: true
          });
        } else if (typeof session.send === 'function') {
          session.send({
            clientContent: {
              turns: [{
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64
                    }
                  },
                  {
                    text: "Please analyze this image from an English learning perspective. Describe what you see, teach 2-3 relevant vocabulary words, and ask me a question about it in English."
                  }
                ]
              }],
              turnComplete: true
            }
          });
        } else if (session.conn && typeof session.conn.send === 'function') {
          session.conn.send(JSON.stringify({
            clientContent: {
              turns: [{
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64
                    }
                  },
                  {
                    text: "Please analyze this image from an English learning perspective. Describe what you see, teach 2-3 relevant vocabulary words, and ask me a question about it in English."
                  }
                ]
              }],
              turnComplete: true
            }
          }));
        } else {
          console.warn("No compatible send method found on active session for image:", session);
        }
      } catch (e) {
        console.error("Failed to send image message:", e);
      }
    };

    if (activeSessionRef.current && isConnectedRef.current) {
      setTranscripts(prev => [...prev, { role: 'user', text: "[Image Sent]" }]);
      dispatch(activeSessionRef.current);
    } else if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => {
        if (session && !isDisconnectingRef.current) {
          setTranscripts(prev => [...prev, { role: 'user', text: "[Image Sent]" }]);
          dispatch(session);
        }
      }).catch(err => {
        console.error("Failed to resolve session for sending image:", err);
      });
    }
  }, []);

  const connect = useCallback(async (
    optionsOrUseSearch: boolean | ConnectOptions = false,
    legacyVoiceName: string = 'Puck'
  ) => {
    try {
      isDisconnectingRef.current = false;
      try {
        await disconnect();
      } catch (cleanupError) {
        console.warn("Cleanup warning:", cleanupError);
      }
      
      setConnectionState('connecting');
      setError(null);
      setMicError(null);

      // Parse options
      let useSearch = false;
      let voiceName = legacyVoiceName;
      let learnerProfile: LearnerProfile = loadLearnerProfile();
      let activeDocumentText: string | undefined = undefined;

      if (typeof optionsOrUseSearch === 'object' && optionsOrUseSearch !== null) {
        useSearch = !!optionsOrUseSearch.useSearch;
        voiceName = optionsOrUseSearch.voiceName || legacyVoiceName;
        if (optionsOrUseSearch.learnerProfile) {
          learnerProfile = optionsOrUseSearch.learnerProfile;
        }
        activeDocumentText = optionsOrUseSearch.activeDocumentText;
      } else if (typeof optionsOrUseSearch === 'boolean') {
        useSearch = optionsOrUseSearch;
      }

      setIsSearchActive(useSearch);
      
      if (!window.isSecureContext) {
         setMicError("HTTPS required for microphone access.");
         setIsMicEnabled(false);
      } else {
         let stream = null;
         try {
           if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
              try {
                 stream = await navigator.mediaDevices.getUserMedia({ 
                   audio: {
                     echoCancellation: true,
                     noiseSuppression: true,
                     autoGainControl: true
                   } 
                 });
              } catch (e: any) {
                 console.warn("Standard audio constraints failed, retrying with defaults:", e);
                 stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              }
              streamRef.current = stream;
              setIsMicEnabled(true);
           } else {
              setMicError("Browser does not support audio input.");
              setIsMicEnabled(false);
           }
         } catch (err: any) {
           console.warn("Microphone access failed:", err);
           let errorMsg = `Mic Error: ${err.name || err.message}`;
           if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
               errorMsg = "Access denied. Check browser/OS permissions.";
           } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
               try {
                   const devices = await navigator.mediaDevices.enumerateDevices();
                   const audioInputs = devices.filter(d => d.kind === 'audioinput');
                   if (audioInputs.length === 0) {
                       errorMsg = "No audio input devices detected by browser.";
                   } else {
                       errorMsg = "Microphone found but cannot be accessed.";
                   }
               } catch (enumErr) {
                   errorMsg = "No microphone found.";
               }
           } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
               errorMsg = "Microphone is busy or in use by another app.";
           } else if (err.name === 'OverconstrainedError') {
               errorMsg = "Microphone hardware incompatible.";
           }
           setMicError(errorMsg);
           setIsMicEnabled(false);
         }
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1.0;
      gainNode.connect(audioContext.destination);
      gainNodeRef.current = gainNode;
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // Generate pedagogical system instruction with persistent long-term memory & document context
      const systemInstructionText = `You are a world-class, encouraging, and rigorous English teacher and conversational coach.
Your mission is to guide the student toward fluent, natural, and confident English speaking.

${formatMemoryForSystemInstruction(learnerProfile, activeDocumentText)}

SEARCH ACCESS:
${useSearch ? '- Web Search Grounding is ENABLED. You may search or quote real-time news, cultural references, or fact-check definitions.' : '- Web Search is in offline baseline mode.'}

CORE PROTOCOLS:
1. FRENCH TO ENGLISH TRANSLATION:
   - IF the user speaks French:
     a) Translate their sentence into idiomatic, natural English.
     b) Briefly explain the vocabulary nuance or grammar rule.
     c) EXPLICITLY ask the user to repeat the English phrase.

2. ACTIVE CORRECTION & FEEDBACK:
   - When a grammatical, conjugation, or vocabulary error occurs:
     a) Stop them gently and model the correct phrasing.
     b) Provide 1-2 alternatives (formal vs casual).
     c) If it matches a known student weakness, note the progress or remind them of the pattern.

3. PRONUNCIATION & ARTICULATION:
   - If pronunciation is flawed (especially 'TH', 'R', 'L', 'F/V', 'W'):
     a) Provide specific articulatory phonetics guidance (tongue against teeth, lip rounding).
     b) Call "showMouthDiagram" with the sound code ("th", "r", "l", "f_v", "w") to show the visual diagram.

4. PERSISTENT LEARNING NOTEBOOK:
   - When the learner discovers an important new word, idiom, or overcomes a key grammar rule, you can call "recordLearnerNote" to automatically save it to their persistent notebook.

5. TONALITY & INTERACTION:
   - Maintain the selected persona tone: encouraging, engaging, energetic.
   - Keep spoken turns concise (2-4 sentences max per turn) so the student talks at least 70% of the time!
`;
      
      const config: any = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
        },
        systemInstruction: systemInstructionText,
      };

      // Tools definition
      const toolList: Tool[] = [
        { functionDeclarations: [pronunciationTool, recordLearnerNoteTool] }
      ];

      // Enable Google Search tool if requested
      if (useSearch) {
        toolList.push({ googleSearch: {} });
      }

      config.tools = toolList;
      
      // Add transcription
      config.inputAudioTranscription = {};
      config.outputAudioTranscription = {};

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: config,
        callbacks: {
          onopen: () => {
            console.log('Gemini Live API Connected');
            setTimeout(() => {
                if (isDisconnectingRef.current) return;
                isConnectedRef.current = true;
                setConnectionState('connected');
            }, 1000); 
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              scheduledSourcesRef.current.forEach(s => {
                try { s.stop(); } catch (e) {}
              });
              scheduledSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              currentOutputTransRef.current = ''; 
              setIsAiSpeaking(false);
              return;
            }

            if (message.toolCall) {
              const calls = message.toolCall.functionCalls;
              if (calls && calls.length > 0) {
                for (const call of calls) {
                  if (call.name === 'showMouthDiagram') {
                    const sound = (call.args as any)?.sound;
                    if (sound) {
                      setCurrentVisualCue(sound);
                      if (visualCueTimerRef.current) clearTimeout(visualCueTimerRef.current);
                      visualCueTimerRef.current = window.setTimeout(() => setCurrentVisualCue(null), 8000);
                    }
                    
                    // Respond to function call
                    sessionPromise.then(session => {
                        session.sendToolResponse({
                            functionResponses: [{
                                id: call.id,
                                name: call.name,
                                response: { result: "diagram_displayed" }
                            }]
                        });
                    });
                  } else if (call.name === 'recordLearnerNote') {
                    const args = call.args as any;
                    if (args && typeof args === 'object') {
                      try {
                        const profile = loadLearnerProfile();
                        const safeTitle = String(args.title || '').trim().substring(0, 100);
                        const safeContent = String(args.content || '').trim().substring(0, 300);
                        const safeExample = args.example ? String(args.example).trim().substring(0, 300) : undefined;

                        if (safeTitle && safeContent) {
                          if (args.type === 'vocabulary') {
                            const newWord = {
                              id: 'w-' + Date.now(),
                              word: safeTitle,
                              translationOrMeaning: safeContent,
                              exampleSentence: safeExample,
                              dateAdded: new Date().toISOString().split('T')[0]
                            };
                            profile.vocabularyNotebook.push(newWord);
                            if (profile.vocabularyNotebook.length > 200) {
                              profile.vocabularyNotebook = profile.vocabularyNotebook.slice(-200);
                            }
                          } else if (args.type === 'weakness') {
                            const newWp = {
                              id: 'wp-' + Date.now(),
                              category: 'general' as const,
                              description: safeTitle + ': ' + safeContent,
                              correction: safeExample
                            };
                            profile.weakPoints.push(newWp);
                            if (profile.weakPoints.length > 50) {
                              profile.weakPoints = profile.weakPoints.slice(-50);
                            }
                          }
                          saveLearnerProfile(profile);
                        }
                      } catch (e) {
                        console.warn('Failed to safely auto-save learner note', e);
                      }
                    }

                    sessionPromise.then(session => {
                      session.sendToolResponse({
                        functionResponses: [{
                          id: call.id,
                          name: call.name,
                          response: { result: "note_saved_to_profile" }
                        }]
                      });
                    });
                  }
                }
              }
            }

            const inputTxt = message.serverContent?.inputTranscription?.text;
            if (inputTxt) currentInputTransRef.current += inputTxt;

            const outputTxt = message.serverContent?.outputTranscription?.text;
            if (outputTxt) currentOutputTransRef.current += outputTxt;

            if (message.serverContent?.turnComplete) {
              const newTranscripts: ChatMessage[] = [];
              if (currentInputTransRef.current.trim()) {
                newTranscripts.push({ role: 'user', text: currentInputTransRef.current.trim() });
                currentInputTransRef.current = '';
              }
              if (currentOutputTransRef.current.trim()) {
                newTranscripts.push({ role: 'model', text: currentOutputTransRef.current.trim() });
                currentOutputTransRef.current = '';
              }
              if (newTranscripts.length > 0) {
                setTranscripts(prev => [...prev, ...newTranscripts]);
              }
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              const ctx = audioContextRef.current;
              if (ctx.state === 'suspended') {
                  try { await ctx.resume(); } catch(e) {}
              }

              setIsAiSpeaking(true);
              const pcmData = base64ToUint8Array(base64Audio);
              const audioBuffer = await decodeAudioData(pcmData, ctx, OUTPUT_SAMPLE_RATE);
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              if (gainNodeRef.current) {
                  source.connect(gainNodeRef.current);
              } else {
                  source.connect(ctx.destination);
              }

              const currentTime = ctx.currentTime;
              const startTime = Math.max(currentTime, nextStartTimeRef.current);
              source.start(startTime);
              nextStartTimeRef.current = startTime + audioBuffer.duration;

              scheduledSourcesRef.current.add(source);
              source.onended = () => {
                scheduledSourcesRef.current.delete(source);
                if (scheduledSourcesRef.current.size === 0) {
                  setIsAiSpeaking(false);
                }
              };
            }
          },
          onerror: (err) => {
            console.error('Gemini Live API Error:', err);
            setError("Connection disrupted. Please check your mic and network, then reconnect.");
            disconnect();
          },
          onclose: () => {
            console.log('Gemini Live API Closed');
            disconnect();
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;
      sessionPromise.then(session => {
        activeSessionRef.current = session;
      }).catch(err => {
        console.error("Session promise rejected:", err);
      });

      // Microphone processing
      if (streamRef.current && audioContextRef.current) {
         const ctx = audioContextRef.current;
         const source = ctx.createMediaStreamSource(streamRef.current);
         sourceRef.current = source;
         
         const processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1);
         processorRef.current = processor;

         processor.onaudioprocess = (e) => {
           if (isDisconnectingRef.current || !isConnectedRef.current) return;
           
           const inputData = e.inputBuffer.getChannelData(0);
           
           // Volume visualizer throttle
           const now = Date.now();
           if (now - lastVolumeUpdateRef.current > 50) {
              setVolume(calculateVolume(inputData));
              lastVolumeUpdateRef.current = now;
           }

           const resampled = resampleTo16k(inputData, ctx.sampleRate);
           
           // Append to buffer
           const newBuffer = new Float32Array(pcmDataBufferRef.current.length + resampled.length);
           newBuffer.set(pcmDataBufferRef.current);
           newBuffer.set(resampled, pcmDataBufferRef.current.length);
           pcmDataBufferRef.current = newBuffer;

           // Send chunks
           while (pcmDataBufferRef.current.length >= SEND_CHUNK_SIZE) {
             const chunk = pcmDataBufferRef.current.slice(0, SEND_CHUNK_SIZE);
             pcmDataBufferRef.current = pcmDataBufferRef.current.slice(SEND_CHUNK_SIZE);
             
             const blob = createPcmBlob(chunk);
             if (activeSessionRef.current && isConnectedRef.current && !isDisconnectingRef.current) {
                try {
                  activeSessionRef.current.sendRealtimeInput({
                    audio: {
                      data: blob.data,
                      mimeType: blob.mimeType
                    }
                  });
                } catch (err) {
                  console.warn("Failed to stream real-time audio chunk:", err);
                }
             }
           }
         };

         source.connect(processor);
         processor.connect(ctx.destination);
      }

    } catch (err: any) {
      console.error("Connection process failed:", err);
      setError(err.message || "Failed to start learning session.");
      disconnect();
    }
  }, [disconnect]);

  return {
    connect,
    disconnect,
    connectionState,
    volume,
    error,
    micError,
    transcripts,
    clearConversation,
    currentVisualCue,
    sendTextMessage,
    sendImageMessage,
    isAiSpeaking,
    isMicEnabled,
    isSearchActive
  };
};
