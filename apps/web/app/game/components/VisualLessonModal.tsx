'use client';

/**
 * VisualLessonModal.tsx
 * NEXUS CODE - Modal de Lição Visual & Modo Zen (v2.0)
 * 
 * Acionado quando o jogador interage com objetos no mapa (computadores, estantes, NPCs):
 * - Modo Zen: Zero cronômetros, leitura relaxante e focada
 * - Metáforas Visuais: Caixas de memória 📦, xícaras de café ☕, ponteiros laser 🎯
 * - Snippets de código didáticos em JetBrains Mono com syntax highlighting
 * - Anotações do Mascote Gato Preto com pergunta de reflexão socrática
 * - Botão "Marcar como Compreendido" concedendo XP ao jogador e companion
 */

import React, { useState } from 'react';
import { useGameStore } from '../stores/useGameStore';
import { AudioSynthesizer } from '../engine/AudioSynthesizer';

export interface VisualLessonContent {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  icon: string;
  metaphorTitle: string;
  metaphorDesc: string;
  metaphorIcon: string;
  codeSnippet: string;
  codeLanguage: string;
  catNote: string;
  socraticQuestion: string;
  xpReward: number;
}

export const LESSONS_DATABASE: Record<string, VisualLessonContent> = {
  python_variables: {
    id: 'python_variables',
    title: 'Variáveis & Atribuição de Dados',
    subtitle: 'A base da memória: como um programa guarda e rotula informações',
    category: 'Fundamentos de Algoritmos',
    icon: '📦',
    metaphorTitle: 'A Metáfora da Caixa Etiquetada 📦',
    metaphorDesc:
      'Imagine que a memória RAM do computador é uma enorme sala de encomendas. Quando você cria uma variável em Python, como `mana = 100`, você pega uma caixa de papelão, escreve a etiqueta "mana" nela e guarda o número 100 dentro. Se mais tarde você fizer `mana = 80`, você simplesmente abre a mesma caixa, retira o 100 e coloca o 80.',
    metaphorIcon: '📦',
    codeSnippet: `# 1. Criando caixas de dados com rótulos semânticos
player_name = "Nexus Runner"
health_points = 100
is_alive = True

# 2. Reatribuindo novos valores conforme a batalha progride
health_points = health_points - 25
print(f"{player_name} tem {health_points} HP restantes.")`,
    codeLanguage: 'python',
    catNote:
      'Miau! Em linguagens dinâmicas como Python, a etiqueta não se importa se a caixa guarda um número ou um texto, mas use nomes claros para não se perder na masmorra!',
    socraticQuestion:
      'Se você fizer `x = 10` e depois `y = x`, quantas caixas de dados existem na memória e o que acontece se você mudar `x` para 20?',
    xpReward: 50,
  },
  ts_types: {
    id: 'ts_types',
    title: 'Tipagem Estrita & Formatos Incompatíveis',
    subtitle: 'Por que o TypeScript blinda seu código antes mesmo de rodar',
    category: 'TypeScript & Reatividade',
    icon: '☕',
    metaphorTitle: 'A Metáfora das Xícaras e Encaixes ☕',
    metaphorDesc:
      'Pense nos tipos como xícaras de café moldadas sob medida. Uma xícara de cappuccino redonda só aceita líquidos cremosos, enquanto um copo de tubulação reta só aceita canudos específicos. Se você tentar despejar um bloco cúbico de gelo (texto) dentro do furo redondo da xícara (número), o compilador apita imediatamente impedindo que você quebre a mesa em produção!',
    metaphorIcon: '☕',
    codeSnippet: `// 1. Definindo o formato estrito da xícara (Interface)
interface PlayerHero {
  readonly id: string;
  name: string;
  level: number;
  skills: string[];
}

// 2. O TypeScript impede erros em tempo de compilação
const hero: PlayerHero = {
  id: "hero_01",
  name: "Scripty Trainer",
  level: 1,
  skills: ["Reactive Pulse"],
};`,
    codeLanguage: 'typescript',
    catNote:
      'Purrr... Erros de compilação são seus amigos fiéis! É muito mais rápido o TypeScript avisar que a xícara transbordou do que seu cliente ligar às 3 da manhã.',
    socraticQuestion:
      'Qual é a diferença fundamental entre descobrir um erro de tipo no seu editor vs. descobri-lo em tempo de execução no navegador do usuário?',
    xpReward: 60,
  },
  loops_iteration: {
    id: 'loops_iteration',
    title: 'Estruturas de Repetição & Esteiras Rolantes',
    subtitle: 'Automatizando tarefas repetitivas sem cansaço',
    category: 'Controle de Fluxo',
    icon: '🔄',
    metaphorTitle: 'A Metáfora da Esteira Industrial 🔄',
    metaphorDesc:
      'Imagine uma fábrica onde caixas chegam por uma esteira rolante. O loop `for` é o braço robótico que pega caixa por caixa, aplica um carimbo e a libera para o estoque. O loop só para quando a esteira esvaziar, ou se o sensor de segurança (`break`) detectar um defeito.',
    metaphorIcon: '🔄',
    codeSnippet: `// Processando cada item da coleção
const scores = [85, 92, 78, 96, 88];
let total = 0;

for (const score of scores) {
  total += score;
}

const average = total / scores.length;
console.log("Média de desempenho:", average);`,
    codeLanguage: 'javascript',
    catNote:
      'Miau! Tenha sempre certeza de que seu loop tem fim! Um loop infinito consome toda a CPU do computador e deixa o gato tonto!',
    socraticQuestion:
      'Quando é mais vantajoso usar um loop `while` em vez de um loop `for`?',
    xpReward: 55,
  },
};

