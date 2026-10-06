import React, { useRef, useEffect, useState } from 'react';
import { useLiveAPI, VOICES, VoiceOption } from './hooks/useLiveAPI';
import { Visualizer } from './components/Visualizer';
import { MouthDiagram } from './components/MouthDiagram';
import { MemoryModal } from './components/MemoryModal';
import { DocumentDrawer } from './components/DocumentDrawer';
import { createNoiseBuffer } from './utils/audioUtils';
import { 
  loadLearnerProfile, 
  saveLearnerProfile, 
  LearnerProfile, 
  CEFRLevel,
  LearningPillar 
} from './utils/learnerMemory';
import { ParsedDocument } from './utils/documentParser';
import { 
  Globe, 
  Trash2, 
  Image as ImageIcon, 
  Send, 
  FileText, 
  Sparkles, 
  Mic, 
  MicOff, 
  BookOpen, 
  RotateCcw,
  Compass,
  BookMarked,
  Mic2,
  Languages,
  Clock,
  Check,
  GraduationCap,
  Volume2
} from 'lucide-react';

// Ambience Options
const AMBIENCES = [
  { id: 'off', name: 'Silence', icon: '🔇' },
  { id: 'rain', name: 'Pluie douce', icon: '🌧️', type: 'brown' },
  { id: 'cafe', name: 'Café', icon: '☕', type: 'pink' }
];

// Difficulty levels definitions
const LEVELS: { id: CEFRLevel; label: string; desc: string }[] = [
  { id: 'A1', label: 'Débutant', desc: 'Débit lent & vocabulaire de base' },
  { id: 'A2', label: 'Élémentaire', desc: 'Phrases simples du quotidien' },
  { id: 'B1', label: 'Intermédiaire', desc: 'Conversation courante & voyages' },
  { id: 'B2', label: 'Avancé', desc: 'Aisance & sujets complexes' },
  { id: 'C1', label: 'Autonome', desc: 'Anglais pro & académique' },
  { id: 'C2', label: 'Bilingue', desc: 'Fluidité totale & subtilités' }
];

// Pedagogical Pillars / Learning Focus
const PILLARS: { id: LearningPillar; label: string; icon: React.ReactNode; prompt: string; desc: string }[] = [
  {
    id: 'general',
    label: 'Conversation',
    icon: <Compass className="w-3.5 h-3.5" />,
    prompt: "Let's have a spontaneous dialogue in English. Proactively correct my grammar, pronunciation, and vocabulary whenever I make a slip.",
    desc: 'Échange naturel avec corrections bienveillantes'
  },
  {
    id: 'grammar',
    label: 'Grammaire',
    icon: <BookMarked className="w-3.5 h-3.5" />,
    prompt: "Let's do an interactive grammar workout suited for my level. Pick a tricky grammar rule, quiz me with a sentence to complete, and explain the rule.",
    desc: 'Structure de phrases, prépositions & règles'
  },
  {
    id: 'pronunciation',
    label: 'Prononciation',
    icon: <Mic2 className="w-3.5 h-3.5" />,
    prompt: "Let's focus on my English pronunciation and rhythm. Test me on sounds like TH, R, L, or vowels, and guide my mouth placement.",
    desc: 'Accent, sons difficiles & schémas de bouche'
  },
  {
    id: 'vocabulary',
    label: 'Vocabulaire',
    icon: <Languages className="w-3.5 h-3.5" />,
    prompt: "Teach me 3 rich or idiomatic English words for my level. Explain their nuance and common false friends with French, then ask me to use them.",
    desc: 'Mots thématiques, faux-amis & nuances'
  },
  {
    id: 'conjugation',
    label: 'Conjugaison',
    icon: <Clock className="w-3.5 h-3.5" />,
    prompt: "Let's practice English verb tenses. Test me on Past Simple vs Present Perfect or conditional forms, and correct my verb forms.",
    desc: 'Temps des verbes, verbes irréguliers & modaux'
  },
  {
    id: 'idioms',
    label: 'Expressions',
    icon: <Sparkles className="w-3.5 h-3.5" />,
    prompt: "Teach me an authentic British idiom or modern colloquial phrase. Explain its backstory, give an example, and ask me to reply using it.",
    desc: 'Tournures idiomatiques & vrai anglais parlé'
  }
];

