'use client';

import React, { useRef } from 'react';
import dynamic from 'next/dynamic';
import { IdeEditorSkeleton } from './IdeEditorSkeleton';

// Carregamento dinâmico do Monaco com skeleton visual zero-CLS
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <IdeEditorSkeleton />,
});

interface IdeEditorPaneProps {
  language: string;
  code: string;
  onChange: (val: string) => void;
  onRun: () => void;
  isSubmitting: boolean;
  onFormat?: () => void;
}

export const IdeEditorPane: React.FC<IdeEditorPaneProps> = ({
  language,
  code,
  onChange,
  onRun,
  isSubmitting,
  onFormat,
}) => {
  const editorRef = useRef<any>(null);

  const fileExtensions: Record<string, string> = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    rust: 'rs',
    go: 'go',
    java: 'java',
  };

  const monacoLangs: Record<string, string> = {
    javascript: 'javascript',
    typescript: 'typescript',
    python: 'python',
    rust: 'rust',
    go: 'go',
    java: 'java',
  };

  return (
    <div className="flex flex-col h-full bg-[#070A13] border-l border-[#1E222D]">
      {/* Editor Toolbar */}
      <div className="h-11 px-4 bg-[#0D1017] border-b border-[#1E222D] flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-zinc-400">
            solution.{fileExtensions[language] || 'txt'}
          </span>
          {onFormat && (
            <button
              onClick={onFormat}
              className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white border border-[#232738] rounded hover:bg-[#151821] transition-colors"
            >
              Formatar Código
            </button>
          )}
        </div>

        <button
          onClick={onRun}
          disabled={isSubmitting}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
            isSubmitting
              ? 'bg-[#151821] border border-[#8257E5] text-zinc-400 cursor-not-allowed shadow-[0_0_20px_rgba(130,87,229,0.35)]'
              : 'bg-gradient-to-r from-[#04D361] to-[#00E5FF] text-black hover:opacity-95 shadow-[0_4px_14px_rgba(4,211,97,0.35)] cursor-pointer'
          }`}
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin text-[#996DFF]">⚡</span>
              <span>Executando no Sandbox...</span>
            </>
          ) : (
            <>
              <span>▶</span>
              <span>Executar Código</span>
              <kbd className="hidden sm:inline-block ml-1 text-[10px] bg-black/20 px-1 rounded text-black/70">
                ⌘↵
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Monaco Container */}
      <div className="flex-1 min-h-0 relative">
        <MonacoEditor
          height="100%"
          language={monacoLangs[language] || 'plaintext'}
          theme="vs-dark"
          value={code}
          onMount={(editor) => {
            editorRef.current = editor;
            // Atalho de execução ⌘+Enter / Ctrl+Enter (2048 = CtrlCmd, 3 = Enter)
            editor.addCommand(2048 | 3, () => onRun());
          }}
          onChange={(val) => onChange(val || '')}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            fontFamily: 'var(--font-mono), monospace',
            lineNumbersMinChars: 3,
            glyphMargin: false,
            folding: true,
          }}
        />
      </div>
    </div>
  );
};
