export type WorkspaceFontSize = 13 | 14 | 16;

export interface WorkspacePreferences {
  fontSize: WorkspaceFontSize;
  focusMode: boolean;
  tutorAutoOpen: boolean;
}

export const DEFAULT_WORKSPACE_PREFERENCES: WorkspacePreferences = {
  fontSize: 14,
  focusMode: false,
  tutorAutoOpen: true,
};

const STORAGE_KEY = 'nexus_workspace_prefs';

export function readWorkspacePreferences(): WorkspacePreferences {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_WORKSPACE_PREFERENCES };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WORKSPACE_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<WorkspacePreferences>;
    const fontSize: WorkspaceFontSize =
      parsed.fontSize === 13 || parsed.fontSize === 14 || parsed.fontSize === 16
        ? parsed.fontSize
        : DEFAULT_WORKSPACE_PREFERENCES.fontSize;
    return {
      fontSize,
      focusMode:
        typeof parsed.focusMode === 'boolean'
          ? parsed.focusMode
          : DEFAULT_WORKSPACE_PREFERENCES.focusMode,
      tutorAutoOpen:
        typeof parsed.tutorAutoOpen === 'boolean'
          ? parsed.tutorAutoOpen
          : DEFAULT_WORKSPACE_PREFERENCES.tutorAutoOpen,
    };
  } catch {
    return { ...DEFAULT_WORKSPACE_PREFERENCES };
  }
}

export function saveWorkspacePreferences(prefs: WorkspacePreferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignora falhas de storage (navegação privada/quota)
  }
}

export interface WorkspaceStarterTemplate {
  filename: string;
  runtimeLabel: string;
  lines: string[];
  expectedOutput: string;
}