const App: React.FC = () => {
  const { 
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
  } = useLiveAPI();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [textInput, setTextInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice & Controls state (All visible directly at the top)
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(VOICES[0]); // Puck default
  const [selectedAmbience, setSelectedAmbience] = useState(AMBIENCES[0]);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);

  // Learner Profile & Persistent Memory
  const [learnerProfile, setLearnerProfile] = useState<LearnerProfile>(() => loadLearnerProfile());
  const [showMemoryModal, setShowMemoryModal] = useState(false);

  // Document Study
  const [activeDocument, setActiveDocument] = useState<ParsedDocument | null>(null);
  const [showDocumentDrawer, setShowDocumentDrawer] = useState(false);

  // Ambience Audio Context
  const ambienceContextRef = useRef<AudioContext | null>(null);
  const ambienceSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Profile update helper
  const handleProfileUpdate = (updated: LearnerProfile) => {
    setLearnerProfile(updated);
    saveLearnerProfile(updated);
  };

  // Direct manual level selection
  const handleLevelSelect = (newLevel: CEFRLevel) => {
    const updated: LearnerProfile = { ...learnerProfile, level: newLevel };
    handleProfileUpdate(updated);

    if (connectionState === 'connected') {
      sendTextMessage(`[System: I have adjusted my English level to ${newLevel}. Please adapt your speech complexity, pace, and exercises accordingly.]`);
    }
  };

  // Direct learning focus selection
  const handlePillarSelect = (pillarId: LearningPillar, prompt: string) => {
    const updated: LearnerProfile = { ...learnerProfile, activePillar: pillarId };
    handleProfileUpdate(updated);

    if (connectionState === 'connected') {
      sendTextMessage(prompt);
    }
  };

  // Ambience sound management
  useEffect(() => {
    if (connectionState === 'connected' && selectedAmbience.id !== 'off') {
       if (!ambienceContextRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          ambienceContextRef.current = new AudioContextClass();
       }
       const ctx = ambienceContextRef.current;
       if (ctx.state === 'suspended') ctx.resume();

       if (ambienceSourceRef.current) {
           try { ambienceSourceRef.current.stop(); } catch(e){}
       }

       const type = (selectedAmbience as any).type || 'brown';
       const buffer = createNoiseBuffer(ctx, type);
       const source = ctx.createBufferSource();
       const gain = ctx.createGain();
       
       gain.gain.value = 0.05;
       source.buffer = buffer;
       source.loop = true;
       source.connect(gain);
       gain.connect(ctx.destination);
       source.start();
       ambienceSourceRef.current = source;

    } else {
       if (ambienceSourceRef.current) {
           try { ambienceSourceRef.current.stop(); } catch(e){}
           ambienceSourceRef.current = null;
       }
    }

    return () => {
      if (ambienceSourceRef.current) {
        try { ambienceSourceRef.current.stop(); } catch(e){}
      }
    };
  }, [connectionState, selectedAmbience]);

  // Connect / Disconnect handler
  const handleToggle = () => {
    if (connectionState === 'connected' || connectionState === 'connecting') {
      disconnect();
    } else {
      connect({
        useSearch: webSearchEnabled,
        voiceName: selectedVoice.id,
        learnerProfile: learnerProfile,
        activeDocumentText: activeDocument?.content
      });
    }
  };

  const handleSendMessage = () => {
    if (connectionState !== 'connected') return;

    if (selectedImage) {
      const match = selectedImage.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)$/);
      if (match) {
        const mimeType = match[1];
        const data = match[2];
        sendImageMessage(data, mimeType);
      }
      setSelectedImage(null);
    }

    const cleanInput = textInput.trim().substring(0, 4000);
    if (cleanInput) {
      sendTextMessage(cleanInput);
      setTextInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate MIME type
      if (!file.type || !file.type.startsWith('image/')) {
        alert("Veuillez sélectionner un fichier image valide (JPEG, PNG, WebP).");
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Validate size (< 4MB)
      if (file.size > 4 * 1024 * 1024) {
        alert("Image trop volumineuse (< 4 Mo requis).");
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => {
        console.warn("Échec de la lecture de l'image.");
        if (fileInputRef.current) fileInputRef.current.value = '';
      };

      reader.onloadend = () => {
        const result = reader.result as string;
        if (!result || typeof result !== 'string') return;
        const img = new Image();
        img.onerror = () => {
          console.warn("Format d'image non décodable.");
          if (fileInputRef.current) fileInputRef.current.value = '';
        };
        img.onload = () => {
          if (!img.width || !img.height) return;
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round(height * (MAX_WIDTH / width));
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round(width * (MAX_HEIGHT / height));
              height = MAX_HEIGHT;
            }
          }
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setSelectedImage(dataUrl);
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Auto-scroll transcripts
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  // Visualizer State
  const visualizerState = connectionState === 'connecting' 
    ? 'connecting' 
    : isAiSpeaking 
      ? 'speaking' 
      : connectionState === 'connected' 
        ? (isMicEnabled ? 'listening' : 'idle')
        : 'idle';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start p-3 sm:p-5 font-sans text-slate-200">
      
      {/* Memory Modal */}
      <MemoryModal
        isOpen={showMemoryModal}
        onClose={() => setShowMemoryModal(false)}
        profile={learnerProfile}
        onProfileUpdate={handleProfileUpdate}
      />

      {/* Document Drawer */}
      <DocumentDrawer
        isOpen={showDocumentDrawer}
        onClose={() => setShowDocumentDrawer(false)}
        activeDocument={activeDocument}
        onDocumentChange={setActiveDocument}
        onSendDocumentPrompt={(prompt) => {
          if (connectionState === 'connected') {
            sendTextMessage(prompt);
          } else {
            connect({
              useSearch: webSearchEnabled,
              voiceName: selectedVoice.id,
              learnerProfile: learnerProfile,
              activeDocumentText: activeDocument?.content
            }).then(() => {
              setTimeout(() => sendTextMessage(prompt), 1000);
            });
          }
        }}
        isConnected={connectionState === 'connected'}
      />

      {/* Main Studio Frame - Spaced, Generous and Elegant */}
      <div className="w-full max-w-4xl bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden min-h-[92vh]">
        
        {/* ============================================================== */}
        {/* HEADER: APP TITLE & LIVE CONNECTION STATUS */}
        {/* ============================================================== */}
        <header className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🇬🇧</span>
            <div>
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                FluentAI <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">Tuteur d'Anglais</span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Conversation vocale en direct avec correction pédagogique
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Status indicator */}
            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 border ${
              connectionState === 'connected'
                ? (isMicEnabled ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700' : 'bg-amber-950/80 text-amber-400 border-amber-700')
                : connectionState === 'connecting' ? 'bg-amber-950/80 text-amber-400 border-amber-700'
                : connectionState === 'error' ? 'bg-rose-950/80 text-rose-400 border-rose-700'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                connectionState === 'connected'
                  ? (isMicEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400')
                  : connectionState === 'connecting' ? 'bg-amber-400 animate-bounce'
                  : connectionState === 'error' ? 'bg-rose-400'
                  : 'bg-slate-500'
              }`}></span>
              <span>
                {connectionState === 'connected'
                  ? (isMicEnabled ? 'En direct (Vocal)' : 'En direct (Texte)')
                  : connectionState === 'connecting' ? 'Connexion en cours...'
                  : connectionState === 'error' ? 'Erreur de connexion'
                  : 'Prêt à démarrer'}
              </span>
            </div>

            {/* Clear Conversation button */}
            {transcripts.length > 0 && (
              <button
                type="button"
                onClick={clearConversation}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors border border-slate-700/60"
                title="Effacer l'historique"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* ============================================================== */}
        {/* SECTION 1 DIRECTE : CHOIX MANUEL DU NIVEAU DE DIFFICULTÉ */}
        {/* ============================================================== */}
        <section className="px-5 py-3 bg-slate-950/70 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                1. Choisissez votre niveau de difficulté :
              </span>
            </div>
            <span className="text-xs text-indigo-300 font-semibold hidden sm:inline">
              Niveau actuel : <strong className="text-white font-extrabold">{learnerProfile.level} ({LEVELS.find(l => l.id === learnerProfile.level)?.label})</strong>
            </span>
          </div>

          {/* 6 Direct Visible Buttons for each Level */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {LEVELS.map(lvl => {
              const isSelected = learnerProfile.level === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => handleLevelSelect(lvl.id)}
                  className={`py-2 px-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/50'
                      : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/80 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-black">{lvl.id}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className="text-[11px] font-semibold mt-0.5 truncate max-w-full">
                    {lvl.label}
                  </span>
                  <span className="text-[9px] text-slate-400 hidden md:block mt-0.5 opacity-80 truncate max-w-full">
                    {lvl.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ============================================================== */}
        {/* SECTION 2 DIRECTE : OBJECTIFS DU COURS (LES 6 PILIERS + DOCUMENT) */}
        {/* ============================================================== */}
        <section className="px-5 py-3 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                2. Choisissez l'objectif de la séance :
              </span>
            </div>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Le professeur oriente la discussion sur ce thème
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {PILLARS.map(p => {
              const isSelected = learnerProfile.activePillar === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePillarSelect(p.id, p.prompt)}
                  className={`p-2 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30 ring-2 ring-purple-400/40'
                      : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/80 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="shrink-0">{p.icon}</span>
                    <span className="text-xs font-bold truncate">{p.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 line-clamp-1 opacity-80">
                    {p.desc}
                  </span>
                </button>
              );
            })}

            {/* Document Mode Button */}
            <button
              type="button"
              onClick={() => setShowDocumentDrawer(true)}
              className={`p-2 rounded-xl border text-left transition-all flex flex-col justify-between ${
                activeDocument
                  ? 'bg-amber-600/90 border-amber-400 text-white shadow-md'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/80 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-xs font-bold truncate">Document</span>
              </div>
              <span className="text-[10px] text-slate-400 line-clamp-1 opacity-80">
                {activeDocument ? activeDocument.name : '+ Charger fichier'}
              </span>
            </button>
          </div>
        </section>

        {/* ============================================================== */}
        {/* SECTION 3 DIRECTE : CONFIGURATION DU PROFESSEUR (VOIX, RECHERCHE, AMBIANCE, MÉMOIRE) */}
        {/* ============================================================== */}
        <section className="px-5 py-3 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Voice Selector directly visible */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">Voix Google :</span>
            <select
              value={selectedVoice.id}
              onChange={(e) => {
                const found = VOICES.find(v => v.id === e.target.value);
                if (found) setSelectedVoice(found);
              }}
              className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 font-semibold"
            >
              {VOICES.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.tone})
                </option>
              ))}
            </select>
          </div>

          {/* Web Search direct toggle button */}
          <button
            type="button"
            onClick={() => setWebSearchEnabled(!webSearchEnabled)}
            className={`px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-colors ${
              webSearchEnabled
                ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Recherche Web : {webSearchEnabled ? 'Activée' : 'Désactivée'}</span>
          </button>

          {/* Ambience options directly visible */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-400 mr-1">Ambiance :</span>
            {AMBIENCES.map(amb => (
              <button
                key={amb.id}
                type="button"
                onClick={() => setSelectedAmbience(amb)}
                className={`px-2.5 py-1 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors ${
                  selectedAmbience.id === amb.id
                    ? 'bg-slate-700 border-indigo-400 text-white'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <span>{amb.icon}</span>
                <span>{amb.name}</span>
              </button>
            ))}
          </div>

          {/* Memory Modal Direct Button */}
          <button
            type="button"
            onClick={() => setShowMemoryModal(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-semibold text-indigo-300 flex items-center gap-1.5 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Carnet Mémoire ({learnerProfile.weakPoints.length + learnerProfile.vocabularyNotebook.length} notes)</span>
          </button>
        </section>

        {/* ============================================================== */}
        {/* VISUALIZER & MOUTH PHONETICS STAGE */}
        {/* ============================================================== */}
        <div className="relative bg-gradient-to-b from-slate-950 to-slate-900 h-28 border-b border-slate-800/80 flex items-center justify-center overflow-hidden">
          
          {/* Wave visualizer */}
          <div className="absolute inset-0">
            <Visualizer 
              isActive={connectionState === 'connected'} 
              volume={volume}
              state={visualizerState}
            />
          </div>

          {/* Real-time Mouth placement diagram when called */}
          {currentVisualCue && (
            <div className="relative z-20 mx-auto animate-in fade-in zoom-in duration-300">
              <MouthDiagram sound={currentVisualCue} />
            </div>
          )}

          {/* Retry microphone warning */}
          {connectionState === 'connected' && !isMicEnabled && (
            <div className="z-20 bg-slate-950/80 px-4 py-2 rounded-2xl border border-amber-800 flex items-center gap-3">
              <span className="text-xs text-amber-300">
                {micError || "Microphone non accessible."}
              </span>
              <button
                type="button"
                onClick={() => connect({
                  useSearch: webSearchEnabled,
                  voiceName: selectedVoice.id,
                  learnerProfile: learnerProfile,
                  activeDocumentText: activeDocument?.content
                })}
                className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Réessayer micro
              </button>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* CONVERSATION TRANSCRIPT AREA */}
        {/* ============================================================== */}
        <main ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-950/50 scroll-smooth">
          {transcripts.length === 0 && (
            <div className="text-center text-slate-500 text-xs py-10 max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-3xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
                <Mic className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-300 text-sm">
                {connectionState === 'connected'
                  ? (isMicEnabled ? "Le professeur vous écoute ! Parlez librement en anglais ou en français." : "Saisissez votre texte ci-dessous.")
                  : "Séance prête ! Cliquez sur 'Démarrer le cours' ci-dessous."}
              </p>
              <p className="text-slate-400 leading-relaxed text-xs">
                Niveau : <strong className="text-indigo-400">{learnerProfile.level}</strong> • Objectif : <strong className="text-purple-400">{PILLARS.find(p => p.id === learnerProfile.activePillar)?.label}</strong> • Voix : <strong className="text-slate-200">{selectedVoice.name}</strong>
              </p>
            </div>
          )}

          {transcripts.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none shadow-md' 
                  : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/80 shadow-sm'
              }`}>
                {msg.text}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 px-1">
                {msg.role === 'user' ? 'Vous' : `Professeur (${selectedVoice.name.split(' ')[0]})`}
              </span>
            </div>
          ))}
        </main>

        {/* ============================================================== */}
        {/* BOTTOM ACTION BAR: CHAT INPUT & START/STOP SESSION */}
        {/* ============================================================== */}
        <footer className="p-4 bg-slate-900 border-t border-slate-800 z-10 flex flex-col gap-3">
          
          {error && (
            <div className="p-2.5 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs text-center">
              {error}
            </div>
          )}

          {/* Chat text & attachment input */}
          <div className={`flex items-end gap-2 transition-opacity duration-200 ${connectionState === 'connected' ? 'opacity-100' : 'opacity-60 pointer-events-none'}`}>
            
            {/* Image upload button */}
            <button 
               type="button"
               onClick={() => fileInputRef.current?.click()}
               className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors border border-slate-700 shrink-0"
               title="Envoyer une photo / image"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleImageUpload}
            />

            {/* Document button */}
            <button 
               type="button"
               onClick={() => setShowDocumentDrawer(true)}
               className={`p-3 rounded-xl transition-colors border shrink-0 ${
                 activeDocument 
                   ? 'bg-amber-950/70 text-amber-300 border-amber-800' 
                   : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700'
               }`}
               title="Charger un document d'étude"
            >
              <FileText className="w-4 h-4" />
            </button>

            {/* Text input */}
            <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-700 flex flex-col overflow-hidden">
              {selectedImage && (
                <div className="p-2 border-b border-slate-800 flex justify-between items-center bg-slate-900/60">
                   <div className="h-10 w-10 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${selectedImage})` }}></div>
                   <button 
                     type="button"
                     onClick={() => setSelectedImage(null)} 
                     className="text-slate-400 hover:text-rose-400 text-xs font-semibold"
                   >
                     Supprimer
                   </button>
                </div>
              )}
              <div className="flex items-center">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={connectionState === 'connected' ? "Écrivez en anglais ou en français..." : "Connectez-vous pour parler ou écrire"}
                  className="flex-1 bg-transparent border-none text-xs sm:text-sm text-white px-3 py-3 focus:ring-0 placeholder-slate-500 focus:outline-none"
                  disabled={connectionState !== 'connected'}
                />
                <button 
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!textInput.trim() && !selectedImage}
                  className="p-2.5 text-indigo-400 hover:text-indigo-300 disabled:opacity-30 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggle}
              className={`flex-1 py-3 px-5 rounded-2xl font-black text-sm transition-all duration-200 shadow-xl flex items-center justify-center gap-2 ${
                connectionState === 'connected' || connectionState === 'connecting'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {connectionState === 'connected' || connectionState === 'connecting' ? (
                <>
                  <MicOff className="w-5 h-5" /> Terminer la séance
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" /> Démarrer le cours ({selectedVoice.name.split(' ')[0]} • Niveau {learnerProfile.level})
                </>
              )}
            </button>

            {/* Quick Idiom Button */}
            <button
              type="button"
              onClick={() => sendTextMessage("Teach me an authentic British idiom or slang phrase. Explain the cultural backstory, show me an example, and ask me to use it in my reply.")}
              disabled={connectionState !== 'connected'}
              className={`p-3 rounded-2xl border transition-all ${
                 connectionState === 'connected'
                  ? 'bg-purple-950/40 border-purple-800 text-purple-300 hover:bg-purple-900/40' 
                  : 'bg-slate-800/60 border-slate-700 text-slate-600 cursor-not-allowed'
              }`}
              title="Apprendre une expression authentique"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </div>

        </footer>

      </div>
    </div>
  );
};

export default App;
