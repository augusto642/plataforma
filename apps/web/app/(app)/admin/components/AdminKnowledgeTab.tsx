'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../../lib/apiClient';

// Rodada 3 (Fase H / R9) — aba Conhecimento no MESMO padrão das abas admin
// existentes: só mostra o que a API sustenta, sem dado inventado.
// Fontes reais: GET /admin/knowledge/entries, /evolution-report,
// /review-queue, /research, /pipeline-budget e /tracks/:goal/segments.
// Sem endpoint, a seção declara a indisponibilidade em vez de fabricar.
// Aprovar versão KMS via API registra a decisão no banco (pending-sync);
// o arquivo só muda com kms-apply --sync-db (DESIGN §13.4) — o botão de
// aprovar versão, por isso, não existe aqui: a decisão é tomada na rota
// existente e o operador aplica. Segmentos incrementais (draft) são
// aprovados AQUI porque a aprovação do segmento é ato sobre o template
// (arquivo versionado) via POST tracks/.../approve, com o gate §I6.3.

interface KmsEntryRow {
  slug: string;
  title: string;
  status: string;
  currentVersion: number;
  versionsCount: number;
  draftVersions: number;
  lastChange: string | null;
}

interface EvolutionReport {
  entriesByStatus?: Record<string, number>;
  versionsByStatus?: Record<string, number>;
  staleEntries?: Array<{ slug: string; reason: string }>;
  queue?: { openByKind?: Record<string, number>; pendingSync?: unknown[]; pendingSyncVersions?: unknown[] };
  coverage?: { totalFiles?: number; fed?: number; unfed?: number };
  changelogTotal?: number;
}

interface ReviewQueue {
  open?: Array<{ id: string; kind: string; confidence: number }>;
  resolved?: Array<{ id: string; kind: string }>;
  counts?: { open: number; resolved: number };
}

interface SegmentRow {
  stageSlug: string;
  title: string;
  order: number;
  status: string;
  activities: number;
  segmentVersion: number;
  generatedAt: string | null;
}

