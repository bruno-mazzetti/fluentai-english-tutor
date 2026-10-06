import React from 'react';

interface MouthDiagramProps {
  sound: string;
}

export const MouthDiagram: React.FC<MouthDiagramProps> = ({ sound }) => {
  // Common styles
  const strokeColor = "#e2e8f0"; // slate-200
  const tongueColor = "#f87171"; // red-400
  const lipColor = "#fca5a5"; // red-300

  const getTips = (s: string) => {
    switch (s) {
      case 'th':
        return {
          mistake: "Substituting with 'F', 'V', or 'D' sounds.",
          fix: "Stick tongue tip visibly between your teeth and blow air."
        };
      case 'f_v':
        return {
          mistake: "Using both lips (like P/B) or biting too hard.",
          fix: "Rest top teeth gently on bottom lip. Don't stop the air completely."
        };
      case 'r':
        return {
          mistake: "Touching the roof of the mouth or trilling.",
          fix: "Pull tongue back like a spoon. Sides touch upper molars. Tip floats."
        };
      case 'l':
        return {
          mistake: "Tongue too flat or touching lips.",
          fix: "Press tongue tip firmly against the ridge behind upper front teeth."
        };
      case 'w':
        return {
          mistake: "Relaxed or flat lips.",
          fix: "Round lips very tightly, like a small circle or whistling."
        };
      default:
        return { mistake: "", fix: "" };
    }
  };

  const { mistake, fix } = getTips(sound);

  const renderDiagram = () => {
    switch (sound) {
      case 'th':
        return (
          <g>
            <text x="50" y="90" textAnchor="middle" fill="white" fontSize="10" className="uppercase tracking-widest font-light">Tongue between teeth</text>
            {/* Upper Lip/Teeth */}
            <path d="M30 40 Q50 35 70 40" stroke={lipColor} strokeWidth="3" fill="none" />
            <path d="M35 40 L35 50 M45 40 L45 52 M55 40 L55 52 M65 40 L65 50" stroke="white" strokeWidth="2" />
            {/* Tongue sticking out */}
            <path d="M40 55 Q50 65 60 55" fill={tongueColor} opacity="0.9" />
            {/* Lower Lip/Teeth */}
            <path d="M30 60 Q50 65 70 60" stroke={lipColor} strokeWidth="3" fill="none" />
          </g>
        );
      case 'f_v':
        return (
          <g>
            <text x="50" y="90" textAnchor="middle" fill="white" fontSize="10" className="uppercase tracking-widest font-light">Teeth on lip</text>
            {/* Upper Lip/Teeth */}
            <path d="M30 35 Q50 30 70 35" stroke={lipColor} strokeWidth="3" fill="none" />
            <path d="M35 35 L38 50 M45 35 L47 52 M55 35 L53 52 M65 35 L62 50" stroke="white" strokeWidth="2" />
            {/* Lower Lip tucked under */}
            <path d="M35 50 Q50 58 65 50" stroke={lipColor} strokeWidth="4" fill="none" />
          </g>
        );
      case 'r':
        return (
          <g>
            <text x="50" y="90" textAnchor="middle" fill="white" fontSize="10" className="uppercase tracking-widest font-light">Tongue curled back</text>
            {/* Side view schematic */}
            {/* Roof of mouth */}
            <path d="M20 40 Q50 10 80 40" stroke={strokeColor} strokeWidth="2" fill="none" />
            {/* Tongue curled back */}
            <path d="M30 70 Q40 60 45 50 Q55 35 60 45" stroke={tongueColor} strokeWidth="8" strokeLinecap="round" fill="none" />
            <circle cx="60" cy="45" r="2" fill="white" opacity="0.5" />
          </g>
        );
      case 'l':
        return (
          <g>
             <text x="50" y="90" textAnchor="middle" fill="white" fontSize="10" className="uppercase tracking-widest font-light">Tip behind teeth</text>
            {/* Side view schematic */}
             {/* Roof of mouth/Teeth */}
             <path d="M20 40 L40 40 L40 50" stroke={strokeColor} strokeWidth="2" fill="none" />
             <rect x="38" y="40" width="4" height="10" fill="white" />
             {/* Tongue touching ridge */}
             <path d="M30 70 Q45 60 42 50" stroke={tongueColor} strokeWidth="8" strokeLinecap="round" fill="none" />
          </g>
        );
      case 'w':
        return (
          <g>
            <text x="50" y="90" textAnchor="middle" fill="white" fontSize="10" className="uppercase tracking-widest font-light">Lips rounded</text>
            {/* O shape */}
            <circle cx="50" cy="50" r="15" stroke={lipColor} strokeWidth="4" fill="#333" />
            <circle cx="50" cy="50" r="5" fill="#111" />
          </g>
        );
      default:
        return (
             <text x="50" y="50" textAnchor="middle" fill="white" fontSize="10">Correct Placement</text>
        );
    }
  };

  return (
    <div className="animate-fade-in bg-slate-800/95 border border-slate-600 rounded-xl p-3 shadow-xl backdrop-blur-md flex flex-row items-center gap-4 max-w-sm mx-4">
      <div className="w-24 h-24 shrink-0 bg-slate-900/50 rounded-lg p-1 border border-slate-700/50">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
          {renderDiagram()}
        </svg>
      </div>
      
      <div className="flex flex-col gap-2.5 flex-1 min-w-[160px]">
         <div className="text-left">
            <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Common Mistake
            </p>
            <p className="text-xs text-slate-300 leading-snug">{mistake}</p>
         </div>
         <div className="text-left">
            <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Correction
            </p>
            <p className="text-xs text-slate-300 leading-snug">{fix}</p>
         </div>
      </div>
    </div>
  );
};
