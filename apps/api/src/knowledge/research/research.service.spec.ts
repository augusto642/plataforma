/**
 * ResearchService — fail-closed (D5): sem chave, fonte indisponível e
 * rotulada em sourcesUnavailable, sem 500 e sem dado inventado; o gatilho
 * "modelo" (B3) nunca publica pesquisa nem chama provedor sozinho.
 */
import { ResearchService } from './research.service';
import { ProviderUnavailable } from './providers';

const noKeyVideo = { id: 'youtube', searchVideos: async () => { throw new ProviderUnavailable('youtube', 'sem chave'); }, getChannel: async () => null };
const noKeyJobs = { id: 'jobs', searchJobs: async () => { throw new ProviderUnavailable('jobs', 'Q3 pendente'); } };
const okRepos = { id: 'github', searchRepos: async () => [{ fullName: 'owner/repo', stars: 500, url: 'https://github.com/owner/repo', updatedAt: '2026-10-24T00:00:00.000Z' }] };

describe('ResearchService', () => {
  it('sem chave YouTube e sem provedor de mercado: sourcesUnavailable rotula, sem erro', async () => {
    const svc = new ResearchService(undefined, noKeyVideo as any, okRepos as any, noKeyJobs as any);
    const doc = await svc.collect('analista de dados python');
    expect(doc.status).toBe('draft');
    expect(doc.sourcesAvailable).toEqual(['github']);
    expect(doc.sourcesUnavailable).toEqual(expect.arrayContaining(['youtube', 'jobs']));
    expect(doc.videos).toEqual([]);
  });

  it('aprovar registra approvedBy/approvedAt; draft nunca alimenta o gerador via findApprovedForGoal', async () => {
    const svc = new ResearchService(undefined, noKeyVideo as any, okRepos as any, noKeyJobs as any);
    const doc = await svc.collect('analista de dados python');
    expect(svc.findApprovedForGoal('analista de dados python')).toBeNull();
    const approved = svc.approve(doc.id, 'admin-uuid-1');
    expect(approved.status).toBe('approved');
    expect(approved.approvedBy).toBe('admin-uuid-1');
    expect(approved.approvedAt).not.toBeNull();
    expect(svc.findApprovedForGoal('analista de dados python')?.id).toBe(doc.id);
  });

  it('B3: sem pesquisa aprovada, cria ResearchRequest pendente + aviso honesto', () => {
    const svc = new ResearchService(undefined, noKeyVideo as any, okRepos as any, noKeyJobs as any);
    const res = svc.requestForGoal('engenheiro de dados python');
    expect(res.approved).toBeNull();
    expect(res.request?.status).toBe('requested');
    expect(res.message).toMatch(/nenhuma trilha foi fabricada/);
    expect(svc.list().some((d) => d.status === 'requested')).toBe(true);
  });
});
