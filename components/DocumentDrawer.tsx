import React, { useState, useRef } from 'react';
import { extractTextFromFile, ParsedDocument, createParsedDocument, MAX_DOCUMENT_CHARS, sanitizeString } from '../utils/documentParser';
import { 
  FileText, 
  Upload, 
  Trash2, 
  X, 
  HelpCircle, 
  BookMarked, 
  Sparkles,
  Clipboard,
  FileCheck
} from 'lucide-react';

interface DocumentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeDocument: ParsedDocument | null;
  onDocumentChange: (doc: ParsedDocument | null) => void;
  onSendDocumentPrompt: (prompt: string) => void;
  isConnected: boolean;
}

export const DocumentDrawer: React.FC<DocumentDrawerProps> = ({
  isOpen,
  onClose,
  activeDocument,
  onDocumentChange,
  onSendDocumentPrompt,
  isConnected
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedTitle, setPastedTitle] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const parsed = await extractTextFromFile(file);
      onDocumentChange(parsed);
      setPasteMode(false);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to process document");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSavePastedText = () => {
    const cleanContent = pastedText.trim().substring(0, MAX_DOCUMENT_CHARS);
    if (!cleanContent) return;
    const rawTitle = pastedTitle.trim() || 'Custom Learning Note';
    const cleanTitle = sanitizeString(rawTitle, 100) || 'Custom Learning Note';
    const doc = createParsedDocument(cleanTitle, 'text/plain', cleanContent.length, cleanContent);
    onDocumentChange(doc);
    setPastedText('');
    setPastedTitle('');
    setPasteMode(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Study Documents & Texts
              </h2>
              <p className="text-xs text-slate-400">
                Feed articles, course notes, CVs, or essays to your English tutor
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

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-sm text-slate-300">
          
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          {/* ACTIVE DOCUMENT CARD */}
          {activeDocument ? (
            <div className="space-y-4">
              <div className="p-4 bg-purple-950/20 border border-purple-800/50 rounded-2xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <FileCheck className="w-5 h-5 text-purple-400 shrink-0" />
                    <div>
                      <h3 className="font-bold text-white text-sm truncate max-w-[280px]">
                        {activeDocument.name}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span>{activeDocument.wordCount} words</span>
                        <span>•</span>
                        <span>{(activeDocument.charCount / 1000).toFixed(1)}k chars</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onDocumentChange(null)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Remove document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Excerpt preview */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-400 font-mono max-h-36 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                  {activeDocument.content.length > 500 
                    ? activeDocument.content.substring(0, 500) + '...' 
                    : activeDocument.content}
                </div>
              </div>

              {/* Quick Actions / Prompts */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Quick Tutor Workouts with this text:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onSendDocumentPrompt("Let's do a reading comprehension exercise based on my loaded document. Ask me 2 questions about the key points and give me feedback on my answers in English.");
                      onClose();
                    }}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-left text-xs transition-colors flex items-center gap-2 text-slate-200"
                  >
                    <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Quiz me on key ideas</span>
                  </button>

                  <button
                    onClick={() => {
                      onSendDocumentPrompt("Analyze the vocabulary in my loaded document. Pick 3-4 advanced words or phrasal verbs, explain them clearly, and ask me to use one in a sentence.");
                      onClose();
                    }}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-left text-xs transition-colors flex items-center gap-2 text-slate-200"
                  >
                    <BookMarked className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Explain difficult vocabulary</span>
                  </button>

                  <button
                    onClick={() => {
                      onSendDocumentPrompt("Review the English in my document for grammar, phrasing, and style. Highlight any mistakes or suggest more natural British idioms I could use.");
                      onClose();
                    }}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-left text-xs transition-colors flex items-center gap-2 text-slate-200"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Critique grammar & style</span>
                  </button>

                  <button
                    onClick={() => {
                      onSendDocumentPrompt("Let's have a spontaneous roleplay or discussion based on this document. Act as an interviewer or debate partner and ask me my perspective on this topic.");
                      onClose();
                    }}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-left text-xs transition-colors flex items-center gap-2 text-slate-200"
                  >
                    <Clipboard className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Roleplay / Interview debate</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {!pasteMode ? (
                <>
                  {/* Upload Drop Zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                      isDragging 
                        ? 'border-purple-500 bg-purple-950/20' 
                        : 'border-slate-700 hover:border-slate-600 bg-slate-800/40 hover:bg-slate-800/60'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".txt,.md,.markdown,.pdf,.csv,.json,.html"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">
                        {isLoading ? 'Processing document...' : 'Click to upload or drag & drop'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Supports text files (.txt, .md, .markdown), PDF articles, CVs, exercises
                      </p>
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">or</span>
                  </div>

                  {/* Paste Button */}
                  <button
                    onClick={() => setPasteMode(true)}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-2xl text-xs font-semibold text-slate-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Clipboard className="w-4 h-4 text-purple-400" />
                    Paste Text or Article Directly
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Paste Custom Text or Notes
                    </h3>
                    <button
                      onClick={() => setPasteMode(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Back to file upload
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Document Title (e.g., Financial Times Article, My Cover Letter)"
                    value={pastedTitle}
                    onChange={(e) => setPastedTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl text-xs px-3 py-2 text-slate-200"
                  />
                  <textarea
                    rows={6}
                    placeholder="Paste your English text or article here..."
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl text-xs p-3 text-slate-200 font-mono leading-relaxed"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setPasteMode(false)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePastedText}
                      disabled={!pastedText.trim()}
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Attach Text to Tutor
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-between items-center text-xs text-slate-400">
          <span>
            {activeDocument ? "✓ Document attached to active session context" : "No document attached"}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
