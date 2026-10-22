'use client';

import React, { useState } from 'react';

/* ============================================================================
   HeroEvolution — o arco de evolução do aluno como protagonista do hero.
   4 estágios selecionáveis; cada um mostra um fragmento de UI real da
   plataforma, subindo de sofisticação: jogo → projeto → IDE → evidências.
   Somente tokens do sistema (superfícies, ink, brand) — nenhum hex novo.
   ========================================================================== */

interface StageMeta {
  id: string;
  level: string;
  name: string;
  short: string;
  desc: string;
}

const STAGES: StageMeta[] = [
  {
    id: 'iniciante',
    level: 'NÍVEL 1',
    name: 'Iniciante',
    short: 'O jogo',
    desc: 'Missões curtas em formato de jogo: você escreve código desde o primeiro exercício e avança por XP, sem instalar nada.',
  },
  {
    id: 'junior',
    level: 'NÍVEL 2',
    name: 'Júnior',
    short: 'A construção',
    // B53 (Sprint 17 · Volta 2) — gramática do caminho: só o estágio 1
    // é o presente (prólogo + cursos introdutórios no ar). Os estágios
    // 2 e 3 são os próximos degraus da jornada, não inventário atual —
    // as descrições ganham a marca do caminho ("próximo degrau",
    // "mais adiante"), e o 4 é nomeado como o que é: o destino.
    desc: 'O próximo degrau do caminho: os exercícios viram construção — funções, listas e arquivos montando o seu primeiro sistema completo, com testes.',
  },
  {
    id: 'pleno',
    level: 'NÍVEL 3',
    name: 'Pleno',
    short: 'O profissional',
    desc: 'Mais adiante no caminho, o treino vira trabalho: frameworks, testes reais e a IDE completa, no mesmo padrão usado nas empresas.',
  },
  {
    id: 'mercado',
    level: 'DESTINO',
    name: 'Mercado',
    short: 'A prova',
    desc: 'O destino da jornada: tudo o que você construiu vira um portfólio público de evidências — a prova que qualquer empresa busca antes de te chamar.',
  },
];

/* ---------- helpers de apresentação ---------- */

