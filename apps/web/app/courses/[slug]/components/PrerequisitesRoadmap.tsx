'use client';

import React from 'react';
import { PrerequisiteNode } from '../types';

interface PrerequisitesRoadmapProps {
  nodes: PrerequisiteNode[];
}

export const PrerequisitesRoadmap: React.FC<PrerequisitesRoadmapProps> = ({ nodes }) => {
  return (
    <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6 mb-8 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
            <span>🗺️</span>
            <span>Grafo de Pré-Requisitos &amp; Roadmap de Competências</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Fluxo recomendado para maximizar a absorção sem lacunas conceituais.
          </p>
        </div>
        <span className="text-[11px] font-mono text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/30 px-2.5 py-1 rounded-full hidden sm:inline-block">
          Pipeline Validado
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
        {nodes.map((node, index) => {
          const isMastered = node.status === 'mastered';
          const isCurrent = node.status === 'current';

          return (
            <div
              key={node.id}
              className={`p-4 rounded-xl border relative transition-all ${
                isCurrent
                  ? 'bg-[#8257E5]/10 border-[#8257E5] shadow-[0_0_15px_rgba(130,87,229,0.2)]'
                  : isMastered
                  ? 'bg-[#04D361]/5 border-[#04D361]/30'
                  : 'bg-[#181820] border-[#27272A] opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">
                  Etapa 0{index + 1} • {node.level}
                </span>
                {isMastered && (
                  <span className="text-[10px] font-mono text-[#04D361] bg-[#04D361]/15 px-2 py-0.2 rounded border border-[#04D361]/30 font-bold">
                    ✓ Dominado
                  </span>
                )}
                {isCurrent && (
                  <span className="text-[10px] font-mono text-[#00E5FF] bg-[#00E5FF]/15 px-2 py-0.2 rounded border border-[#00E5FF]/30 font-bold animate-pulse">
                    ● Em Foco
                  </span>
                )}
              </div>

              <h4 className="text-xs font-bold text-white mb-1">{node.title}</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">{node.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