async function readJson(res: Response): Promise<unknown> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const AdminKnowledgeTab: React.FC = () => {
  const [entries, setEntries] = useState<KmsEntryRow[] | null>(null);
  const [report, setReport] = useState<EvolutionReport | null>(null);
  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [research, setResearch] = useState<Array<{ id: string; goal: string; status: string }> | null>(null);
  const [budget, setBudget] = useState<{ date: string; cap: number; used: number; remaining: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [goalSlug, setGoalSlug] = useState('');
  const [segments, setSegments] = useState<SegmentRow[] | null>(null);
  const [segmentsError, setSegmentsError] = useState<string | null>(null);
  const [segmentsBusy, setSegmentsBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [e, r, q, res, b] = await Promise.all([
        readJson(await apiClient.get('/admin/knowledge/entries')) as Promise<KmsEntryRow[]>,
        readJson(await apiClient.get('/admin/knowledge/evolution-report')) as Promise<EvolutionReport>,
        readJson(await apiClient.get('/admin/knowledge/review-queue')) as Promise<ReviewQueue>,
        readJson(await apiClient.get('/admin/knowledge/research')) as Promise<Array<{ id: string; goal: string; status: string }>>,
        readJson(await apiClient.get('/admin/knowledge/pipeline-budget')) as Promise<{ date: string; cap: number; used: number; remaining: number }>,
      ]);
      setEntries(e);
      setReport(r);
      setQueue(q);
      setResearch(res);
      setBudget(b);
    } catch (err) {
      // Sem checkout, as rotas KMS falham explicitamente (fail-closed):
      // a aba mostra o erro real, nunca um KMS vazio fingido de vazio.
      setError(err instanceof Error ? err.message : 'Falha ao carregar o conhecimento.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadSegments = useCallback(async () => {
    const slug = goalSlug.trim();
    if (!slug) {
      setSegmentsError('Informe o slug do objetivo (ex.: desenvolvedor-java).');
      return;
    }
    setSegmentsBusy(true);
    setSegmentsError(null);
    try {
      const data = (await readJson(await apiClient.get(`/admin/knowledge/tracks/${encodeURIComponent(slug)}/segments`))) as SegmentRow[];
      setSegments(data);
    } catch (err) {
      setSegmentsError(err instanceof Error ? err.message : 'Falha ao carregar segmentos.');
      setSegments(null);
    } finally {
      setSegmentsBusy(false);
    }
  }, [goalSlug]);

  const actSegment = useCallback(
    async (stageSlug: string, action: 'generate' | 'approve', segment?: SegmentRow) => {
      const slug = goalSlug.trim();
      setSegmentsBusy(true);
      setNotice(null);
      try {
        if (action === 'approve') {
          await readJson(await apiClient.post(`/admin/knowledge/tracks/${encodeURIComponent(slug)}/segments/${encodeURIComponent(stageSlug)}/approve`, {}));
          setNotice(`Segmento ${stageSlug} aprovado (gate §I6.3: testes autorados exigidos).`);
        } else {
          if (!segment) throw new Error('segmento desconhecido para gerar');
          await readJson(
            await apiClient.post(`/admin/knowledge/tracks/${encodeURIComponent(slug)}/segments/${encodeURIComponent(stageSlug)}/generate`, {
              title: segment.title,
              topics: [],
              stageOrder: segment.order,
              language: 'python',
            }),
          );
          setNotice(`Geração do segmento ${stageSlug} enfileirada (fila track-generation, T3).`);
        }
        await loadSegments();
      } catch (err) {
        setNotice(err instanceof Error ? `Falha: ${err.message}` : 'Falha na ação.');
      } finally {
        setSegmentsBusy(false);
      }
    },
    [goalSlug, loadSegments],
  );

  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookTags, setBookTags] = useState('');
  const [bookLevel, setBookLevel] = useState('all');
  const [bookContentMd, setBookContentMd] = useState('');
  const [bookBusy, setBookBusy] = useState(false);
  const [bookFeedback, setBookFeedback] = useState<string | null>(null);

  const handleIngestBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookTitle.trim() || !bookContentMd.trim()) {
      setBookFeedback('Título e conteúdo Markdown são obrigatórios.');
      return;
    }
    setBookBusy(true);
    setBookFeedback(null);
    try {
      const res = await apiClient.post('/admin/knowledge/ingest-book', {
        title: bookTitle.trim(),
        author: bookAuthor.trim() || undefined,
        tags: bookTags.split(',').map((t) => t.trim()).filter(Boolean),
        level: bookLevel,
        contentMd: bookContentMd,
      });
      const data = (await readJson(res)) as { slug: string; path: string };
      setBookFeedback(`Documento ingerido com sucesso! Slug: ${data.slug}`);
      setBookTitle('');
      setBookAuthor('');
      setBookTags('');
      setBookContentMd('');
    } catch (err) {
      setBookFeedback(`Falha ao ingerir: ${(err as Error).message}`);
    } finally {
      setBookBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-white font-heading">Conhecimento (KMS + trilhas incrementais)</h2>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          Curadoria do sistema de conhecimento: entradas, fila de revisão, pesquisas e segmentos. Aprovação KMS via API é
          decisão no banco (pending-sync até o kms-apply); segmento incremental aprova aqui, com o gate de testes autorados.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
          {error} — sem checkout, as rotas KMS falham explicitamente (não é um KMS vazio).
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-[#121217] border border-[#27272A] space-y-2">
          <h3 className="text-base font-bold text-white font-heading">Evolução</h3>
          {report ? (
            <div className="text-xs text-zinc-400 space-y-1">
              <p>Entradas por status: {JSON.stringify(report.entriesByStatus ?? {})}</p>
              <p>Versões por status: {JSON.stringify(report.versionsByStatus ?? {})}</p>
              <p>Changelog: {report.changelogTotal ?? 0} itens</p>
              <p>
                Cobertura: {report.coverage?.fed ?? 0} alimentados / {report.coverage?.totalFiles ?? 0} arquivos
                {report.coverage?.unfed ? ` (${report.coverage.unfed} sem entrada)` : ''}
              </p>
              <p>Fila aberta por tipo: {JSON.stringify(report.queue?.openByKind ?? {})}</p>
              <p>Obsoletas pendentes: {report.staleEntries?.length ?? 0}</p>
            </div>
          ) : (
            <p className="text-xs text-zinc-400">Carregando relatório de evolução…</p>
          )}
        </div>

        <div className="p-6 rounded-2xl bg-[#121217] border border-[#27272A] space-y-2">
          <h3 className="text-base font-bold text-white font-heading">Orçamento do pipeline</h3>
          {budget ? (
            <div className="text-xs text-zinc-400 space-y-1">
              <p>
                {budget.date}: {budget.used}/{budget.cap} chamadas LLM do dia (restam {budget.remaining}).
              </p>
              <p className="text-[11px]">Teto 200/dia = proposta pendente de aprovação do Augusto (Q7) — não autoriza escala antes de D3.</p>
            </div>
          ) : (
            <p className="text-xs text-zinc-400">Carregando orçamento…</p>
          )}
        </div>

        <div className="p-6 rounded-2xl bg-[#121217] border border-[#27272A] space-y-2">
          <h3 className="text-base font-bold text-white font-heading">Pesquisas</h3>
          {research ? (
            research.length === 0 ? (
              <p className="text-xs text-zinc-400">Nenhuma pesquisa registrada.</p>
            ) : (
              <ul className="text-xs text-zinc-400 space-y-1">
                {research.slice(0, 10).map((r) => (
                  <li key={r.id}>
                    {r.goal} — <span className="text-white">{r.status}</span>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="text-xs text-zinc-400">Carregando pesquisas…</p>
          )}
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-[#121217] border border-[#27272A] space-y-3">
        <h3 className="text-base font-bold text-white font-heading">Entradas KMS</h3>
        {entries ? (
          entries.length === 0 ? (
            <p className="text-xs text-zinc-400">Nenhuma entrada KMS no checkout.</p>
          ) : (
            <ul className="text-xs text-zinc-400 space-y-1">
              {entries.map((e) => (
                <li key={e.slug}>
                  <span className="text-white font-semibold">{e.slug}</span> — {e.title} · {e.status} · v{e.currentVersion} ·{' '}
                  {e.versionsCount} versões ({e.draftVersions} draft)
                </li>
              ))}
            </ul>
          )
        ) : (
          <p className="text-xs text-zinc-400">Carregando entradas…</p>
        )}
        <h3 className="text-base font-bold text-white font-heading pt-2">Fila de revisão</h3>
        {queue ? (
          <p className="text-xs text-zinc-400">
            Abertos: {queue.counts?.open ?? 0} · Resolvidos: {queue.counts?.resolved ?? 0}
            {(queue.open ?? []).slice(0, 5).map((i) => (
              <span key={i.id} className="block">
                {i.id} ({i.kind}, confiança {i.confidence})
              </span>
            ))}
          </p>
        ) : (
          <p className="text-xs text-zinc-400">Carregando fila…</p>
        )}
      </div>

      <div className="p-6 rounded-2xl bg-[#121217] border border-[#27272A] space-y-3">
        <h3 className="text-base font-bold text-white font-heading">Segmentos incrementais (por objetivo)</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={goalSlug}
            onChange={(e) => setGoalSlug(e.target.value)}
            placeholder="slug do objetivo (ex.: desenvolvedor-java)"
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-2.5 text-sm text-white outline-none focus:border-[#8257E5]"
          />
          <button
            type="button"
            onClick={loadSegments}
            disabled={segmentsBusy}
            className="rounded-xl bg-[#8257E5] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            Carregar segmentos
          </button>
        </div>
        {segmentsError && <p className="text-xs text-rose-300">{segmentsError}</p>}
        {notice && <p className="text-xs text-emerald-300">{notice}</p>}
        {segments && segments.length === 0 && <p className="text-xs text-zinc-400">Trilha sem etapas no esqueleto.</p>}
        {segments && segments.length > 0 && (
          <ul className="text-xs text-zinc-400 space-y-2">
            {segments.map((s) => (
              <li key={s.stageSlug} className="flex flex-wrap items-center gap-2 bg-[#181820] border border-[#27272A] rounded-xl p-3">
                <span className="text-white font-semibold">
                  {s.order}. {s.title}
                </span>
                <span>· {s.status}</span>
                <span>· {s.activities} atividades</span>
                {s.status === 'draft' && (
                  <button
                    type="button"
                    onClick={() => actSegment(s.stageSlug, 'approve', s)}
                    disabled={segmentsBusy}
                    className="ml-auto rounded-lg bg-[#04D361]/15 border border-[#04D361]/30 text-[#04D361] px-3 py-1.5 font-bold disabled:opacity-60"
                  >
                    Aprovar segmento
                  </button>
                )}
                {s.status === 'planned' && (
                  <button
                    type="button"
                    onClick={() => actSegment(s.stageSlug, 'generate', s)}
                    disabled={segmentsBusy}
                    className="ml-auto rounded-lg bg-[#8257E5]/15 border border-[#8257E5]/30 text-[#996DFF] px-3 py-1.5 font-bold disabled:opacity-60"
                  >
                    Gerar (T3)
                  </button>
                )}
                {s.status === 'active' && <span className="ml-auto text-[#04D361] font-bold">jogável</span>}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-zinc-500">
          Segmento draft aparece como “em revisão” para o aluno, sem acesso às atividades; só vira jogável com a aprovação
          acima (gate §I6.3). Nenhuma auto-aprovação como default (Q12 aberta).
        </p>
      </div>

      {/* Pacote 2.2: Ingestão de Livros/PDFs e Artigos Técnicos (.md / .html) */}
      <div className="p-6 rounded-2xl bg-[#121217] border border-[#27272A] space-y-4">
        <div>
          <h3 className="text-base font-bold text-white font-heading">
            Ingestão KMS / RAG: Livros, PDFs e Artigos Técnicos (.md)
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Alimenta a base de conhecimento estruturada em Markdown com frontmatter. O gerador de trilhas consulta este repositório antes de pesquisar fontes externas.
          </p>
        </div>

        <form onSubmit={handleIngestBook} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Título do Livro / Artigo</label>
              <input
                type="text"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="Ex: Clean Architecture & Domain-Driven Design"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-2.5 text-sm text-white outline-none focus:border-[#8257E5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Autor / Fonte</label>
              <input
                type="text"
                value={bookAuthor}
                onChange={(e) => setBookAuthor(e.target.value)}
                placeholder="Ex: Robert C. Martin / Eric Evans"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-2.5 text-sm text-white outline-none focus:border-[#8257E5]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Tags (separadas por vírgula)</label>
              <input
                type="text"
                value={bookTags}
                onChange={(e) => setBookTags(e.target.value)}
                placeholder="arquitetura, clean-code, java, typescript, microservices"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-2.5 text-sm text-white outline-none focus:border-[#8257E5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Nível de Destino</label>
              <select
                value={bookLevel}
                onChange={(e) => setBookLevel(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-2.5 text-sm text-white outline-none focus:border-[#8257E5]"
              >
                <option value="all">Todos os Níveis</option>
                <option value="beginner">Iniciante</option>
                <option value="junior">Júnior</option>
                <option value="mid">Pleno</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Conteúdo Markdown (.md estruturado)</label>
            <textarea
              rows={6}
              value={bookContentMd}
              onChange={(e) => setBookContentMd(e.target.value)}
              placeholder="Cole aqui o conteúdo técnico em formato Markdown, capítulos de livros ou resumos de artigos..."
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-2.5 text-xs text-white font-mono outline-none focus:border-[#8257E5]"
            />
          </div>

          {bookFeedback && (
            <p className={`text-xs ${bookFeedback.includes('sucesso') ? 'text-emerald-400' : 'text-rose-400'}`}>
              {bookFeedback}
            </p>
          )}

          <button
            type="submit"
            disabled={bookBusy}
            className="rounded-xl bg-[#8257E5] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#996DFF] transition-colors disabled:opacity-50"
          >
            {bookBusy ? 'Ingerindo documento...' : 'Ingerir Documento no KMS/RAG'}
          </button>
        </form>
      </div>
    </div>
  );
};
