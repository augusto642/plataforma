'use client';

import React, { useEffect, useRef, useState } from 'react';
import { API_BASE, apiFetch } from '../../../lib/apiClient';
import { type PracticeResult } from '../practice';
import { IdeEditorPane } from './IdeEditorPane';
import { TerminalConsole } from './TerminalConsole';

type Language = 'javascript' | 'python';
interface ProjectFile { name: string; content: string }
interface Project { id: string; title: string; language: Language; files: ProjectFile[]; revision: number }
interface ProjectSummary { id: string; title: string; language: Language }
interface Example { id: string; title: string; language: Language; files: ProjectFile[] }

const button = 'rounded-lg border border-[#41534a] px-3 py-2 text-xs text-[#edf5ef] hover:bg-[#26372e] disabled:opacity-50';
const input = 'rounded-lg border border-[#41534a] bg-[#0b1210] px-3 py-2 text-sm text-[#edf5ef]';

export function PlaygroundProjects({ userId }: { userId: string }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [examples, setExamples] = useState<Example[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [fileName, setFileName] = useState('');
  const [activeFile, setActiveFile] = useState('');
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [conflict, setConflict] = useState<Project | null>(null);
  const projectRef = useRef<Project | null>(null);
  const draftsRef = useRef<Record<string, Project>>({});
  const runAbort = useRef<AbortController | null>(null);
  projectRef.current = project;

  const key = (id: string) => `nexus-project-draft:${userId}:${id}`;
  function cacheDraft(value: Project) {
    draftsRef.current[value.id] = value;
    try {
      sessionStorage.setItem(key(value.id), JSON.stringify(value));
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  }
  function clearDraft(id: string) {
    delete draftsRef.current[id];
    try { sessionStorage.removeItem(key(id)); } catch { setStorageWarning(true); }
  }
  function edit(value: Project) {
    projectRef.current = value;
    setProject(value);
    setDirty(true);
    cacheDraft(value);
  }
  function getDraft(id: string): Project | null {
    if (draftsRef.current[id]) return draftsRef.current[id];
    try {
      const raw = sessionStorage.getItem(key(id));
      if (!raw) return null;
      const value: unknown = JSON.parse(raw);
      if (typeof value !== 'object' || value === null || !('id' in value) ||
          value.id !== id || !('revision' in value) || typeof value.revision !== 'number' ||
          !('title' in value) || typeof value.title !== 'string' ||
          !('language' in value) || (value.language !== 'python' && value.language !== 'javascript') ||
          !('files' in value) || !Array.isArray(value.files) ||
          !value.files.every((file: unknown) => typeof file === 'object' && file !== null &&
            'name' in file && typeof file.name === 'string' && 'content' in file && typeof file.content === 'string')) {
        throw new Error('Rascunho local inválido.');
      }
      return { id, revision: value.revision, title: value.title, language: value.language, files: value.files };
    } catch {
      setStorageWarning(true);
      return null;
    }
  }
  async function loadList() {
    const [list, samples] = await Promise.all([
      apiFetch(`${API_BASE}/playground-projects`),
      apiFetch(`${API_BASE}/playground-projects/examples`),
    ]);
    if (!list.ok || !samples.ok) throw new Error('Não foi possível carregar projetos e exemplos.');
    setProjects(await list.json());
    setExamples(await samples.json());
  }
  useEffect(() => {
    let active = true;
    void loadList().catch(() => { if (active) setError('Não foi possível carregar projetos e exemplos.'); });
    return () => { active = false; runAbort.current?.abort(); };
  }, []);

  async function open(id: string) {
    runAbort.current?.abort();
    setRunning(false);
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/playground-projects/${id}`);
      if (!res.ok) throw new Error('Não foi possível abrir o projeto.');
      const remote = await res.json() as Project;
      const local = getDraft(id);
      const next = local ?? remote;
      projectRef.current = next;
      setProject(next);
      setActiveFile(next.files[0]?.name ?? '');
      setDirty(!!local);
      setConflict(local && local.revision !== remote.revision ? remote : null);
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível abrir o projeto.');
    } finally { setBusy(false); }
  }
  async function create(example: Example) {
    runAbort.current?.abort();
    setRunning(false);
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/playground-projects`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: example.title, language: example.language, files: example.files }),
      });
      if (!res.ok) throw new Error('Não foi possível criar o projeto. Verifique o limite de 20 projetos.');
      const created = await res.json() as Project;
      projectRef.current = created;
      setProject(created);
      setActiveFile(created.files[0].name);
      setDirty(false);
      setConflict(null);
      setResult(null);
      await loadList().catch(() => setError('Projeto criado, mas não foi possível atualizar a lista.'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o projeto.');
    } finally { setBusy(false); }
  }
  async function save() {
    const snapshot = projectRef.current;
    if (!snapshot || busy || conflict) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/playground-projects/${snapshot.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: snapshot.title, language: snapshot.language, files: snapshot.files, revision: snapshot.revision }),
      });
      if (res.status === 409) {
        const latest = await apiFetch(`${API_BASE}/playground-projects/${snapshot.id}`);
        if (!latest.ok) throw new Error('Não foi possível carregar a versão mais recente.');
        setConflict(await latest.json() as Project);
        return;
      }
      if (!res.ok) throw new Error('Não foi possível salvar. Verifique o nome e os limites dos arquivos.');
      const saved = await res.json() as { revision: number };
      const current = projectRef.current;
      if (!current || current.id !== snapshot.id) return;
      const next = { ...current, revision: saved.revision };
      projectRef.current = next;
      setProject(next);
      const changed = current.title !== snapshot.title || JSON.stringify(current.files) !== JSON.stringify(snapshot.files);
      setDirty(changed);
      if (changed) cacheDraft(next); else clearDraft(next.id);
      await loadList().catch(() => setError('Projeto salvo, mas não foi possível atualizar a lista.'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o projeto.');
    } finally { setBusy(false); }
  }
  async function remove() {
    if (!project || busy || conflict || !window.confirm('Excluir este projeto e seus arquivos?')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/playground-projects/${project.id}?revision=${project.revision}`, { method: 'DELETE' });
      if (res.status === 409) throw new Error('O projeto mudou em outro dispositivo. Abra a versão mais recente antes de excluir.');
      if (!res.ok) throw new Error('Não foi possível excluir o projeto.');
      clearDraft(project.id);
      projectRef.current = null;
      setProject(null);
      setDirty(false);
      await loadList().catch(() => setError('Projeto excluído, mas não foi possível atualizar a lista.'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível excluir o projeto.');
    } finally { setBusy(false); }
  }
  async function run() {
    if (!project || running) return;
    const controller = new AbortController();
    runAbort.current = controller;
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/submissions/project-run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: project.language, files: project.files, stdin: inputText }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('Não foi possível executar. Verifique os arquivos e tente novamente.');
      const value = await res.json() as PracticeResult;
      if (!controller.signal.aborted) setResult(value);
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Não foi possível executar o projeto.');
    } finally { if (!controller.signal.aborted) setRunning(false); }
  }
  function addFile() {
    if (!project) return;
    const name = fileName.trim();
    const extension = project.language === 'python' ? '.py' : '.js';
    if (!/^(?!.*\.\.)[a-zA-Z0-9][a-zA-Z0-9_.-]{0,80}$/.test(name) ||
        !name.endsWith(extension) || project.files.some((file) => file.name === name) || project.files.length >= 10) {
      setError(`Use um nome único terminado em ${extension}; máximo de 10 arquivos.`);
      return;
    }
    edit({ ...project, files: [...project.files, { name, content: '' }] });
    setActiveFile(name);
    setFileName('');
    setError(null);
  }
  function resolveConflict(useRemote: boolean) {
    if (!project || !conflict) return;
    if (useRemote) {
      clearDraft(project.id);
      projectRef.current = conflict;
      setProject(conflict);
      setActiveFile(conflict.files[0].name);
      setDirty(false);
    } else {
      edit({ ...project, revision: conflict.revision });
    }
    setConflict(null);
  }

  const currentFile = project?.files.find((file) => file.name === activeFile);
  return <section className="mt-5 space-y-4">
    <div className="rounded-2xl border border-[#2a3935] bg-[#121b1a] p-4">
      <h2 className="text-sm font-bold text-[#edf5ef]">Meus projetos</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {projects.map((item) => <button key={item.id} type="button" className={button} disabled={busy}
          onClick={() => void open(item.id)}>{item.title} · {item.language}</button>)}
        {projects.length === 0 && <span className="text-xs text-[#a3b2ac]">Nenhum projeto salvo.</span>}
      </div>
      <h2 className="mt-5 text-sm font-bold text-[#edf5ef]">Criar a partir de um exemplo</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={button} disabled={busy} onClick={() => void create({
          id: 'new-js', title: 'Novo projeto JavaScript', language: 'javascript',
          files: [{ name: 'main.js', content: '' }],
        })}>Novo JavaScript</button>
        <button type="button" className={button} disabled={busy} onClick={() => void create({
          id: 'new-python', title: 'Novo projeto Python', language: 'python',
          files: [{ name: 'main.py', content: '' }],
        })}>Novo Python</button>
        {examples.map((example) => <button key={example.id} type="button" className={button} disabled={busy}
          onClick={() => void create(example)}>{example.title} · {example.language}</button>)}
      </div>
    </div>
    {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
    {storageWarning && <p role="status" className="text-xs text-amber-300">Não foi possível guardar a cópia local nesta aba.</p>}
    {project && <>
      {conflict && <div role="alert" className="rounded-lg border border-amber-500 p-3 text-xs text-amber-300">
        O projeto também foi alterado em outro dispositivo. Escolha qual versão manter:
        <div className="mt-2 flex gap-3">
          <button type="button" className="underline" onClick={() => resolveConflict(false)}>Manter esta aba</button>
          <button type="button" className="underline" onClick={() => resolveConflict(true)}>Usar versão salva</button>
        </div>
      </div>}
      <div className="overflow-hidden rounded-2xl border border-[#2a3935] bg-[#121b1a]">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <label htmlFor="project-title" className="text-xs text-[#a3b2ac]">Projeto</label>
          <input id="project-title" className={input} value={project.title} maxLength={80}
            onChange={(event) => edit({ ...project, title: event.target.value })} />
          <span className="text-xs text-[#a3b2ac]">{project.language} · {dirty ? 'Alterações não salvas' : 'Salvo'}</span>
          <button type="button" className={button} disabled={busy || !!conflict || !dirty} onClick={() => void save()}>Salvar projeto</button>
          <button type="button" className={button} disabled={busy || !!conflict} onClick={() => void remove()}>Excluir projeto</button>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-[#2a3935] p-3">
          {project.files.map((file) => <button type="button" key={file.name} className={button}
            aria-pressed={file.name === activeFile} onClick={() => setActiveFile(file.name)}>{file.name}</button>)}
          <input className={input} aria-label="Nome do arquivo" placeholder={project.language === 'python' ? 'arquivo.py' : 'arquivo.js'}
            value={fileName} onChange={(event) => setFileName(event.target.value)} />
          <button type="button" className={button} onClick={addFile}>Adicionar arquivo</button>
          {currentFile && currentFile.name !== (project.language === 'python' ? 'main.py' : 'main.js') &&
            <button type="button" className={button} onClick={() => {
              edit({ ...project, files: project.files.filter((file) => file.name !== activeFile) });
              setActiveFile(project.files[0].name);
            }}>Remover arquivo</button>}
        </div>
        <div className="h-[400px]">
          {currentFile && <IdeEditorPane language={project.language} fileName={currentFile.name} code={currentFile.content}
            onChange={(value) => edit({ ...project, files: project.files.map((file) =>
              file.name === activeFile ? { ...file, content: value } : file) })}
            onRun={() => void run()} isSubmitting={false} isRunning={running} appearance="learning" />}
        </div>
        <div className="border-t border-[#2a3935] p-4">
          <label htmlFor="project-input" className="block text-xs text-[#a3b2ac]">Entrada</label>
          <textarea id="project-input" className={`${input} mt-2 h-20 w-full font-mono`} maxLength={10000}
            value={inputText} onChange={(event) => setInputText(event.target.value)} />
        </div>
        <div className="h-44"><TerminalConsole logs={running ? ['Executando projeto...'] : []}
          stdout={result?.stdout} stderr={result?.errorMessage || result?.stderr}
          status={result?.status} durationMs={result?.durationMs} /></div>
      </div>
    </>}
  </section>;
}