const Chip: React.FC<{ children: React.ReactNode; tone?: 'brand' | 'green' | 'muted' }> = ({ children, tone = 'muted' }) => {
  const cls =
    tone === 'brand'
      ? 'bg-brand-purple-low border-border-brand text-brand-purple-light'
      : tone === 'green'
        ? 'bg-surface-2 border-brand-green-neon/40 text-brand-green-neon'
        : 'bg-surface-2 border-border-1 text-ink-span';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold tracking-wider ${cls}`}>
      {children}
    </span>
  );
};

const Check: React.FC = () => (
  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M2.5 7.5 5.8 10.5 11.5 3.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface CodeLine {
  indent?: number;
  node: React.ReactNode;
}

const CodeBlock: React.FC<{ lines: CodeLine[] }> = ({ lines }) => (
  <div className="rounded-xl border border-border-1 bg-surface-2 p-4 font-mono text-[11.5px] sm:text-xs leading-[1.75] overflow-x-auto">
    {lines.map((line, i) => (
      <div key={i} className="flex gap-3 whitespace-pre">
        <span className="select-none text-ink-span/50 w-4 text-right shrink-0">{i + 1}</span>
        <span style={{ paddingLeft: `${(line.indent ?? 0) * 16}px` }} className="text-ink-body">
          {line.node}
        </span>
      </div>
    ))}
  </div>
);

const K: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="text-brand-purple-light">{children}</span>;
const F: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="text-focus">{children}</span>;
const S: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="text-brand-green-neon">{children}</span>;
const N: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="text-brand-amber">{children}</span>;

/* ---------- Estágio 1 · Iniciante: a missão (o jogo) ---------- */

const StageGame: React.FC = () => {
  // Arena 5×4: caminho do herói (3 → direita, 2 ↓) até o cristal.
  // Sprint 10 (B36) — a análise profunda apontou o tabuleiro "apagado":
  // 14 de 20 células eram fundo morto. Agora a arena tem cenário
  // (pinheiros como obstáculo, na linguagem do próprio jogo) e as
  // células vazias ganham relevo de tile, não de vazio.
  const pathCells = new Set(['0-1', '1-1', '2-1', '3-1', '3-2', '3-3']);
  const treeCells = new Set(['4-0', '0-2', '4-2', '1-3']);
  const heroCell = '0-1';
  const crystalCell = '3-3';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <Chip tone="brand">MISSÃO 01 · A CLAREIRA</Chip>
        <Chip tone="green">RECOMPENSA +50 XP</Chip>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="font-sans text-sm text-ink-body leading-relaxed mb-3">
            Faça o herói chegar ao cristal <strong className="text-ink-heading">escrevendo comandos</strong> — nada de
            arrastar bloquinhos: é JavaScript de verdade.
          </p>
          <CodeBlock
            lines={[
              { node: <><K>function</K> <F>inicio</F>() {'{'}</> },
              { indent: 1, node: <>heroi.<F>andar</F>(<N>3</N>);</> },
              { indent: 1, node: <>heroi.<F>virar</F>(<S>"baixo"</S>);</> },
              { indent: 1, node: <>heroi.<F>andar</F>(<N>2</N>);</> },
              { node: '}' },
            ]}
          />
        </div>

        <div className="flex flex-col">
          <div className="rounded-xl border border-border-1 bg-surface-2 p-3 flex-1 flex flex-col">
            <div className="grid grid-cols-5 gap-1.5 flex-1">
              {Array.from({ length: 20 }).map((_, i) => {
                const key = `${i % 5}-${Math.floor(i / 5)}`;
                const isPath = pathCells.has(key);
                const isHero = key === heroCell;
                const isCrystal = key === crystalCell;
                const isTree = treeCells.has(key);
                return (
                  <div
                    key={key}
                    className={`min-h-[42px] rounded-md flex items-center justify-center border ${
                      isHero
                        ? 'bg-brand-purple border-border-brand'
                        : isPath
                          ? 'bg-brand-purple-low border-border-brand/50'
                          : 'bg-surface-1 border-border-2'
                    }`}
                  >
                    {isHero && (
                      <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center" aria-label="Herói">
                        <span className="w-2 h-2 rounded-full bg-brand-purple" />
                      </span>
                    )}
                    {isCrystal && (
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="text-focus" aria-label="Cristal">
                        <path d="M8 1.5 13.5 6 8 14.5 2.5 6 8 1.5Z" fill="currentColor" />
                      </svg>
                    )}
                    {isTree && (
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="text-brand-green/60" aria-hidden="true">
                        <path d="M8 1.5 12.5 8h-2.6L13.5 12.5h-11L6.1 8H3.5L8 1.5Z" fill="currentColor" />
                        <rect x="7.3" y="12.5" width="1.4" height="2" fill="currentColor" />
                      </svg>
                    )}
                    {!isHero && !isCrystal && !isTree && !isPath && (
                      <span className="w-1 h-1 rounded-full bg-ink-span/30" aria-hidden="true" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-3 text-[10px] font-mono text-ink-span">
              <span>ARENA · MISSÃO 1 DE 12</span>
              <span className="text-ink-body font-bold">JAVASCRIPT</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2 border border-brand-green-neon/40 text-brand-green-neon text-[10px] font-mono font-bold">
              <Check /> TESTES 3/3 APROVADOS
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface-2 border border-border-1 text-ink-span text-[10px] font-mono font-bold">
              PRÓXIMO NÍVEL: JÚNIOR
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- Estágio 2 · Júnior: o primeiro sistema (a construção) ---------- */

const StageProject: React.FC = () => {
  const steps = [
    { label: 'Cadastrar e listar livros', state: 'done' },
    { label: 'Registrar empréstimos', state: 'done' },
    { label: 'Controlar devoluções', state: 'done' },
    { label: 'Relatório de livros em atraso', state: 'current' },
    { label: 'Testes do projeto', state: 'todo' },
  ] as const;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <Chip tone="brand">PROJETO GUIADO · SEU PRIMEIRO SISTEMA</Chip>
        <Chip>6 DE 9 ETAPAS</Chip>
      </div>

      <h4 className="font-heading font-bold text-ink-heading text-base sm:text-lg mb-1">Sistema de Biblioteca</h4>
      <p className="font-sans text-sm text-ink-body leading-relaxed mb-4 max-w-xl">
        Estrutura de projeto, dados persistidos e testes: o seu primeiro sistema completo, construído como no trabalho real.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border-1 bg-surface-2 p-4 font-mono text-xs leading-[1.9] text-ink-body overflow-x-auto">
          <div className="text-ink-heading font-bold">sistema-biblioteca/</div>
          <div><span className="text-ink-span">├─ </span>app.py</div>
          <div><span className="text-ink-span">├─ </span>livros.py</div>
          <div><span className="text-ink-span">├─ </span>emprestimos.py</div>
          <div><span className="text-ink-span">├─ </span>relatorios.py</div>
          <div><span className="text-ink-span">└─ </span>testes/</div>
          <div className="mt-3 pt-3 border-t border-border-1 font-sans text-[11px] leading-relaxed text-ink-span">
            Linguagem: <span className="text-ink-body font-semibold">Python</span> · base aplicada: funções, listas,
            dicionários e arquivos.
          </div>
        </div>

        <div className="rounded-xl border border-border-1 bg-surface-2 p-4">
          <div className="text-[10px] font-mono font-bold tracking-wider text-ink-span mb-3">ETAPAS DO PROJETO</div>
          <ul className="space-y-2.5">
            {steps.map((step) => (
              <li key={step.label} className="flex items-center gap-2.5 text-sm font-sans">
                {step.state === 'done' && (
                  <span className="w-5 h-5 rounded-full bg-surface-3 border border-brand-green-neon/50 text-brand-green-neon flex items-center justify-center shrink-0">
                    <Check />
                  </span>
                )}
                {step.state === 'current' && (
                  <span className="w-5 h-5 rounded-full bg-brand-purple border border-border-brand flex items-center justify-center shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  </span>
                )}
                {step.state === 'todo' && (
                  <span className="w-5 h-5 rounded-full bg-surface-3 border border-border-2 shrink-0" />
                )}
                <span className={step.state === 'todo' ? 'text-ink-span' : 'text-ink-body'}>
                  {step.label}
                  {step.state === 'current' && (
                    <span className="ml-2 text-[10px] font-mono font-bold text-brand-purple-light">VOCÊ ESTÁ AQUI</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

/* ---------- Estágio 3 · Pleno: a IDE completa (o profissional) ---------- */

const StageIde: React.FC = () => {
  const tests = [
    { name: 'GET /produtos → 200', ms: '41ms', hidden: false },
    { name: 'paginação limita 20 itens', ms: '38ms', hidden: false },
    { name: 'filtro por categoria', ms: '44ms', hidden: false },
    { name: 'caso limite', ms: '39ms', hidden: true },
    { name: 'caso limite', ms: '42ms', hidden: true },
  ];

  return (
    <div className="rounded-xl border border-border-1 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-surface-2 border-b border-border-1 text-[11px] font-mono">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-2.5 py-1 rounded-md bg-surface-3 text-ink-heading font-bold truncate">api-produtos.ts</span>
          <span className="text-ink-span hidden sm:inline">testes</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-ink-span hidden md:inline">TypeScript</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-purple text-white font-bold">
            <svg width="8" height="9" viewBox="0 0 10 11" fill="none" aria-hidden="true">
              <path d="M1 1.2v8.6c0 .8.9 1.3 1.6.9l6.8-4.3c.6-.4.6-1.4 0-1.8L2.6.3C1.9-.1 1 .4 1 1.2Z" fill="currentColor" />
            </svg>
            Executar código
          </span>
        </div>
      </div>

      {/* Sprint 10 (B36) — o fragmento da IDE ocupava uma coluna de
          ~metade da página, mas o layout interno era de 3 colunas de
          largura lg: o desafio espremia em ~110px e código/testes
          truncavam nas bordas. Agora o fragmento é empilhado na
          largura real do slot: desafio em faixa, código em largura
          total e testes em 2 colunas. */}
      <div className="bg-surface-1">
        <div className="p-4 border-b border-border-1 flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="min-w-0 flex-1">
            <Chip tone="brand">DESAFIO · NÍVEL PLENO</Chip>
            <h4 className="font-heading font-bold text-ink-heading text-sm mt-3 mb-1.5">API de produtos</h4>
            <p className="font-sans text-xs text-ink-body leading-relaxed">
              Implemente o endpoint de listagem com paginação e filtro por categoria. Travou? A tutora pede a próxima
              dica — ela nunca entrega a solução.
            </p>
          </div>
          <div className="rounded-lg bg-surface-2 border border-border-1 p-2.5 font-mono text-[10.5px] leading-relaxed text-ink-body shrink-0">
            <span className="text-ink-span">ENTRADA</span>
            <br />GET /produtos?pagina=2
            <br />
            <span className="text-ink-span">SAÍDA</span>
            <br />{'{ itens: […20], total }'}
          </div>
        </div>

        <div className="p-4 border-b border-border-1">
          <CodeBlock
            lines={[
              { node: <><K>export async function</K> <F>listarProdutos</F>(</> },
              { indent: 1, node: <>pagina: <K>number</K>,</> },
              { indent: 1, node: <>categoria?: <K>string</K></> },
              { node: <>) {'{'}</> },
              { indent: 1, node: <><K>const</K> itens = <K>await</K> db.produtos</> },
              { indent: 2, node: <>.<F>filtrar</F>(categoria)</> },
              { indent: 2, node: <>.<F>paginar</F>(pagina, <N>20</N>);</> },
              { indent: 1, node: <><K>return</K> {'{'} itens, total: itens.length {'}'};</> },
              { node: '}' },
            ]}
          />
        </div>

        <div className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <span className="text-[10px] font-mono font-bold tracking-wider text-ink-span">
              TESTES · EXECUTADOS NO SERVIDOR
            </span>
            <span className="font-heading font-bold text-ink-heading text-sm">
              7 de 7 testes aprovados{' '}
              <span className="text-[11px] text-ink-span font-mono font-normal">· Pontuação: 100 / 100</span>
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {tests.map((t, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg bg-surface-2 border border-border-1 px-3 py-1.5 text-[11.5px] font-sans"
              >
                <span className="text-brand-green-neon shrink-0">
                  <Check />
                </span>
                <span className="text-ink-body truncate">{t.name}</span>
                {t.hidden && (
                  <span className="ml-auto shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-surface-3 text-ink-span">
                    OCULTO
                  </span>
                )}
                <span className={`shrink-0 text-[10.5px] font-mono text-ink-span ${t.hidden ? '' : 'ml-auto'}`}>{t.ms}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 px-4 py-2.5 bg-surface-2 border-t border-border-1 text-[10.5px] font-mono text-ink-span">
        <span>ambiente: sandbox Linux</span>
        <span>tempo total: 0,42s</span>
        <span>veredito: testes reais, não gabarito</span>
      </div>
    </div>
  );
};

/* ---------- Estágio 4 · Mercado: o perfil de evidências (a prova) ---------- */

const StageProfile: React.FC = () => {
  const rows = [
    { skill: 'Lógica de Programação', evidence: '38 desafios aprovados', hash: 'sha-256 · 9f2c…a41b' },
    { skill: 'Python', evidence: '214 testes aprovados no servidor', hash: 'sha-256 · 51be…07d3' },
    { skill: 'JavaScript', evidence: '17 sistemas simples entregues', hash: 'sha-256 · c804…9e2f' },
    { skill: 'Projeto · Nível Pleno', evidence: 'API de produtos — código e testes públicos', hash: 'sha-256 · 3d77…b6a0' },
  ];

  return (
    <div className="rounded-xl border border-border-1 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-4 bg-surface-2 border-b border-border-1">
        <span className="w-11 h-11 rounded-xl bg-brand-purple text-white font-heading font-black flex items-center justify-center shrink-0">
          MD
        </span>
        <div className="min-w-0">
          <div className="font-heading font-bold text-ink-heading leading-tight">Marina Duarte</div>
          <div className="text-[11px] font-mono text-ink-span">perfil público · nível Pleno · exemplo ilustrativo</div>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-3 border border-brand-green-neon/40 text-brand-green-neon text-[10px] font-mono font-bold">
          <Check /> VERIFICADO
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm font-sans">
          <thead>
            <tr className="text-[10px] font-mono tracking-wider text-ink-span border-b border-border-1">
              <th className="px-4 sm:px-5 py-2.5 font-bold">HABILIDADE</th>
              <th className="px-4 sm:px-5 py-2.5 font-bold">EVIDÊNCIA</th>
              <th className="px-4 sm:px-5 py-2.5 font-bold hidden sm:table-cell">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.skill} className="border-b border-border-1 last:border-b-0">
                <td className="px-4 sm:px-5 py-3 text-ink-heading font-semibold whitespace-nowrap">{row.skill}</td>
                <td className="px-4 sm:px-5 py-3 text-ink-body">
                  {row.evidence}
                  <span className="block text-[11px] font-mono text-ink-span mt-0.5">{row.hash}</span>
                </td>
                <td className="px-4 sm:px-5 py-3 hidden sm:table-cell">
                  <span className="inline-flex items-center gap-1 text-brand-green-neon text-xs font-bold">
                    <Check /> Verificado
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 sm:px-5 py-3.5 bg-surface-2 border-t border-border-1">
        <p className="font-sans text-xs sm:text-[13px] text-ink-body leading-relaxed">
          {/* B53 (Sprint 17 · Volta 2) — o rodapé prometia "empresas
              encontram perfis verificados" e "ponte para vagas": o
              módulo Talent real é o ranking de talentos por curso para
              empresas parceiras, só de alunos que optaram por aparecer;
              a verificação pública sem login é a do certificado. */}
          No <strong className="text-ink-heading">módulo Talent</strong>, empresas parceiras veem o ranking de
          talentos por curso — só de alunos que optaram por aparecer. E qualquer pessoa confere um
          certificado pelo código SHA-256, sem login.
        </p>
      </div>
    </div>
  );
};

/* ---------- Componente principal ---------- */

export const HeroEvolution: React.FC = () => {
  const [active, setActive] = useState(0);
  const stage = STAGES[active];

  return (
    <div className="relative w-full">
      <style>{`
        @keyframes evoPanelIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .evo-panel { animation: evoPanelIn 0.45s cubic-bezier(0.22, 1, 0.36, 1); }
        @media (prefers-reduced-motion: reduce) {
          .evo-panel { animation: none; }
        }
      `}</style>

      <div className="relative rounded-[28px] border border-border-2 bg-surface-1 shadow-elev-3xl overflow-hidden">
        {/* Barra de progresso do arco */}
        <div className="px-5 sm:px-6 pt-5">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <span className="text-[10px] font-mono font-bold tracking-widest text-ink-span uppercase">
              Sua evolução na Nexus
            </span>
            <span className="text-[10px] font-mono font-bold tracking-widest text-brand-purple-light uppercase">
              {stage.level} · {active + 1} de 4
            </span>
          </div>
          <div
            className="h-1.5 rounded-full bg-surface-3 overflow-hidden"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={4}
            aria-valuenow={active + 1}
            aria-label="Progresso pelos estágios da jornada"
          >
            <div
              className="h-full rounded-full bg-brand-purple transition-all duration-500"
              style={{ width: `${((active + 1) / STAGES.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Abas dos estágios */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 px-5 sm:px-6 pt-4" role="tablist" aria-label="Estágios da jornada do aluno">
          {STAGES.map((s, i) => {
            const isActive = i === active;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(i)}
                className={`text-left rounded-xl border px-3.5 py-3 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-brand-purple-low border-border-brand shadow-lg shadow-brand-purple/20'
                    : 'bg-surface-2 border-border-1 hover:border-border-2 hover:bg-surface-3'
                }`}
              >
                <span className={`block text-[9.5px] font-mono font-bold tracking-widest ${isActive ? 'text-brand-purple-light' : 'text-ink-span'}`}>
                  {s.level}
                </span>
                <span className={`block font-heading font-black text-sm sm:text-base leading-tight mt-0.5 ${isActive ? 'text-ink-heading' : 'text-ink-body'}`}>
                  {s.name}
                </span>
                <span className={`block text-[11px] font-sans mt-0.5 ${isActive ? 'text-ink-body' : 'text-ink-span'}`}>
                  {s.short}
                </span>
              </button>
            );
          })}
        </div>

        {/* Painel do estágio */}
        <div className="px-5 sm:px-6 py-5">
          <p key={`desc-${stage.id}`} className="evo-panel font-sans text-sm sm:text-[15px] text-ink-body leading-relaxed mb-4 max-w-2xl">
            {stage.desc}
          </p>
          <div key={stage.id} className="evo-panel">
            {stage.id === 'iniciante' && <StageGame />}
            {stage.id === 'junior' && <StageProject />}
            {stage.id === 'pleno' && <StageIde />}
            {stage.id === 'mercado' && <StageProfile />}
          </div>
        </div>

        {/* A guia presente em todos os estágios */}
        <div className="flex items-start sm:items-center gap-3 px-5 sm:px-6 py-4 bg-surface-2 border-t border-border-1">
          <span className="w-9 h-9 rounded-lg bg-brand-purple text-white flex items-center justify-center shrink-0" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.5 14.1 9.9 21.5 12 14.1 14.1 12 21.5 9.9 14.1 2.5 12 9.9 9.9 12 2.5Z" />
            </svg>
          </span>
          <p className="font-sans text-xs sm:text-[13px] text-ink-body leading-relaxed">
            <strong className="text-ink-heading">A tutora de IA acompanha a jornada</strong> — do primeiro comando ao portfólio,
            ela ensina com perguntas e dicas em 3 níveis. A resposta pronta, nunca.
          </p>
          <span className="ml-auto hidden md:inline shrink-0 text-[10px] font-mono font-bold tracking-widest text-ink-span">
            TUTORA SOCRÁTICA
          </span>
        </div>
      </div>
    </div>
  );
};
