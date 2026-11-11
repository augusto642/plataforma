'use client';

import React, { useRef } from 'react';
import dynamic from 'next/dynamic';
import { loader } from '@monaco-editor/react';
import { IdeEditorSkeleton } from './IdeEditorSkeleton';

// Central 216 r3 (Q-2) — Monaco LOCAL: o loader padrão do
// @monaco-editor/react busca `loader.js` no CDN jsdelivr, bloqueado
// pelo CSP (`script-src 'self'`) — o editor ficava em "Loading..."
// para sempre. Os arquivos do `monaco-editor` instalado (0.56.0)
// são copiados para `public/monaco/vs` pelo script
// `scripts/copy-monaco-vs.cjs` (invocado em `next.config.js`) e o
// loader é apontado para lá. `loader.config` é puro (só valida e
// guarda estado), seguro em escopo de módulo inclusive no SSR.
// Tem que rodar antes de qualquer `Editor` montar: escopo de módulo,
// não useEffect (efeitos do filho rodam antes dos do pai).
loader.config({ paths: { vs: '/monaco/vs' } });

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
  /**
   * Central 219 lote 4 (D14) — esconde a chrome bar interna do editor
   * (arquivo + "Executar Código"). Usar quando o painel que hospeda o
   * editor já tem a sua própria chrome bar (ex.: a sessão de
   * entrevista, com "debounce.js • Live Coding com IA" + "Testar
   * implementação", que executa o mesmo teste): duas barras empilhadas
   * são duplicação visual. O atalho Ctrl/Cmd+Enter continua ativo.
   */
  hideChromeBar?: boolean;
}

export const IdeEditorPane: React.FC<IdeEditorPaneProps> = ({
  language,
  code,
  onChange,
  onRun,
  isSubmitting,
  onFormat,
  hideChromeBar = false,
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
      {/* Editor Toolbar — omitida com hideChromeBar (D14). */}
      {!hideChromeBar && (
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
      )}

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
