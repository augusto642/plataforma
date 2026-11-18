'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE, apiFetch } from '../../../lib/apiClient';

type Kind = 'job' | 'course' | 'book' | 'pdf';
interface Reference {
  id: string;
  kind: Kind;
  title: string;
  url: string;
  author: string | null;
  license: string | null;
  status: 'pending' | 'approved' | 'rejected';
  source: 'admin' | 'connector';
  createdAt: string;
}

interface CurationCandidate {
  id: string;
  status: 'pending' | 'published' | 'archived';
  reference: Reference;
  createdAt: string;
}

const kindLabels: Record<Kind, string> = { job: 'Vaga', course: 'Curso', book: 'Livro', pdf: 'PDF' };
const statusLabels = { pending: 'Pendente', approved: 'Aprovada', rejected: 'Rejeitada' };

async function readResponse(response: Response) {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(typeof body?.message === 'string' ? body.message : `HTTP ${response.status}`);
  }
  return response.json();
}

export function AdminKnowledgeReferences() {
  const [references, setReferences] = useState<Reference[]>([]);
  const [kind, setKind] = useState<Kind>('job');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [author, setAuthor] = useState('');
  const [license, setLicense] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);
  const [candidates, setCandidates] = useState<CurationCandidate[]>([]);
  const [candidateStatus, setCandidateStatus] = useState<'pending' | 'published' | 'archived'>('pending');
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [candidateLoading, setCandidateLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const candidateRequestId = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    try {
      const result = await readResponse(await apiFetch(`${API_BASE}/admin/knowledge/references?status=${status}`)) as Reference[];
      if (request === requestId.current) {
        setReferences(result);
        setError(null);
      }
    } catch (err) {
      if (request === requestId.current) {
        setReferences([]);
        setError(err instanceof Error ? err.message : 'Erro de conexão.');
      }
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  const loadCandidates = useCallback(async () => {
    const request = ++candidateRequestId.current;
    setCandidateLoading(true);
    try {
      const result = await readResponse(await apiFetch(`${API_BASE}/admin/knowledge/curation-candidates?status=${candidateStatus}`)) as CurationCandidate[];
      if (request === candidateRequestId.current) {
        setCandidates(result);
        setCandidateError(null);
      }
    } catch (err) {
      if (request === candidateRequestId.current) {
        setCandidates([]);
        setCandidateError(err instanceof Error ? err.message : 'Erro ao carregar a curadoria.');
      }
    } finally {
      if (request === candidateRequestId.current) setCandidateLoading(false);
    }
  }, [candidateStatus]);

  useEffect(() => { void loadCandidates(); }, [loadCandidates]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await readResponse(await apiFetch(`${API_BASE}/admin/knowledge/references`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, title, url, author: author || undefined, license: license || undefined }),
      }));
      setTitle('');
      setUrl('');
      setAuthor('');
      setLicense('');
      if (status === 'pending') await load();
      else setStatus('pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registrar a referência.');
    } finally {
      setBusy(false);
    }
  }

  async function review(reference: Reference, decision: 'approved' | 'rejected') {
    if (!window.confirm(`${decision === 'approved' ? 'Aprovar' : 'Rejeitar'} esta referência? Isso não importa nem publica o conteúdo.`)) return;
    setBusy(true);
    setError(null);
    try {
      await readResponse(await apiFetch(`${API_BASE}/admin/knowledge/references/${reference.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível revisar a referência.');
    } finally {
      setBusy(false);
    }
  }

  async function queueForCuration(reference: Reference) {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const candidate = await readResponse(await apiFetch(`${API_BASE}/admin/knowledge/references/${reference.id}/curation`, {
        method: 'POST',
      })) as CurationCandidate;
      setNotice(candidate.status === 'archived'
        ? 'Esta referência já possui um candidato arquivado; não foi reaberto.'
        : candidate.status === 'published'
          ? 'Esta referência já possui um link publicado.'
          : 'Referência na fila de curadoria. Nenhum conteúdo foi importado ou publicado.');
      if (candidateStatus === candidate.status) await loadCandidates();
      else setCandidateStatus(candidate.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível encaminhar a referência.');
    } finally {
      setBusy(false);
    }
  }

  async function archiveCandidate(candidate: CurationCandidate) {
    if (!window.confirm('Arquivar este candidato e retirar seu link da busca?')) return;
    setBusy(true);
    setNotice(null);
    setCandidateError(null);
    try {
      await readResponse(await apiFetch(`${API_BASE}/admin/knowledge/curation-candidates/${candidate.id}/archive`, {
        method: 'POST',
      }));
      setNotice('Candidato arquivado.');
      await loadCandidates();
    } catch (err) {
      setCandidateError(err instanceof Error ? err.message : 'Não foi possível arquivar o candidato.');
    } finally {
      setBusy(false);
    }
  }

  async function publishCandidate(candidate: CurationCandidate) {
    const value = window.prompt('Informe as tags de conceitos da atividade, separadas por vírgula (ex.: loops,funcoes):');
    if (value === null) return;
    const topics = value.split(',').map((topic) => topic.trim().toLowerCase()).filter(Boolean);
    if (!topics.length || topics.length > 20 || topics.some((topic) => !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(topic))) {
      setCandidateError('Informe de 1 a 20 tags válidas, com letras sem acento, números, hífen ou sublinhado.');
      return;
    }
    if (!window.confirm('Você revisou a licença e confirmou que este link pode ser indicado aos alunos? Nenhum conteúdo será copiado.')) return;
    setBusy(true);
    setCandidateError(null);
    setNotice(null);
    try {
      await readResponse(await apiFetch(`${API_BASE}/admin/knowledge/curation-candidates/${candidate.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topics, licenseReviewed: true }),
      }));
      setNotice('Link publicado para as atividades com os conceitos indicados.');
      await loadCandidates();
    } catch (err) {
      setCandidateError(err instanceof Error ? err.message : 'Não foi possível publicar o link.');
    } finally {
      setBusy(false);
    }
  }

  async function createResearchDraft(candidate: CurationCandidate) {
    if (!window.confirm('Criar uma pesquisa em rascunho com estes metadados? Nenhum conteúdo será baixado ou publicado.')) return;
    setBusy(true);
    setNotice(null);
    setCandidateError(null);
    try {
      const draft = await readResponse(await apiFetch(`${API_BASE}/admin/knowledge/curation-candidates/${candidate.id}/research`, {
        method: 'POST',
      })) as { id: string; status: string };
      setNotice(`Pesquisa ${draft.id}: ${draft.status}. Referência não alimenta a tutora ou as trilhas; revise a licença.`);
    } catch (err) {
      setCandidateError(err instanceof Error ? err.message : 'Não foi possível criar a pesquisa.');
    } finally {
      setBusy(false);
    }
  }

  const fieldClass = 'w-full rounded-lg border border-[#3f3f46] bg-[#09090b] p-2 text-sm text-white';
  return (
    <section className="rounded-2xl border border-[#27272A] bg-[#121217] p-5 space-y-4">
      <div>
        <h3 className="font-bold text-white">Referências para curadoria</h3>
        <p className="mt-1 text-xs text-zinc-400">
          Apenas metadados e links HTTPS sem credenciais ou tokens. Aprovar uma referência não importa o material nem o disponibiliza à tutora;
          confirme licença e autorização antes de qualquer uso. A Muse ainda não está conectada.
        </p>
      </div>
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
        <label className="text-xs text-zinc-400">Tipo
          <select className={fieldClass} value={kind} onChange={(event) => {
            const value = event.target.value;
            if (value === 'job' || value === 'course' || value === 'book' || value === 'pdf') setKind(value);
          }}>
            {Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-xs text-zinc-400">Título
          <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={200} />
        </label>
        <label className="text-xs text-zinc-400">URL HTTPS
          <input className={fieldClass} type="url" value={url} onChange={(event) => setUrl(event.target.value)} required maxLength={512} />
        </label>
        <label className="text-xs text-zinc-400">Autor, instituição ou empresa
          <input className={fieldClass} value={author} onChange={(event) => setAuthor(event.target.value)} maxLength={200} />
        </label>
        <label className="text-xs text-zinc-400">Licença declarada (não verificada)
          <input className={fieldClass} value={license} onChange={(event) => setLicense(event.target.value)} maxLength={200} />
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={busy} className="rounded-lg bg-[#04D361] px-4 py-2 text-xs font-bold text-black disabled:opacity-50">Adicionar referência</button>
        </div>
      </form>
      <label className="block text-xs text-zinc-400">Mostrar
        <select className="ml-2 rounded-lg border border-[#3f3f46] bg-[#09090b] p-2 text-white" value={status} onChange={(event) => {
          const value = event.target.value;
          if (value === 'pending' || value === 'approved' || value === 'rejected') setStatus(value);
        }}>
          <option value="pending">Pendentes</option><option value="approved">Aprovadas</option><option value="rejected">Rejeitadas</option>
        </select>
      </label>
      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
      {notice && <p role="status" className="text-xs text-emerald-300">{notice}</p>}
      {loading ? <p className="text-xs text-zinc-400">Carregando referências…</p> :
        references.length === 0 ? <p className="text-xs text-zinc-400">Nenhuma referência registrada.</p> :
        <div className="space-y-3">
          {references.map((reference) => (
            <article key={reference.id} className="rounded-lg border border-[#27272A] p-3 text-xs text-zinc-300">
              <p className="font-semibold text-white">{reference.title}</p>
              <p className="mt-1">{kindLabels[reference.kind]} · {statusLabels[reference.status]} · {reference.source === 'connector' ? 'Conector' : 'Admin'} · {new Date(reference.createdAt).toLocaleDateString('pt-BR')}</p>
              <a href={reference.url} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-emerald-300 underline">{reference.url}</a>
              {reference.author && <p className="mt-1">Autor ou origem: {reference.author}</p>}
              {reference.license && <p className="mt-1">Licença declarada (não verificada): {reference.license}</p>}
              {reference.status === 'pending' && <div className="mt-2 flex gap-3">
                <button type="button" disabled={busy} onClick={() => void review(reference, 'approved')} className="text-emerald-300 underline disabled:opacity-50">Aprovar referência</button>
                <button type="button" disabled={busy} onClick={() => void review(reference, 'rejected')} className="text-rose-300 underline disabled:opacity-50">Rejeitar</button>
              </div>}
              {reference.status === 'approved' && <button type="button" disabled={busy} onClick={() => void queueForCuration(reference)} className="mt-2 text-emerald-300 underline disabled:opacity-50">Encaminhar para curadoria</button>}
            </article>
          ))}
          <p className="text-xs text-zinc-500">Mostrando até as 100 referências mais recentes.</p>
        </div>}
      <div className="space-y-3 border-t border-[#27272A] pt-4">
        <h4 className="font-semibold text-white">Fila de curadoria de referências</h4>
        <p className="text-xs text-zinc-400">Após revisão da licença, publique links por conceito para as atividades. Nenhum conteúdo é copiado; pesquisas em rascunho continuam separadas.</p>
        <label className="block text-xs text-zinc-400">Mostrar
          <select className="ml-2 rounded-lg border border-[#3f3f46] bg-[#09090b] p-2 text-white" value={candidateStatus} onChange={(event) => {
            const value = event.target.value;
            if (value === 'pending' || value === 'published' || value === 'archived') setCandidateStatus(value);
          }}>
            <option value="pending">Pendentes</option><option value="published">Publicados</option><option value="archived">Arquivados</option>
          </select>
        </label>
        {candidateError && <p role="alert" className="text-xs text-rose-300">{candidateError}</p>}
        {candidateLoading ? <p className="text-xs text-zinc-400">Carregando curadoria…</p> :
          candidates.length === 0 ? <p className="text-xs text-zinc-400">Nenhum candidato nesta fila.</p> :
          <div className="space-y-3">
            {candidates.map((candidate) => (
              <article key={candidate.id} className="rounded-lg border border-[#27272A] p-3 text-xs text-zinc-300">
                <p className="font-semibold text-white">{candidate.reference.title}</p>
                <p className="mt-1">{kindLabels[candidate.reference.kind]} · {new Date(candidate.createdAt).toLocaleDateString('pt-BR')}</p>
                <a href={candidate.reference.url} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-emerald-300 underline">{candidate.reference.url}</a>
                {candidate.reference.author && <p className="mt-1">Autor ou origem: {candidate.reference.author}</p>}
                {candidate.reference.license && <p className="mt-1">Licença declarada (não verificada): {candidate.reference.license}</p>}
                {candidate.status === 'pending' && <div className="mt-2 flex gap-3">
                  <button type="button" disabled={busy} onClick={() => void createResearchDraft(candidate)} className="text-emerald-300 underline disabled:opacity-50">Criar pesquisa em rascunho</button>
                  <button type="button" disabled={busy} onClick={() => void publishCandidate(candidate)} className="text-emerald-300 underline disabled:opacity-50">Revisar e publicar link</button>
                  <button type="button" disabled={busy} onClick={() => void archiveCandidate(candidate)} className="text-rose-300 underline disabled:opacity-50">Arquivar candidato</button>
                </div>}
                {candidate.status === 'published' && <button type="button" disabled={busy} onClick={() => void archiveCandidate(candidate)} className="mt-2 text-rose-300 underline disabled:opacity-50">Retirar link</button>}
              </article>
            ))}
            <p className="text-xs text-zinc-500">Mostrando até os 100 candidatos mais recentes.</p>
          </div>}
      </div>
    </section>
  );
}
