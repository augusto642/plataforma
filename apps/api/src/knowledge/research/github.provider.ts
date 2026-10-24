/**
 * GitHub REST (DESIGN §3.2, B1). GITHUB_TOKEN é opcional: sem ele funciona
 * com 60 req/h; acima do limite (ou 403 de rate limit) => ProviderUnavailable
 * até a janela resetar, nunca dado parcial apresentado como completo.
 */
import { ProviderUnavailable, type RepoResearchProvider, type RepoSignal } from './providers';

export class GitHubRestProvider implements RepoResearchProvider {
  readonly id = 'github';

  constructor(private readonly token: string | undefined = process.env.GITHUB_TOKEN) {}

  async searchRepos(q: string, opts?: { language?: 'python'; minStars?: number }): Promise<RepoSignal[]> {
    const query = [`language:${opts?.language ?? 'python'}`, q, opts?.minStars ? `stars:>=${opts.minStars}` : ''].filter(Boolean).join('+');
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'nexus-code-knowledge' };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const res = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=10`, { headers });
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (res.status === 403 || (remaining !== null && Number(remaining) <= 0)) {
      throw new ProviderUnavailable('github', `rate limit do GitHub atingido (remaining=${remaining}) — fonte indisponível até a janela resetar`);
    }
    if (!res.ok) throw new ProviderUnavailable('github', `GitHub API retornou ${res.status}`);
    const data: any = await res.json();
    return (data.items || []).map((r: any) => ({
      fullName: r.full_name,
      description: r.description ?? undefined,
      stars: r.stargazers_count,
      url: r.html_url,
      language: r.language ?? undefined,
      updatedAt: r.updated_at,
    }));
  }
}