export const VisualLessonModal: React.FC = () => {
  const activeLessonId = useGameStore((s) => s.activeLessonId);
  const closeVisualLesson = useGameStore((s) => s.closeVisualLesson);
  const addXp = useGameStore((s) => s.addXp);
  const addBits = useGameStore((s) => s.addBits);
  const addPetXp = useGameStore((s) => s.addPetXp);
  const setCatMood = useGameStore((s) => s.setCatMood);
  const setCatMessage = useGameStore((s) => s.setCatMessage);

  const [hasReflected, setHasReflected] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'metaphor' | 'code' | 'socratic'>('metaphor');

  const audio = AudioSynthesizer.getInstance();

  if (!activeLessonId) return null;

  const lesson: VisualLessonContent =
    LESSONS_DATABASE[activeLessonId] || LESSONS_DATABASE.python_variables;

  const handleComplete = () => {
    void audio.playVictory();
    addXp(lesson.xpReward);
    addBits(20);
    addPetXp(lesson.xpReward);
    setCatMood('celebrate');
    setCatMessage(`Parabéns! Você concluiu a lição de ${lesson.title}! (+${lesson.xpReward} XP)`);

    closeVisualLesson();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-fadeIn">
      {/* Moldura Dark Obsidian */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border-2 border-cyan-500/50 bg-[#060A18] shadow-[0_0_60px_rgba(0,229,255,0.25)] overflow-hidden">
        {/* Header Zen */}
        <div className="flex items-center justify-between border-b border-cyan-900/60 bg-[#0A1224] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl select-none p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/30">
              {lesson.icon}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00E5FF] bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-800">
                  {lesson.category}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#04D361] animate-pulse" />
                  <span>MODO ZEN // SEM PRESSÃO DE TEMPO</span>
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-heading font-black text-white mt-0.5">
                {lesson.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={closeVisualLesson}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold border border-slate-700 transition"
            title="Fechar Lição"
          >
            ✕
          </button>
        </div>

        {/* Subheader / Subtítulo */}
        <div className="bg-[#040814] px-6 py-2.5 border-b border-cyan-950 font-mono text-xs text-slate-300">
          {lesson.subtitle}
        </div>

        {/* Abas da Lição */}
        <div className="flex border-b border-cyan-950 bg-[#070D1E] px-6">
          {[
            { id: 'metaphor', label: '1. Metáfora Visual 📦' },
            { id: 'code', label: '2. Código Didático 💻' },
            { id: 'socratic', label: '3. Reflexão Socrática 🐈‍⬛' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as typeof activeTab);
                void audio.playTone({ frequency: 600, duration: 0.04, type: 'sine' });
              }}
              className={`py-3 px-4 font-mono text-xs font-bold transition border-b-2 ${
                activeTab === tab.id
                  ? 'border-[#00E5FF] text-[#00E5FF]'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Área Central com Scroll Confortável */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Aba 1: Metáfora Visual */}
          {activeTab === 'metaphor' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Card da Metáfora Concreta */}
              <div className="p-6 rounded-2xl border border-cyan-500/40 bg-[#0A1328]/90 shadow-lg relative overflow-hidden">
                <div className="flex items-start gap-4">
                  <span className="text-5xl select-none p-3 rounded-2xl bg-[#040714] border border-cyan-500/30">
                    {lesson.metaphorIcon}
                  </span>
                  <div>
                    <h4 className="text-lg font-heading font-black text-[#00E5FF] mb-2">
                      {lesson.metaphorTitle}
                    </h4>
                    <p className="font-sans text-sm text-slate-200 leading-relaxed">
                      {lesson.metaphorDesc}
                    </p>
                  </div>
                </div>
              </div>

              {/* Diagrama Visual Conceitual */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-[#040714]">
                <h5 className="font-mono text-xs text-slate-400 uppercase tracking-wider mb-3">
                  DIAGRAMA DE FLUXO MENTAL:
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center font-mono text-xs">
                  <div className="p-3 rounded-xl bg-[#0A1428] border border-cyan-900/60">
                    <div className="text-xl mb-1">🏷️ Rótulo</div>
                    <div className="text-cyan-300 font-bold">Identificador Único</div>
                    <div className="text-[10px] text-slate-400 mt-1">Nome no código fonte</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0A1428] border border-cyan-900/60 flex flex-col justify-center">
                    <span className="text-[#04D361] font-bold text-base">➔ ATRIBUIÇÃO (=) ➔</span>
                    <span className="text-[10px] text-slate-400">Armazena na célula</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0A1428] border border-cyan-900/60">
                    <div className="text-xl mb-1">📦 Célula RAM</div>
                    <div className="text-emerald-300 font-bold">Valor em Memória</div>
                    <div className="text-[10px] text-slate-400 mt-1">Bytes alocados</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aba 2: Código Didático */}
          {activeTab === 'code' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between font-mono text-xs text-slate-400">
                <span>EXEMPLO ANOTADO // {lesson.codeLanguage.toUpperCase()}:</span>
                <span className="text-[#04D361]">SINTAXE LIMPA 100% EXPLICADA</span>
              </div>
              <div className="rounded-2xl border border-cyan-900/60 bg-[#02050E] p-4 font-mono text-xs sm:text-sm text-cyan-200 overflow-x-auto shadow-inner leading-relaxed">
                <pre>{lesson.codeSnippet}</pre>
              </div>
            </div>
          )}

          {/* Aba 3: Reflexão Socrática & Gato Preto */}
          {activeTab === 'socratic' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Balão do Mascote Gato Preto */}
              <div className="p-5 rounded-2xl border-2 border-amber-500/40 bg-[#0F1424] flex items-start gap-4 shadow-lg">
                <span className="text-4xl select-none animate-bounce" style={{ animationDuration: '3s' }}>
                  🐈‍⬛
                </span>
                <div>
                  <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-1">
                    ANOTAÇÕES DO MASCOTE GATO PRETO:
                  </div>
                  <p className="font-mono text-xs text-slate-200 leading-relaxed mb-3">
                    {lesson.catNote}
                  </p>
                </div>
              </div>

              {/* Pergunta Reflexiva */}
              <div className="p-5 rounded-2xl border border-cyan-800/60 bg-[#040816]">
                <h5 className="text-xs font-mono font-bold text-[#00E5FF] uppercase tracking-wider mb-2">
                  PROVOCAÇÃO SOCRÁTICA (AUTO-AVALIAÇÃO):
                </h5>
                <p className="font-sans text-sm text-slate-100 leading-relaxed mb-4">
                  "{lesson.socraticQuestion}"
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setHasReflected(true);
                    void audio.playTone({ frequency: 750, duration: 0.08, type: 'triangle' });
                  }}
                  className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition ${
                    hasReflected
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50'
                      : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900'
                  }`}
                >
                  {hasReflected ? '✓ Pensei sobre a pergunta e compreendi o princípio!' : 'Refletir sobre a resposta →'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer com Botão de Conclusão */}
        <div className="border-t border-cyan-950 bg-[#070D1E] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs font-mono text-slate-400">
            Recompensa por compreensão:{' '}
            <strong className="text-[#04D361]">+{lesson.xpReward} XP</strong> e{' '}
            <strong className="text-cyan-400">+20 Bits</strong>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={closeVisualLesson}
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/60 font-mono text-xs text-slate-300 hover:text-white transition"
            >
              Voltar ao Mapa
            </button>
            <button
              type="button"
              onClick={handleComplete}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[#04D361] bg-[#04D361] hover:bg-emerald-400 text-black font-heading font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-950/50 active:scale-95 cursor-pointer"
            >
              <span>MARCAR COMO COMPREENDIDO ✓</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
