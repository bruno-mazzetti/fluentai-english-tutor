import React, { useState, useRef, useEffect } from 'react';
import { CEFRLevel } from '../utils/learnerMemory';
import { ChevronDown, Check, GraduationCap } from 'lucide-react';

interface LevelSelectorProps {
  currentLevel: CEFRLevel;
  onLevelSelect: (level: CEFRLevel) => void;
}

export const CEFR_DESCRIPTIONS: Record<CEFRLevel, { label: string; desc: string; badge: string }> = {
  A1: { label: 'Débutant', desc: 'Phrases très simples, vocabulaire de base, débit lent', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  A2: { label: 'Élémentaire', desc: 'Échanges courants de la vie quotidienne, questions simples', badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  B1: { label: 'Intermédiaire', desc: 'Conversation générale, travail, voyages, grammaire pratique', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  B2: { label: 'Avancé', desc: 'Aisance orale, sujets complexes, nuances et fluidité', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  C1: { label: 'Autonome', desc: 'Anglais professionnel et académique soutenu, subtilités', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  C2: { label: 'Bilingue', desc: 'Expression quasi-native, argot recherché et fluidité totale', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30' }
};

export const LevelSelector: React.FC<LevelSelectorProps> = ({ currentLevel, onLevelSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const info = CEFR_DESCRIPTIONS[currentLevel] || CEFR_DESCRIPTIONS.B1;

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 flex items-center gap-2 transition-all shadow-sm group"
        title="Changer mon niveau d'anglais"
      >
        <GraduationCap className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300" />
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-extrabold text-white">{currentLevel}</span>
          <span className="text-slate-400 hidden sm:inline">• {info.label}</span>
        </div>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-white' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-slate-900 border border-slate-700/90 shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-md">
          <div className="px-3 py-2 border-b border-slate-800 mb-1">
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              Choisir votre niveau
            </span>
            <span className="text-[11px] text-slate-400">
              Le professeur ajuste instantanément son débit et son vocabulaire.
            </span>
          </div>

          <div className="space-y-1">
            {(Object.keys(CEFR_DESCRIPTIONS) as CEFRLevel[]).map(lvl => {
              const item = CEFR_DESCRIPTIONS[lvl];
              const isSelected = lvl === currentLevel;
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    onLevelSelect(lvl);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-colors ${
                    isSelected 
                      ? 'bg-indigo-600/20 border border-indigo-500/50 text-white' 
                      : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-white">{lvl}</span>
                      <span className="text-xs font-semibold text-slate-200">{item.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug line-clamp-1">{item.desc}</p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