export const TECH_STARTER_TEMPLATES: Record<string, WorkspaceStarterTemplate> = {
  typescript: {
    filename: 'missao-01.ts',
    runtimeLabel: 'TypeScript 5 · Node Sandbox',
    lines: [
      'export function calcularXp(acertos: number, bonus = 25): number {',
      '  if (acertos <= 0) return 0;',
      '  return acertos * 100 + bonus;',
      '}',
      '',
      'console.log(calcularXp(3)); // 325 XP',
    ],
    expectedOutput: '✓ 3/3 casos validados • 325 XP pronto para prática',
  },
  javascript: {
    filename: 'missao-01.js',
    runtimeLabel: 'JavaScript ES2023 · Node Sandbox',
    lines: [
      'export function saudarDev(nome, trilha) {',
      '  return `Workspace ativo para ${nome} em ${trilha}!`;',
      '}',
      '',
      "console.log(saudarDev('Dev', 'JavaScript'));",
    ],
    expectedOutput: '✓ Sandbox Node pronto • Execução em < 80ms',
  },
  python: {
    filename: 'missao_01.py',
    runtimeLabel: 'Python 3.12 · Isolated Runner',
    lines: [
      'def filtrar_concluidos(missoes: list[dict]) -> list[str]:',
      '    return [m["titulo"] for m in missoes if m.get("concluida")]',
      '',
      'print(filtrar_concluidos([{"titulo": "Setup", "concluida": True}]))',
    ],
    expectedOutput: "✓ ['Setup'] • Testes automatizados prontos",
  },
  'react-nextjs': {
    filename: 'MissionCard.tsx',
    runtimeLabel: 'React 18 + Next.js App Router',
    lines: [
      'export function MissionBadge({ level }: { level: string }) {',
      '  return (',
      '    <span className="rounded-full border border-emerald-400/40 px-3 py-1">',
      '      Trilha ativa: {level}',
      '    </span>',
      '  );',
      '}',
    ],
    expectedOutput: '✓ Componentes + Type-check prontos no editor',
  },
  nodejs: {
    filename: 'server.ts',
    runtimeLabel: 'Node.js API · REST & Filas',
    lines: [
      "import { createServer } from 'node:http';",
      '',
      'export function healthPayload(env: string) {',
      "  return { status: 'ok', env, runtime: 'node' };",
      '}',
    ],
    expectedOutput: '✓ Sandbox backend configurado para APIs',
  },
  java: {
    filename: 'Solution.java',
    runtimeLabel: 'Java 21 LTS · JUnit Runner',
    lines: [
      'public class Solution {',
      '  public static int somaPares(int[] nums) {',
      '    int total = 0;',
      '    for (int n : nums) if (n % 2 == 0) total += n;',
      '    return total;',
      '  }',
      '}',
    ],
    expectedOutput: '✓ JVM aquecida • Bateria de testes pronta',
  },
  csharp: {
    filename: 'Program.cs',
    runtimeLabel: 'C# .NET 8 · Typed Runner',
    lines: [
      'public static class Desafio {',
      '  public static int SomarPositivos(int[] itens) =>',
      '    itens.Where(x => x > 0).Sum();',
      '}',
    ],
    expectedOutput: '✓ Ambiente .NET pronto para exercícios',
  },
  go: {
    filename: 'main.go',
    runtimeLabel: 'Go 1.22 · Fast Compile Sandbox',
    lines: [
      'package main',
      '',
      'func Score(acertos int) int {',
      '    if acertos < 0 { return 0 }',
      '    return acertos * 120',
      '}',
    ],
    expectedOutput: '✓ Compilador Go & testes unitários prontos',
  },
  'sql-data': {
    filename: 'consulta.sql',
    runtimeLabel: 'PostgreSQL 16 · Analytics Query',
    lines: [
      'SELECT trilha, COUNT(*) AS alunos_ativos',
      'FROM progresso_alunos',
      "WHERE status = 'em_andamento'",
      'GROUP BY trilha',
      'ORDER BY alunos_ativos DESC;',
    ],
    expectedOutput: '✓ Consultas e modelagem prontas na trilha',
  },
  'docker-cloud': {
    filename: 'Dockerfile',
    runtimeLabel: 'Containers & Cloud Labs',
    lines: [
      'FROM node:20-alpine',
      'WORKDIR /app',
      'COPY package*.json ./',
      'RUN npm ci --omit=dev',
      'COPY . .',
      'CMD ["node", "dist/main.js"]',
    ],
    expectedOutput: '✓ Labs de containers, CI/CD e deploy liberados',
  },
  'mobile-rn-flutter': {
    filename: 'HomeScreen.tsx',
    runtimeLabel: 'Mobile · React Native & TypeScript',
    lines: [
      'export function calcProgresso(concluidas: number, total: number) {',
      '  if (total === 0) return 0;',
      '  return Math.round((concluidas / total) * 100);',
      '}',
    ],
    expectedOutput: '✓ Lógica mobile e componentes reativos prontos',
  },
  rust: {
    filename: 'main.rs',
    runtimeLabel: 'Rust · Zero-Cost Abstractions',
    lines: [
      'pub fn soma_segura(valores: &[i32]) -> i32 {',
      '    valores.iter().filter(|&&v| v > 0).sum()',
      '}',
      '',
      'fn main() {',
      '    println!("{}", soma_segura(&[10, -2, 15]));',
      '}',
    ],
    expectedOutput: '✓ Toolchain Rust pronta para execução',
  },
  php: {
    filename: 'index.php',
    runtimeLabel: 'PHP 8.3 · Web & APIs',
    lines: [
      '<?php',
      'function formatarProgresso(int $xp): string {',
      '    return "XP acumulado: {$xp}";',
      '}',
      'echo formatarProgresso(250);',
    ],
    expectedOutput: '✓ Runtime PHP pronto para desafios backend',
  },
  undecided: {
    filename: 'primeira-missao.ts',
    runtimeLabel: 'Trilha Guiada · Sandbox Híbrido',
    lines: [
      '// Comece com passos guiados pela nossa Tutora IA',
      'function proximoPasso(nivel: string): string {',
      '  return `Explorar primeira missão (${nivel})`;',
      '}',
      '',
      "console.log(proximoPasso('Personalizado'));",
    ],
    expectedOutput: '✓ Workspace flexível configurado com exemplos guiados',
  },
};

export function getWorkspaceStarterTemplate(techId: string): WorkspaceStarterTemplate {
  return TECH_STARTER_TEMPLATES[techId] ?? TECH_STARTER_TEMPLATES.typescript;
}
