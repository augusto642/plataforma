'use client';

import React, { useEffect, useRef, useState } from 'react';
import { IdeEditorPane } from './IdeEditorPane';
import { TerminalConsole } from './TerminalConsole';
import { PlaygroundProjects } from './PlaygroundProjects';
import { DraftSyncNotice } from './DraftSyncNotice';
import { executePlayground, readActivityDraft, saveActivityDraft, type PracticeResult } from '../practice';
import { usePlaygroundDraftSync } from '../useActivityDraftSync';

type Language = 'javascript' | 'python' | 'portugol';

const examples: Record<Language, string> = {
  javascript: 'console.log("Olá, Nexus!");\n',
  python: 'print("Olá, Nexus!")\n',
  portugol: 'programa {\n  funcao inicio() {\n    escreva("Olá, Nexus!")\n  }\n}\n',
};

export function Playground({ userId }: { userId: string }) {
  const [language, setLanguage] = useState<Language>('javascript');
  const [mode, setMode] = useState<'single' | 'projects'>('single');
  const [code, setCode] = useState(examples.javascript);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftWarning, setDraftWarning] = useState(false);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const draftsRef = useRef<Record<string, string>>({});
  const sync = usePlaygroundDraftSync(userId, language, code, changeCode);

  useEffect(() => {
    const key = `${userId}:${language}`;
    try {
      setCode(draftsRef.current[key] ?? readActivityDraft(userId, `playground:${language}`) ?? examples[language]);
    } catch {
      setCode(draftsRef.current[key] ?? examples[language]);
      setDraftWarning(true);
    }
  }, [language, userId]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function changeCode(value: string) {
    setCode(value);
    draftsRef.current[`${userId}:${language}`] = value;
    try {
      saveActivityDraft(userId, `playground:${language}`, value);
      setDraftWarning(false);
    } catch {
      setDraftWarning(true);
    }
  }

  function changeLanguage(value: Language) {
    abortRef.current?.abort();
    setRunning(false);
    setResult(null);
    setError(null);
    try {
      setCode(draftsRef.current[`${userId}:${value}`] ?? readActivityDraft(userId, `playground:${value}`) ?? examples[value]);
    } catch {
      setCode(draftsRef.current[`${userId}:${value}`] ?? examples[value]);
      setDraftWarning(true);
    }
    setLanguage(value);
  }

  async function run() {
    if (running) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const response = await executePlayground(language, code, input, controller.signal);
      if (!controller.signal.aborted) setResult(response);
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Não foi possível executar o código.');
    } finally {
      if (!controller.signal.aborted) setRunning(false);
    }
  }

  return (
    <div className="flex-1 min-w-0 bg-[#090e0e] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-widest text-[#a1e5b7]">Playground</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#edf5ef]">Experimente suas ideias</h1>
        <p className="mt-2 text-sm text-[#a3b2ac]">Execute código sem enviar uma atividade para avaliação.</p>
        <div className="mt-4 flex gap-2">
          <button type="button" aria-pressed={mode === 'single'} className="rounded-lg border border-[#41534a] px-3 py-2 text-xs text-[#edf5ef]"
            onClick={() => setMode('single')}>Arquivo único</button>
          <button type="button" aria-pressed={mode === 'projects'} className="rounded-lg border border-[#41534a] px-3 py-2 text-xs text-[#edf5ef]"
            onClick={() => setMode('projects')}>Projetos e exemplos</button>
        </div>
        {mode === 'projects' ? <PlaygroundProjects userId={userId} /> :
        <div className="mt-5 overflow-hidden rounded-2xl border border-[#2a3935] bg-[#121b1a]">
          <div className="flex items-center gap-3 border-b border-[#2a3935] px-4 py-3">
            <label htmlFor="playground-language" className="text-xs text-[#a3b2ac]">Linguagem</label>
            <select id="playground-language" value={language} onChange={(event) => {
              const value = event.target.value;
              if (value === 'javascript' || value === 'python' || value === 'portugol') changeLanguage(value);
            }}
              className="rounded-lg border border-[#41534a] bg-[#1b2922] px-3 py-2 text-xs text-[#edf5ef]">
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="portugol">Portugol</option>
            </select>
          </div>
          <div className="h-[400px]">
            <IdeEditorPane language={language} code={code} onChange={changeCode} onRun={() => void run()}
              isSubmitting={false} isRunning={running} appearance="learning" />
          </div>
          <DraftSyncNotice sync={sync} />
          <div className="border-t border-[#2a3935] p-4">
            <label htmlFor="playground-input" className="block text-xs text-[#b1c2b7]">Entrada</label>
            <textarea id="playground-input" value={input} onChange={(event) => setInput(event.target.value)} maxLength={10000}
              className="mt-2 h-20 w-full rounded-lg border border-[#41534a] bg-[#0b1210] p-3 font-mono text-sm text-[#edf3ef]" />
            {draftWarning && <p role="status" className="mt-2 text-xs text-amber-300">Não foi possível salvar o rascunho nesta aba.</p>}
          </div>
          <div className="h-44">
            <TerminalConsole logs={running ? ['Executando código...'] : []} stdout={result?.stdout}
              stderr={error || result?.errorMessage || result?.stderr} durationMs={result?.durationMs} status={result?.status} />
          </div>
        </div>}
      </div>
    </div>
  );
}
