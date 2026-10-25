/**
 * ResearchService — fail-closed (D5): sem chave, fonte indisponível e
 * rotulada em sourcesUnavailable, sem 500 e sem dado inventado; o gatilho
 * "modelo" (B3) nunca publica pesquisa nem chama provedor sozinho.
 */
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ResearchService } from './research.service';
import { ProviderUnavailable } from './providers';

const noKeyVideo = { id: 'youtube', searchVideos: async () => { throw new ProviderUnavailable('youtube', 'sem chave'); }, getChannel: async () => null };
const noKeyJobs = { id: 'jobs', searchJobs: async () => { throw new ProviderUnavailable('jobs', 'Q3 pendente'); } };
const okRepos = { id: 'github', searchRepos: async () => [{ fullName: 'owner/repo', stars: 500, url: 'https://github.com/owner/repo', updatedAt: '2026-10-24T00:00:00.000Z' }] };

describe('ResearchService', () => {
  it('sem chave YouTube e sem provedor de mercado: sourcesUnavailable rotula, sem erro', async () => {
    const svc = new ResearchService(undefined, noKeyVideo as any, okRepos as any, noKeyJobs as any, { researchDir: mkdtempSync(join(tmpdir(), 'research-spec-')) });
    const doc = await svc.collect('analista de dados python');
    expect(doc.status).toBe('draft');
    expect(doc.sourcesAvailable).toEqual(['github']);
    expect(doc.sourcesUnavailable).toEqual(expect.arrayContaining(['youtube', 'jobs']));
    expect(doc.videos).toEqual([]);
  });

  it('aprovar registra approvedBy/approvedAt; draft nunca alimenta o gerador via findApprovedForGoal', async () => {
    const svc = new ResearchService(undefined, noKeyVideo as any, okRepos as any, noKeyJobs as any, { researchDir: mkdtempSync(join(tmpdir(), 'research-spec-')) });
    const doc = await svc.collect('analista de dados python');
    expect(svc.findApprovedForGoal('analista de dados python')).toBeNull();
    const approved = svc.approve(doc.id, 'admin-uuid-1');
    expect(approved.status).toBe('approved');
    expect(approved.approvedBy).toBe('admin-uuid-1');
    expect(approved.approvedAt).not.toBeNull();
    expect(svc.findApprovedForGoal('analista de dados python')?.id).toBe(doc.id);
  });

  it('B3: sem pesquisa aprovada, cria ResearchRequest pendente + aviso honesto', () => {
    const svc = new ResearchService(undefined, noKeyVideo as any, okRepos as any, noKeyJobs as any, { researchDir: mkdtempSync(join(tmpdir(), 'research-spec-')) });
    const res = svc.requestForGoal('engenheiro de dados python');
    expect(res.approved).toBeNull();
    expect(res.request?.status).toBe('requested');
    expect(res.message).toMatch(/nenhuma trilha foi fabricada/);
    expect(svc.list().some((d) => d.status === 'requested')).toBe(true);
  });

  it('A1: aprovação persiste em arquivo e sobrevive a nova instância (restart)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'research-persist-'));
    const svc = new ResearchService(undefined, noKeyVideo as any, okRepos as any, noKeyJobs as any, { researchDir: dir });
    const doc = await svc.collect('analista de dados python');
    svc.approve(doc.id, 'admin-uuid-1');
    expect(existsSync(join(dir, `${doc.id}.json`))).toBe(true);
    expect(JSON.parse(readFileSync(join(dir, `${doc.id}.json`), 'utf8')).status).toBe('approved');
    // Nova instância = restart: hidrata do arquivo, aprovação intacta.
    const restarted = new ResearchService(undefined, noKeyVideo as any, okRepos as any, noKeyJobs as any, { researchDir: dir });
    expect(restarted.get(doc.id).status).toBe('approved');
    expect(restarted.get(doc.id).approvedBy).toBe('admin-uuid-1');
    expect(restarted.findApprovedForGoal('analista de dados python')?.id).toBe(doc.id);
  });

  it('V2: sem diretório, a mutação falha explicitamente em vez de viver só em memória', async () => {
    const svc = new ResearchService(undefined, noKeyVideo as any, okRepos as any, noKeyJobs as any);
    await expect(svc.collect('analista de dados python')).rejects.toThrow(/persistência de pesquisa indisponível/);
    expect(svc.list()).toEqual([]);
  });

  it('A1: re-coleta após aprovação atualiza o conteúdo sem apagar a aprovação', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'research-race-'));
    const svc = new ResearchService(undefined, noKeyVideo as any, okRepos as any, noKeyJobs as any, { researchDir: dir });
    const created = await svc.createResearch('analista de dados python');
    // Admin aprova entre o create e a coleta do worker.
    svc.approve(created.id, 'admin-uuid-1');
    const recollected = await svc.collect('analista de dados python');
    expect(recollected.status).toBe('approved');
    expect(recollected.approvedBy).toBe('admin-uuid-1');
    expect(recollected.approvedAt).not.toBeNull();
    expect(recollected.sourcesAvailable).toEqual(['github']);
  });
});
