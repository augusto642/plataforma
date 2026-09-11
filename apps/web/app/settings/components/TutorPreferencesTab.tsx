'use client';

import React, { useState } from 'react';
import { TutorPreferences, TutorRigidityLevel, TutorVerbosity } from '../types';
import { INITIAL_TUTOR_PREFS } from '../data';

interface TutorPreferencesTabProps {
  onSave: (message: string) => void;
}

export const TutorPreferencesTab: React.FC<TutorPreferencesTabProps> = ({ onSave }) => {
  const [prefs, setPrefs] = useState<TutorPreferences>(INITIAL_TUTOR_PREFS);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      onSave('Preferências do Tutor Socrático salvas com sucesso!');
    }, 500);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. MODO ENTREVISTA FAANG (HERO SWITCH)                                    */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-[#181820] to-[#121217] border border-[#FFA116]/40 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFA116]/15 border border-[#FFA116]/40 flex items-center justify-center text-2xl shrink-0">
              🎯
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-heading">
                  Modo Entrevista FAANG (Hardcore Simulation)
                </h3>
                <span className="bg-[#FFA116]/20 text-[#FFA116] border border-[#FFA116]/40 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  PREMIUM
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-xl leading-relaxed">
                Desativa todas as respostas prontas da IA. O tutor atua como um Staff Engineer entrevistador rigoroso: questiona complexidade assintótica Big-O, edge cases de memória, e exige raciocínio em voz alta sob cronômetro.
              </p>
            </div>
          </div>

          {/* Cyber Toggle Switch */}
          <button
            type="button"
            onClick={() =>
              setPrefs((prev) => ({ ...prev, faangInterviewMode: !prev.faangInterviewMode }))
            }
            className={`w-14 h-8 rounded-full p-1 transition-colors relative self-start sm:self-center cursor-pointer shrink-0 ${
              prefs.faangInterviewMode ? 'bg-[#04D361]' : 'bg-[#27272A]'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white transition-transform ${
                prefs.faangInterviewMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. NÍVEL DE RIGIDEZ PEDAGÓGICA                                            */}
      {/* ========================================================================= */}
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
            <span>🧠</span>
            <span>Nível de Rigidez Pedagógica</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Define o tom e a postura do modelo de IA durante as sessões de depuração de código.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              id: 'gentle' as TutorRigidityLevel,
              title: '🌱 Pedagógico & Gentil',
              desc: 'Explica conceitos do zero, dá analogias intuitivas e sugere próximos passos de forma encorajadora.',
            },
            {
              id: 'balanced' as TutorRigidityLevel,
              title: '⚖️ Balanceado (Padrão)',
              desc: 'Método Socrático clássico. Faz perguntas pontuais que forçam você a identificar o próprio erro.',
            },
            {
              id: 'hardcore' as TutorRigidityLevel,
              title: '🔥 Implacável (Staff Engineer)',
              desc: 'Zero condescendência. Aponta falhas de arquitetura, alocação de memória e exige provas formais de correção.',
            },
          ].map((item) => (
            <label
              key={item.id}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                prefs.rigidity === item.id
                  ? 'bg-[#8257E5]/15 border-[#8257E5] shadow-[0_0_15px_rgba(130,87,229,0.2)]'
                  : 'bg-[#181820] border-[#27272A] hover:border-zinc-600'
              }`}
            >
              <input
                type="radio"
                name="rigidity"
                value={item.id}
                checked={prefs.rigidity === item.id}
                onChange={() => setPrefs({ ...prefs, rigidity: item.id })}
                className="hidden"
              />
              <div>
                <span className="text-xs font-bold text-white block mb-1">{item.title}</span>
                <span className="text-[11px] text-zinc-400 leading-relaxed block">{item.desc}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FORMATO & VERBOSIDADE DAS RESPOSTAS                                     */}
      {/* ========================================================================= */}
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
            <span>📝</span>
            <span>Verbosidade &amp; Formato das Dicas</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Escolha como a mentoria socrática deve formatar o raciocínio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              id: 'concise' as TutorVerbosity,
              title: '⚡ Ultraconciso',
              desc: 'Dicas de no máximo 1 a 2 frases para leitura rápida sem tirar o foco da digitação.',
            },
            {
              id: 'step_by_step' as TutorVerbosity,
              title: '🪜 Passo a Passo Guiado',
              desc: 'Desmembra o problema em subtarefas atômicas guiando a implementação linha a linha.',
            },
            {
              id: 'ascii_diagrams' as TutorVerbosity,
              title: '📐 Diagramas ASCII & Memória',
              desc: 'Gera representações visuais em texto da stack, heap, ponteiros e árvores no terminal.',
            },
          ].map((item) => (
            <label
              key={item.id}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                prefs.verbosity === item.id
                  ? 'bg-[#00E5FF]/10 border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                  : 'bg-[#181820] border-[#27272A] hover:border-zinc-600'
              }`}
            >
              <input
                type="radio"
                name="verbosity"
                value={item.id}
                checked={prefs.verbosity === item.id}
                onChange={() => setPrefs({ ...prefs, verbosity: item.id })}
                className="hidden"
              />
              <div>
                <span className="text-xs font-bold text-white block mb-1">{item.title}</span>
                <span className="text-[11px] text-zinc-400 leading-relaxed block">{item.desc}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. CONFIGURAÇÕES ADICIONAIS & LINGUAGEM                                    */}
      {/* ========================================================================= */}
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white font-heading">
          Ambiente de Execução &amp; Parâmetros de IDE
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 font-bold">
              Linguagem Padrão de Sandbox
            </label>
            <select
              value={prefs.defaultLanguage}
              onChange={(e) =>
                setPrefs({
                  ...prefs,
                  defaultLanguage: e.target.value as TutorPreferences['defaultLanguage'],
                })
              }
              className="w-full bg-[#181820] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#8257E5]"
            >
              <option value="rust">Rust 1.77+ (Cargo &amp; Clippy)</option>
              <option value="go">Go 1.22+ (Goroutines &amp; gRPC)</option>
              <option value="typescript">TypeScript 5.4+ (Node / Bun)</option>
              <option value="python">Python 3.12+ (Pytest &amp; Type Hints)</option>
              <option value="cpp">C++ 20 (Clang &amp; Sanitizers)</option>
            </select>
          </div>

          <div className="space-y-3 pt-2">
            {/* Auto format */}
            <label className="flex items-center justify-between p-2 rounded-xl bg-[#181820] border border-[#27272A] cursor-pointer">
              <span className="text-xs text-zinc-300 font-semibold">
                Formatar código automaticamente ao enviar (rustfmt / gofmt / prettier)
              </span>
              <input
                type="checkbox"
                checked={prefs.autoFormatCodeOnSubmit}
                onChange={(e) =>
                  setPrefs({ ...prefs, autoFormatCodeOnSubmit: e.target.checked })
                }
                className="w-4 h-4 accent-[#04D361]"
              />
            </label>

            {/* Strict Big-O */}
            <label className="flex items-center justify-between p-2 rounded-xl bg-[#181820] border border-[#27272A] cursor-pointer">
              <span className="text-xs text-zinc-300 font-semibold">
                Validação estrita de complexidade Big-O nos benchmarks
              </span>
              <input
                type="checkbox"
                checked={prefs.strictBigOChecks}
                onChange={(e) =>
                  setPrefs({ ...prefs, strictBigOChecks: e.target.checked })
                }
                className="w-4 h-4 accent-[#04D361]"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00B37E] to-[#04D361] hover:from-[#00875F] hover:to-[#00B37E] text-[#08080B] font-extrabold text-xs transition-all shadow-lg shadow-[#04D361]/25 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span>Salvando Preferências...</span>
            </>
          ) : (
            <span>Salvar Configurações do Tutor</span>
          )}
        </button>
      </div>
    </form>
  );
};
