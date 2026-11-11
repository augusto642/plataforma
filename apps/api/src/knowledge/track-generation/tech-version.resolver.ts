/**
 * Resolvedor de versão estável (DESIGN §4.5 / delta §I5 — H5).
 * Precedência: fonte oficial → endoflife.date → registry → última
 * conhecida ROTULADA (unconfirmed). Sem chave, sem invenção: sem fonte,
 * retorna unconfirmed com version null; pré-release (alpha/beta/rc/dev/
 * snapshot) NUNCA conta como estável. A versão é verdadeira "em
 * resolvedAt" — cada regeneração re-resolve (§I5.4).
 *
 * Fontes oficiais implementadas (endpoints públicos, parsing defensivo —
 * qualquer formato inesperado cai para a próxima fonte, nunca inventa):
 * - nodejs: https://nodejs.org/dist/index.json (primeira versão estável);
 * - java: https://api.adoptium.net/v3/info/available_releases (maior
 *   release disponível). Outras tecnologias: tabela por tecnologia é
 *   questão aberta Q16 — sem URL oficial conhecida, pula para endoflife.
 * Registry: npm (techs JS/TS), PyPI (techs Python), Maven Central search
 * (techs Java). `fetchFn` é injetável para testes offline (stub).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ResolvedTechVersion {
  tech: string;
  version: string | null;
  status: 'confirmed' | 'unconfirmed';
  resolvedAt: string;
  source: string | null;
  lastKnown?: string | null;
}

type FetchFn = (url: string, opts?: { headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown>; text(): Promise<string> }>;

const PRE_RELEASE = /-(alpha|beta|rc|preview|dev|snapshot|nightly|canary)/i;
const VERSION_RE = /^\d+(\.\d+)*$/;

function isStable(v: unknown): v is string {
  return typeof v === 'string' && VERSION_RE.test(v.replace(/^v/, '')) && !PRE_RELEASE.test(v);
}

function clean(v: string): string {
  return v.replace(/^v/, '');
}

const ENDOFLIFE_PRODUCT: Record<string, string> = {
  java: 'java',
  'spring-boot': 'spring-boot',
  python: 'python',
  docker: 'docker',
  nodejs: 'nodejs',
  node: 'nodejs',
  postgresql: 'postgresql',
  postgres: 'postgresql',
};

const NPM_PACKAGE: Record<string, string> = {
  typescript: 'typescript',
  react: 'react',
  next: 'next',
  nestjs: '@nestjs/core',
};

const PYPI_PACKAGE: Record<string, string> = {
  python: 'python',
  django: 'Django',
  fastapi: 'fastapi',
  pandas: 'pandas',
};

const MAVEN_COORDS: Record<string, string> = {
  'spring-boot': 'org.springframework.boot:spring-boot-starter-parent',
};

export class TechVersionResolver {
  constructor(
    private readonly fetchFn: FetchFn = (globalThis.fetch as unknown as FetchFn),
    private readonly techVersionsPath?: string,
  ) {}

  private lastKnown(tech: string): string | null {
    if (!this.techVersionsPath || !existsSync(this.techVersionsPath)) return null;
    try {
      const doc = JSON.parse(readFileSync(this.techVersionsPath, 'utf8'));
      const entry = doc[tech] || doc.versions?.[tech];
      return typeof entry?.version === 'string' ? entry.version : typeof entry === 'string' ? entry : null;
    } catch {
      return null;
    }
  }

  private async tryJson(url: string): Promise<unknown | null> {
    try {
      const res = await this.fetchFn(url, { headers: { 'User-Agent': 'nexus-code-tech-resolver' } });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  private async official(tech: string): Promise<string | null> {
    if (tech === 'nodejs' || tech === 'node') {
      const doc = (await this.tryJson('https://nodejs.org/dist/index.json')) as Array<{ version?: string }> | null;
      if (Array.isArray(doc)) {
        for (const row of doc) {
          if (row.version && isStable(row.version)) return clean(row.version);
        }
      }
      return null;
    }
    if (tech === 'java') {
      const doc = (await this.tryJson('https://api.adoptium.net/v3/info/available_releases')) as Array<{ available_releases?: number[] }> | null;
      if (Array.isArray(doc)) {
        const all = doc.flatMap((d) => d.available_releases || []).filter((n) => Number.isFinite(n));
        if (all.length) return String(Math.max(...all));
      }
      return null;
    }
    return null; // Q16: sem URL oficial conhecida para esta tecnologia — próxima fonte.
  }

  private async endoflife(tech: string): Promise<string | null> {
    const product = ENDOFLIFE_PRODUCT[tech];
    if (!product) return null;
    const doc = (await this.tryJson(`https://endoflife.date/api/${product}.json`)) as { latest?: string; lts?: string } | null;
    if (!doc) return null;
    if (isStable(doc.latest)) return clean(doc.latest as string);
    if (isStable(doc.lts)) return clean(doc.lts as string);
    return null;
  }

  private async registry(tech: string): Promise<string | null> {
    const npmPkg = NPM_PACKAGE[tech];
    if (npmPkg) {
      const doc = (await this.tryJson(`https://registry.npmjs.org/${encodeURIComponent(npmPkg)}/latest`)) as { version?: string } | null;
      if (doc && isStable(doc.version)) return clean(doc.version as string);
    }
    const pypiPkg = PYPI_PACKAGE[tech];
    if (pypiPkg) {
      const doc = (await this.tryJson(`https://pypi.org/pypi/${encodeURIComponent(pypiPkg)}/json`)) as { info?: { version?: string } } | null;
      if (doc?.info && isStable(doc.info.version)) return clean(doc.info.version as string);
    }
    const coords = MAVEN_COORDS[tech];
    if (coords) {
      const [g, a] = coords.split(':');
      const doc = (await this.tryJson(
        `https://search.maven.org/solrsearch/select?q=g:${encodeURIComponent(g)}+AND+a:${encodeURIComponent(a)}&rows=1&wt=json`,
      )) as { response?: { docs?: Array<{ latestVersion?: string }> } } | null;
      const v = doc?.response?.docs?.[0]?.latestVersion;
      if (isStable(v)) return clean(v as string);
    }
    return null;
  }

  async resolve(tech: string): Promise<ResolvedTechVersion> {
    const resolvedAt = new Date().toISOString();
    const lastKnown = this.lastKnown(tech);
    const attempts: Array<{ source: string; version: string | null }> = [
      { source: `official:${tech}`, version: await this.official(tech) },
      { source: `endoflife.date/${ENDOFLIFE_PRODUCT[tech] || tech}`, version: await this.endoflife(tech) },
      { source: `registry:${tech}`, version: await this.registry(tech) },
    ];
    for (const a of attempts) {
      if (a.version) {
        return { tech, version: a.version, status: 'confirmed', resolvedAt, source: a.source, lastKnown };
      }
    }
    // Fallback rotulado (§I5.3): última conhecida SÓ como rótulo — version
    // null, status unconfirmed, nunca um número chutado como confirmado.
    return { tech, version: null, status: 'unconfirmed', resolvedAt, source: null, lastKnown };
  }
}

export function techVersionsPathFromContentDir(contentDir: string): string {
  return join(contentDir, 'knowledge', 'tech-versions.json');
}
