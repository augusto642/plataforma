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
  fileName?: string;
  code: string;
  onChange: (val: string) => void;
  onRun: () => void;
  isSubmitting: boolean;
  showFormat?: boolean;
  fontSize?: number;
  onChangeFontSize?: (size: 13 | 14 | 16) => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  /**
   * Central 219 lote 4 (D14) — esconde a chrome bar interna do editor
   * (arquivo + "Executar Código"). Usar quando o painel que hospeda o
   * editor já tem a sua própria chrome bar (ex.: a sessão de
   * entrevista, com "debounce.js • Live Coding com IA" + "Testar
   * implementação", que executa o mesmo teste): duas barras empilhadas
   * são duplicação visual. O atalho Ctrl/Cmd+Enter continua ativo.
   */
  hideChromeBar?: boolean;
  appearance?: 'default' | 'learning';
  onSubmit?: () => void;
  isRunning?: boolean;
}

export const IdeEditorPane: React.FC<IdeEditorPaneProps> = ({
  language,
  fileName,
  code,
  onChange,
  onRun,
  isSubmitting,
  showFormat = false,
  fontSize = 14,
  onChangeFontSize,
  isFocusMode = false,
  onToggleFocusMode,
  hideChromeBar = false,
  appearance = 'default',
  onSubmit,
  isRunning = false,
}) => {
  const editorRef = useRef<any>(null);
  const runRef = useRef(onRun);
  runRef.current = onRun;
  const learning = appearance === 'learning';

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
    <div className={`flex flex-col h-full ${learning ? 'bg-[#0d1513]' : 'bg-[#070A13] border-l border-[#1E222D]'}`}>
      {/* Editor Toolbar — omitida com hideChromeBar (D14). */}
      {!hideChromeBar && (
      <div className={`min-h-11 px-4 py-2 flex flex-wrap gap-2 items-center justify-between border-b ${learning ? 'bg-[#151f1c] border-[#2a3935]' : 'bg-[#0D1017] border-[#1E222D]'}`}>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-mono text-xs text-zinc-400">
            {fileName || `solution.${fileExtensions[language] || 'txt'}`}
          </span>
          {showFormat && (
            <button
              onClick={() => editorRef.current?.getAction('editor.action.formatDocument')?.run()}
              className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white border border-[#232738] rounded hover:bg-[#151821] transition-colors"
            >
              Formatar Código
            </button>
          )}
          {onChangeFontSize && (
            <div className="hidden sm:flex items-center gap-1 border border-[#232738] rounded px-1 py-0.5 bg-[#0A0E1B]">
              {([13, 14, 16] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => onChangeFontSize(sz)}
                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors ${
                    fontSize === sz
                      ? 'bg-[#8257E5] text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          )}
          {onToggleFocusMode && (
            <button
              type="button"
              onClick={onToggleFocusMode}
              className={`hidden lg:inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border transition-colors ${
                isFocusMode
                  ? 'border-[#8257E5]/60 bg-[#8257E5]/20 text-[#C4B5FD]'
                  : 'border-[#232738] text-zinc-400 hover:text-white hover:bg-[#151821]'
              }`}
            >
              {isFocusMode ? 'Mostrar Cursos' : 'Modo Foco'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
        <button
          onClick={onRun}
          disabled={isSubmitting || isRunning}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
            isSubmitting || isRunning
              ? 'bg-[#151821] border border-[#8257E5] text-zinc-400 cursor-not-allowed shadow-[0_0_20px_rgba(130,87,229,0.35)]'
              : learning
                ? 'bg-[#a1e5b7] text-[#10261a] hover:bg-[#c1f1cc]'
                : 'bg-gradient-to-r from-[#04D361] to-[#00E5FF] text-black hover:opacity-95 shadow-[0_4px_14px_rgba(4,211,97,0.35)] cursor-pointer'
          }`}
        >
          {isRunning || isSubmitting ? (
            <>
              <span className="animate-spin text-[#996DFF]">⚡</span>
              <span>{isRunning ? 'Executando...' : 'Enviando...'}</span>
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
        {onSubmit && (
          <button type="button" onClick={onSubmit} disabled={isSubmitting || isRunning}
            className="rounded-lg border border-[#769e82] px-4 py-1.5 text-xs font-bold text-[#dceae0] hover:bg-[#2a3c30] disabled:opacity-50">
            Enviar para avaliação
          </button>
        )}
        </div>
      </div>
      )}

      {/* Monaco Container */}
      <div className="flex-1 min-h-0 relative">
        <MonacoEditor
          height="100%"
          language={monacoLangs[language] || 'plaintext'}
          theme={learning ? 'dark-nexus-learning' : 'dark-obsidian'}
          value={code}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            monaco.editor.defineTheme('dark-obsidian', {
              base: 'vs-dark',
              inherit: true,
              rules: [
                { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
                { token: 'keyword', foreground: '00E5FF', fontStyle: 'bold' },
                { token: 'string', foreground: '04D361' },
                { token: 'number', foreground: 'FFA116' },
                { token: 'type', foreground: '8257E5' },
              ],
              colors: {
                'editor.background': '#070A13',
                'editor.foreground': '#F1F5F9',
                'editor.lineHighlightBackground': '#121624',
                'editorLineNumber.foreground': '#475569',
                'editorLineNumber.activeForeground': '#00E5FF',
                'editorCursor.foreground': '#00E5FF',
                'editor.selectionBackground': '#8257E540',
              },
            });
            monaco.editor.defineTheme('dark-nexus-learning', {
              base: 'vs-dark',
              inherit: true,
              rules: [
                { token: 'comment', foreground: '82998A', fontStyle: 'italic' },
                { token: 'keyword', foreground: '9ADDB3' },
                { token: 'string', foreground: 'D6DDA4' },
                { token: 'number', foreground: 'E4BF82' },
              ],
              colors: {
                'editor.background': '#0D1513',
                'editor.foreground': '#E0EDE3',
                'editor.lineHighlightBackground': '#18251F',
                'editorLineNumber.foreground': '#768A7F',
                'editorCursor.foreground': '#A1E5B7',
              },
            });
            monaco.editor.setTheme(learning ? 'dark-nexus-learning' : 'dark-obsidian');
            // Atalho de execução ⌘+Enter / Ctrl+Enter (2048 = CtrlCmd, 3 = Enter)
            editor.addCommand(2048 | 3, () => runRef.current());
          }}
          onChange={(val) => onChange(val || '')}
          options={{
            fontSize,
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
