'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface SkillNode {
  id: string;
  title: string;
  progressText: string;
  status: 'completed' | 'active' | 'locked' | 'boss';
  icon: string;
  xpReward?: number;
  badgeName?: string;
  prerequisite?: string;
}

interface SkillRoadmapTreeProps {
  nodes: SkillNode[];
  onSelectActiveNode?: () => void;
}

export const SkillRoadmapTree: React.FC<SkillRoadmapTreeProps> = ({
  nodes,
  onSelectActiveNode,
}) => {
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<string | null>(null);

  const handleNodeClick = (node: SkillNode) => {
    if (node.status === 'completed') {
      setSelectedNodeInfo(`✓ Módulo "${node.title}" já concluído com 100% de aproveitamento!`);
    } else if (node.status === 'active') {
      if (onSelectActiveNode) {
        onSelectActiveNode();
      } else {
        setSelectedNodeInfo(`⚡ Módulo Ativo: "${node.title}". Abra o editor para continuar seus exercícios.`);
      }
    } else if (node.status === 'locked') {
      setSelectedNodeInfo(`🔒 Módulo bloqueado. Complete o pré-requisito (${node.prerequisite || 'Módulo anterior'}) para liberar.`);
    } else if (node.status === 'boss') {
      setSelectedNodeInfo(`⚔️ BOSS FIGHT: Sistema de Pagamentos Distribuído de Alta Concorrência (${node.xpReward || 1000} XP + ${node.badgeName || 'Badge Ouro'}). Complete os nós anteriores para desbloquear!`);
    }
  };

  return (
    <section className="bento-card p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#27272A] pb-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>🗺️</span>
            <span>Árvore de Competências & Trilha de Especialização (Skill Tree)</span>
          </h3>
          <p className="text-xs text-[#71717A] mt-0.5">
            Navegue pelos módulos interconectados, desbloqueie nós e enfrente desafios de integração (Boss Fights).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-[#04D361]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#04D361]" /> Concluído
          </span>
          <span className="flex items-center gap-1.5 text-[#8257E5]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8257E5] animate-ping" /> Em Andamento
          </span>
          <span className="flex items-center gap-1.5 text-[#71717A]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3F3F46]" /> Bloqueado
          </span>
          <span className="flex items-center gap-1.5 text-[#F43F5E]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E]" /> Boss Fight
          </span>
        </div>
      </div>

      {/* Info notification bar on click */}
      {selectedNodeInfo && (
        <div className="p-3 bg-[#18181B] border border-[#8257E5]/40 rounded-xl text-xs text-[#EDEDED] flex items-center justify-between animate-fadeIn">
          <span>{selectedNodeInfo}</span>
          <button
            onClick={() => setSelectedNodeInfo(null)}
            className="text-[#A1A1AA] hover:text-white ml-3 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Roadmap Graph Visualizer (SVG Connections + Nodes) */}
      <div className="relative overflow-x-auto py-6">
        <div className="min-w-[900px] flex items-center justify-between relative px-8">
          {/* SVG Connecting Path */}
          <svg
            className="absolute top-1/2 left-0 w-full h-12 -translate-y-1/2 pointer-events-none z-0"
            preserveAspectRatio="none"
          >
            {/* Completed green path */}
            <line
              x1="10%"
              y1="50%"
              x2="50%"
              y2="50%"
              stroke="#00B37E"
              strokeWidth="3"
              strokeDasharray="6 4"
              className="opacity-80"
            />
            {/* In progress purple path */}
            <line
              x1="50%"
              y1="50%"
              x2="70%"
              y2="50%"
              stroke="#8257E5"
              strokeWidth="3"
            />
            {/* Locked gray path */}
            <line
              x1="70%"
              y1="50%"
              x2="90%"
              y2="50%"
              stroke="#27272A"
              strokeWidth="3"
            />
          </svg>

          {nodes.map((node) => {
            if (node.status === 'completed') {
              return (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  className="relative z-10 flex flex-col items-center gap-2 group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#00B37E]/20 border-2 border-[#00B37E] flex items-center justify-center text-xl text-[#04D361] font-bold shadow-lg shadow-[#00B37E]/20 group-hover:scale-110 transition-transform">
                    {node.icon}
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold text-white">{node.title}</div>
                    <div className="text-[10px] text-[#00B37E] font-mono font-bold">
                      {node.progressText}
                    </div>
                  </div>
                </div>
              );
            }

            if (node.status === 'active') {
              return (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  className="relative z-10 flex flex-col items-center gap-2 group cursor-pointer"
                >
                  <div className="relative">
                    <div className="absolute -inset-2 rounded-2xl bg-[#8257E5]/30 pulse-beacon" />
                    <div className="w-16 h-16 rounded-2xl bg-[#8257E5] border-2 border-[#996DFF] flex items-center justify-center text-2xl shadow-xl shadow-[#8257E5]/40 group-hover:scale-110 transition-transform relative z-10 text-white">
                      {node.icon}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold text-[#996DFF]">{node.title}</div>
                    <div className="text-[10px] text-white font-mono bg-[#8257E5]/30 px-1.5 py-0.5 rounded mt-0.5 font-bold border border-[#8257E5]/40">
                      {node.progressText}
                    </div>
                  </div>
                </div>
              );
            }

            if (node.status === 'locked') {
              return (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  className="relative z-10 flex flex-col items-center gap-2 opacity-50 cursor-not-allowed hover:opacity-75 transition-opacity"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#18181B] border-2 border-[#27272A] flex items-center justify-center text-lg text-[#71717A]">
                    {node.icon}
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold text-[#71717A]">{node.title}</div>
                    <div className="text-[10px] text-[#52525B] font-mono">
                      {node.progressText}
                    </div>
                  </div>
                </div>
              );
            }

            // Boss Fight Node
            return (
              <div
                key={node.id}
                onClick={() => handleNodeClick(node)}
                className="relative z-10 flex flex-col items-center gap-2 group cursor-pointer opacity-80 hover:opacity-100 transition-all"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#F43F5E] to-[#FFA116] border-2 border-[#F43F5E] flex items-center justify-center text-2xl shadow-xl shadow-[#F43F5E]/30 group-hover:scale-110 transition-transform">
                  {node.icon}
                </div>
                <div className="text-center">
                  <div className="text-xs font-black text-[#F43F5E] tracking-wide">{node.title}</div>
                  <div className="text-[10px] text-[#FFA116] font-mono font-bold">
                    {node.progressText}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
