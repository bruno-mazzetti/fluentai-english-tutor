import React from 'react';
import { LearningPillar, LearnerProfile, saveLearnerProfile } from '../utils/learnerMemory';
import { 
  BookMarked, 
  Mic2, 
  Languages, 
  Clock, 
  Sparkles, 
  Compass,
  FileText
} from 'lucide-react';

interface LearningHubProps {
  profile: LearnerProfile;
  onProfileUpdate: (updated: LearnerProfile) => void;
  onSendPrompt: (prompt: string) => void;
  isConnected: boolean;
  hasDocument: boolean;
  onOpenDocumentModal: () => void;
}

interface PillarDef {
  id: LearningPillar;
  label: string;
  icon: React.ReactNode;
  samplePrompt: string;
  hint: string;
}

const PILLARS: PillarDef[] = [
  {
    id: 'general',
    label: 'Conversation',
    icon: <Compass className="w-3.5 h-3.5" />,
    samplePrompt: "Let's have a spontaneous dialogue about daily life, current affairs, or culture. Please correct my English naturally whenever I make a mistake.",
    hint: 'Échange libre avec corrections en temps réel'
  },
  {
    id: 'grammar',
    label: 'Grammaire',
    icon: <BookMarked className="w-3.5 h-3.5" />,
    samplePrompt: "Let's do an interactive grammar exercise suited for my level. Give me a sentence or a question to test my understanding, and explain the rule.",
    hint: 'Structures de phrases, propositions & règles clés'
  },
  {
    id: 'pronunciation',
    label: 'Prononciation',
    icon: <Mic2 className="w-3.5 h-3.5" />,
    samplePrompt: "Let's work on my pronunciation and British accent. Test me on difficult sounds like TH, R, L, or vowel length, and guide my mouth placement.",
    hint: 'Accent, sons difficiles & schémas articulatoires'
  },
  {
    id: 'vocabulary',
    label: 'Vocabulaire',
    icon: <Languages className="w-3.5 h-3.5" />,
    samplePrompt: "Teach me 3 useful English words or phrasal verbs adapted to my level. Explain their nuance and French false friends, then ask me to use them.",
    hint: 'Mots thématiques, faux-amis & nuances'
  },
  {
    id: 'conjugation',
    label: 'Conjugaison',
    icon: <Clock className="w-3.5 h-3.5" />,
    samplePrompt: "Let's practice verb tenses: test me on Past Simple vs Present Perfect or conditionals ('if I were...'). Ask me a question requiring this tense.",
    hint: 'Temps des verbes, verbes irréguliers & modaux'
  },
  {
    id: 'idioms',
    label: 'Expressions',
    icon: <Sparkles className="w-3.5 h-3.5" />,
    samplePrompt: "Teach me an authentic British idiom or modern slang expression. Explain its meaning and cultural background, and ask me to use it.",
    hint: 'Tournures idiomatiques & argot authentique'
  }
];

export const LearningHub: React.FC<LearningHubProps> = ({
  profile,
  onProfileUpdate,
  onSendPrompt,
  isConnected,
  hasDocument,
  onOpenDocumentModal
}) => {
  const activePillarDef = PILLARS.find(p => p.id === profile.activePillar) || PILLARS[0];

  const handleSelectPillar = (pillarId: LearningPillar, samplePrompt: string) => {
    const updated: LearnerProfile = { ...profile, activePillar: pillarId };
    onProfileUpdate(updated);
    saveLearnerProfile(updated);

    if (isConnected) {
      onSendPrompt(samplePrompt);
    }
  };

  return (
    <div className="space-y-1.5">
      {/* Sleek horizontal pill navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none px-1">
        {PILLARS.map(p => {
          const isActive = profile.activePillar === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handleSelectPillar(p.id, p.samplePrompt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-1 ring-indigo-400'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60'
              }`}
            >
              {p.icon}
              <span>{p.label}</span>
            </button>
          );
        })}

        {/* Document quick pill */}
        <button
          onClick={onOpenDocumentModal}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
            hasDocument
              ? 'bg-purple-900/60 text-purple-200 border border-purple-500/50'
              : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60'
          }`}
          title="Étudier un document"
        >
          <FileText className="w-3.5 h-3.5 text-purple-400" />
          <span>{hasDocument ? 'Document actif' : '+ Document'}</span>
        </button>
      </div>

      {/* Subtle contextual hint */}
      <div className="flex items-center justify-between px-2 text-[11px] text-slate-400">
        <span className="truncate">
          🎯 Mode actif : <strong className="text-slate-200">{activePillarDef.label}</strong> — {activePillarDef.hint}
        </span>
        {isConnected && (
          <button
            onClick={() => onSendPrompt(activePillarDef.samplePrompt)}
            className="text-indigo-400 hover:text-indigo-300 font-medium shrink-0 ml-2 underline"
          >
            Lancer un exercice
          </button>
        )}
      </div>
    </div>
  );
};
