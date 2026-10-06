import React, { useState } from 'react';
import { 
  LearnerProfile, 
  CEFRLevel, 
  saveLearnerProfile, 
  DEFAULT_LEARNER_PROFILE 
} from '../utils/learnerMemory';
import { sanitizeString } from '../utils/documentParser';
import { 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  X, 
  Sparkles, 
  Award,
  RefreshCw
} from 'lucide-react';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: LearnerProfile;
  onProfileUpdate: (updated: LearnerProfile) => void;
}

const CEFR_LEVELS: { level: CEFRLevel; title: string; desc: string }[] = [
  { level: 'A1', title: 'Beginner', desc: 'Basic everyday expressions and phrases' },
  { level: 'A2', title: 'Elementary', desc: 'Routine tasks and simple direct exchanges' },
  { level: 'B1', title: 'Intermediate', desc: 'Main points on familiar matters, work, travel' },
  { level: 'B2', title: 'Upper-Intermediate', desc: 'Complex texts, spontaneous interaction' },
  { level: 'C1', title: 'Advanced', desc: 'Fluent, flexible use for social & academic goals' },
  { level: 'C2', title: 'Mastery', desc: 'Effortless nuance and native-like command' },
];

export const MemoryModal: React.FC<MemoryModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'weaknesses' | 'notebook' | 'history'>('profile');
  const [newWord, setNewWord] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newExample, setNewExample] = useState('');
  const [showAddWord, setShowAddWord] = useState(false);

  const [newWeakDesc, setNewWeakDesc] = useState('');
  const [newWeakCategory, setNewWeakCategory] = useState<'grammar' | 'pronunciation' | 'vocabulary' | 'conjugation'>('grammar');
  const [showAddWeak, setShowAddWeak] = useState(false);

  if (!isOpen) return null;

  const handleLevelChange = (lvl: CEFRLevel) => {
    const updated: LearnerProfile = { ...profile, level: lvl };
    onProfileUpdate(updated);
    saveLearnerProfile(updated);
  };

  const handleAccentChange = (accent: 'British' | 'American' | 'International') => {
    const updated: LearnerProfile = { ...profile, targetAccent: accent };
    onProfileUpdate(updated);
    saveLearnerProfile(updated);
  };

  const handleDeleteWeakness = (id: string) => {
    const updated: LearnerProfile = {
      ...profile,
      weakPoints: profile.weakPoints.filter(w => w.id !== id)
    };
    onProfileUpdate(updated);
    saveLearnerProfile(updated);
  };

  const handleAddWeakness = () => {
    const cleanDesc = sanitizeString(newWeakDesc, 200);
    if (!cleanDesc) return;
    const updated: LearnerProfile = {
      ...profile,
      weakPoints: [
        ...profile.weakPoints,
        {
          id: 'wp-' + Date.now(),
          category: newWeakCategory,
          description: cleanDesc,
        }
      ].slice(0, 50)
    };
    onProfileUpdate(updated);
    saveLearnerProfile(updated);
    setNewWeakDesc('');
    setShowAddWeak(false);
  };

  const handleDeleteWord = (id: string) => {
    const updated: LearnerProfile = {
      ...profile,
      vocabularyNotebook: profile.vocabularyNotebook.filter(w => w.id !== id)
    };
    onProfileUpdate(updated);
    saveLearnerProfile(updated);
  };

  const handleAddWord = () => {
    const cleanWord = sanitizeString(newWord, 100);
    const cleanMeaning = sanitizeString(newMeaning, 250);
    const cleanExample = sanitizeString(newExample, 300);
    if (!cleanWord) return;
    const updated: LearnerProfile = {
      ...profile,
      vocabularyNotebook: [
        ...profile.vocabularyNotebook,
        {
          id: 'w-' + Date.now(),
          word: cleanWord,
          translationOrMeaning: cleanMeaning || 'Expression personnalisée',
          exampleSentence: cleanExample || undefined,
          dateAdded: new Date().toISOString().split('T')[0]
        }
      ].slice(0, 200)
    };
    onProfileUpdate(updated);
    saveLearnerProfile(updated);
    setNewWord('');
    setNewMeaning('');
    setNewExample('');
    setShowAddWord(false);
  };

  const handleResetProfile = () => {
    if (confirm("Reset learning memory to defaults? This will clear customized notes.")) {
      const reset = { ...DEFAULT_LEARNER_PROFILE };
      onProfileUpdate(reset);
      saveLearnerProfile(reset);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Tutor Memory & Learning Profile
              </h2>
              <p className="text-xs text-slate-400">
                Persistent insights remembered across all your sessions
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-3 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" /> CEFR Level
          </button>
          <button
            onClick={() => setActiveTab('weaknesses')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'weaknesses'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Weak Points ({profile.weakPoints.length})
          </button>
          <button
            onClick={() => setActiveTab('notebook')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'notebook'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Vocab Notebook ({profile.vocabularyNotebook.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Progress Notes
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-sm text-slate-300">
          
          {/* PROFILE / CEFR TAB */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Target CEFR Level
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CEFR_LEVELS.map(lvl => (
                    <button
                      key={lvl.level}
                      onClick={() => handleLevelChange(lvl.level)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        profile.level === lvl.level
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                          : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base font-extrabold text-indigo-400">{lvl.level}</span>
                        {profile.level === lvl.level && (
                          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                        )}
                      </div>
                      <div className="font-semibold text-xs mt-1 text-white">{lvl.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{lvl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Target English Style & Accent
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['British', 'American', 'International'] as const).map(accent => (
                    <button
                      key={accent}
                      onClick={() => handleAccentChange(accent)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                        profile.targetAccent === accent
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {accent === 'British' ? '🇬🇧 British RP' : accent === 'American' ? '🇺🇸 American' : '🌐 International'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-slate-800/50 rounded-2xl border border-slate-700/60 space-y-1.5 text-xs">
                <span className="font-bold text-slate-200">How memory guides your tutor:</span>
                <p className="text-slate-400 leading-relaxed">
                  Your tutor adjusts sentence complexity, speech tempo, and grammatical expectations according to your level ({profile.level}) and tracks your target accent ({profile.targetAccent}).
                </p>
              </div>
            </div>
          )}

          {/* WEAK POINTS TAB */}
          {activeTab === 'weaknesses' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Recurring Mistakes & Phonetic Hurdles
                  </h3>
                  <p className="text-[11px] text-slate-400">The tutor actively spots and corrects these during live conversations.</p>
                </div>
                <button
                  onClick={() => setShowAddWeak(!showAddWeak)}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {showAddWeak && (
                <div className="p-3 bg-slate-800 rounded-xl border border-indigo-500/50 space-y-2.5">
                  <div className="flex gap-2">
                    <select
                      value={newWeakCategory}
                      onChange={(e) => setNewWeakCategory(e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 rounded-lg text-xs px-2 py-1.5 text-slate-200"
                    >
                      <option value="grammar">Grammar</option>
                      <option value="pronunciation">Pronunciation</option>
                      <option value="conjugation">Conjugation</option>
                      <option value="vocabulary">Vocabulary</option>
                    </select>
                    <input
                      type="text"
                      placeholder="e.g. Confusing 'since' and 'for'"
                      value={newWeakDesc}
                      onChange={(e) => setNewWeakDesc(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg text-xs px-2.5 py-1.5 text-slate-200"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowAddWeak(false)}
                      className="text-xs text-slate-400 hover:text-white px-2 py-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddWeakness}
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-md font-semibold"
                    >
                      Save Weakness
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {profile.weakPoints.length === 0 ? (
                  <p className="text-center text-slate-500 text-xs italic py-6">No weaknesses recorded yet.</p>
                ) : (
                  profile.weakPoints.map(wp => (
                    <div 
                      key={wp.id} 
                      className="p-3 bg-slate-800/70 border border-slate-700/60 rounded-xl flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                            {wp.category}
                          </span>
                          <span className="font-semibold text-white text-xs">{wp.description}</span>
                        </div>
                        {wp.exampleError && (
                          <div className="text-[11px] text-red-400/90 font-mono">
                            ✕ Error: {wp.exampleError}
                          </div>
                        )}
                        {wp.correction && (
                          <div className="text-[11px] text-emerald-400/90 font-mono">
                            ✓ Remedy: {wp.correction}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteWeakness(wp.id)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* VOCABULARY NOTEBOOK TAB */}
          {activeTab === 'notebook' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Vocabulary & Idiom Notebook
                  </h3>
                  <p className="text-[11px] text-slate-400">Words learned during discussions or saved by your tutor.</p>
                </div>
                <button
                  onClick={() => setShowAddWord(!showAddWord)}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Word
                </button>
              </div>

              {showAddWord && (
                <div className="p-3 bg-slate-800 rounded-xl border border-indigo-500/50 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Word or Idiom"
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg text-xs px-2.5 py-1.5 text-slate-200"
                    />
                    <input
                      type="text"
                      placeholder="Meaning or French translation"
                      value={newMeaning}
                      onChange={(e) => setNewMeaning(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg text-xs px-2.5 py-1.5 text-slate-200"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Example sentence (optional)"
                    value={newExample}
                    onChange={(e) => setNewExample(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg text-xs px-2.5 py-1.5 text-slate-200"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowAddWord(false)}
                      className="text-xs text-slate-400 hover:text-white px-2 py-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddWord}
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-md font-semibold"
                    >
                      Add to Notebook
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {profile.vocabularyNotebook.length === 0 ? (
                  <p className="text-center text-slate-500 text-xs italic py-6">Your notebook is currently empty.</p>
                ) : (
                  profile.vocabularyNotebook.map(item => (
                    <div 
                      key={item.id}
                      className="p-3 bg-slate-800/70 border border-slate-700/60 rounded-xl flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{item.word}</span>
                          <span className="text-xs text-indigo-400 font-medium">({item.translationOrMeaning})</span>
                        </div>
                        {item.exampleSentence && (
                          <p className="text-xs text-slate-400 italic mt-1 font-serif">
                            "{item.exampleSentence}"
                          </p>
                        )}
                        <span className="text-[10px] text-slate-500 block mt-1">Added: {item.dateAdded}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteWord(item.id)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* PROGRESS NOTES & SUMMARY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Last Session Takeaways
                </h3>
                <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs text-slate-300 leading-relaxed">
                  {profile.lastSessionSummary || "No session summary saved yet. Practice a session to generate insights!"}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Mastered Topics
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.completedTopics.map((topic, i) => (
                    <span 
                      key={i} 
                      className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 rounded-lg text-xs font-medium flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                <span className="text-[11px] text-slate-500">
                  Last updated: {new Date(profile.lastUpdated).toLocaleDateString()}
                </span>
                <button
                  onClick={handleResetProfile}
                  className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Reset Profile
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors shadow-lg"
          >
            Apply to Active Tutor
          </button>
        </div>

      </div>
    </div>
  );
};
