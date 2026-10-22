'use client';

import React from 'react';

interface InstructionsPanelProps {
  title: string;
  description: string;
  difficulty?: string;
  language?: string;
  hints?: string[];
  courseTitle?: string;
}

export const InstructionsPanel: React.FC<InstructionsPanelProps> = ({
  title,
  description,
  difficulty = 'Intermediário',
  language = 'TypeScript',
  hints = [],
  courseTitle,
}) => {
  return (
    <div className="flex flex-col h-full bg-[#0D1017] p-6 overflow-y-auto text-zinc-300 select-text border-r border-[#1E222D]">
      {/* Course Context & Difficulty */}
      <div className="flex items-center gap-2 mb-3">
        {courseTitle && (
          <span className="text-xs text-zinc-500 font-medium">{courseTitle} •</span>
        )}
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-950/40 text-purple-400 border border-purple-800/40 font-semibold">
          {language}
        </span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-400 border border-amber-800/40 font-semibold">
          {difficulty}
        </span>
      </div>

      {/* Challenge Title */}
      <h1 className="text-xl font-bold text-white mb-4 tracking-tight">{title}</h1>

      {/* Description */}
      <div className="prose prose-invert prose-sm text-zinc-300 leading-relaxed space-y-4">
        <p className="whitespace-pre-wrap">{description}</p>
      </div>

      {/* Socratic Callout Box */}
      <div className="mt-6 p-4 rounded-xl bg-[#151821] border border-[#232738] shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-[#00E5FF]">
          <span>💡</span>
          <span>Abordagem de Engenharia & Tutoria</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Pense em termos assintóticos (Big-O). Considere casos de borda: entradas vazias, números negativos e limites de memória do sandbox Isolate.
        </p>
      </div>

      {/* Hints */}
      {hints.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Dicas Conceituais
          </h2>
          <ul className="space-y-2 text-xs text-zinc-400">
            {hints.map((hint, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-purple-400">•</span>
                <span>{hint}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
