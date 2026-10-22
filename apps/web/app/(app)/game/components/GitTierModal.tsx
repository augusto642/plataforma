'use client';

/**
 * GitTierModal.tsx
 * NEXUS CODE - Real Git Integration Modal via Gitea (PR #04)
 * 
 * Transição da Fase Novice (RPG) para Júnior & Pleno:
 * - Provisionamento instantâneo de repositório Git real no Gitea
 * - Instruções de terminal para git clone, branches e commits
 * - Status de Webhook e fila de avaliação BullMQ
 * - Emissão de Recruiter Dossier verificável criptograficamente
 */

import React, { useState } from 'react';
import { useGameStore } from '../stores/useGameStore';
import { AudioSynthesizer } from '../engine/AudioSynthesizer';

interface GitTierModalProps {
  onClose: () => void;
}

export const GitTierModal: React.FC<GitTierModalProps> = ({ onClose }) => {
  const player = useGameStore((s) => s.player);
  const gitRepo = useGameStore((s) => s.gitRepo);
  const provisionGitRepo = useGameStore((s) => s.provisionGitRepo);

  const [repoNameInput, setRepoNameInput] = useState<string>('nexus-quest-algorithms');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const audio = AudioSynthesizer.getInstance();

  const handleCreateRepo = () => {
    provisionGitRepo(repoNameInput);
    void audio.playTone({ frequency: 880, duration: 0.1, type: 'square' });
  };

  const copyToClipboard = (text: string, idx: number) => {
    void navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    void audio.playTone({ frequency: 950, duration: 0.04, type: 'sine' });
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl border-2 border-[#8257E5] bg-[#060B1A] shadow-2xl shadow-purple-950/80 overflow-hidden font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-900/50 bg-[#0C1226] px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-400 text-lg">
              🐙
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black text-white">
                  GITEA REAL REPO // JÚNIOR & PLENO TIER
                </h3>
                <span className="rounded-md bg-purple-950 px-2 py-0.5 text-[10px] font-bold text-[#8257E5] border border-purple-800">
                  GIT PROTOCOL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Engenharia real: commits assinados, branches e webhooks automáticos.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition"
          >
            ✕ FECHAR
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!gitRepo ? (
            <div className="rounded-2xl border border-purple-900/60 bg-[#0A122A] p-6 text-center">
              <span className="text-4xl block mb-3">🚀</span>
              <h4 className="text-lg font-black text-white mb-2">
                Graduação para o Tier Júnior: Repositório Real
              </h4>
              <p className="text-xs text-slate-300 max-w-lg mx-auto mb-6 leading-relaxed">
                Você já domina os loops do Overworld! Agora é hora de codificar como um engenheiro: submeta seu código via Git CLI e receba avaliação automática de testes por Webhooks.
              </p>

              <div className="max-w-md mx-auto flex items-center space-x-3 mb-4">
                <input
                  type="text"
                  value={repoNameInput}
                  onChange={(e) => setRepoNameInput(e.target.value)}
                  placeholder="nome-do-repositorio"
                  className="flex-1 rounded-xl border border-purple-800 bg-[#030715] px-4 py-2 text-xs text-[#00E5FF] focus:border-[#8257E5] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCreateRepo}
                  className="rounded-xl border border-[#04D361] bg-[#04D361] px-5 py-2 text-xs font-bold text-black hover:bg-emerald-400 transition active:scale-95"
                >
                  PROVISIONAR NO GITEA
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Card de Status do Repositório */}
              <div className="rounded-2xl border border-emerald-500/50 bg-emerald-950/20 p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-bold text-emerald-300">
                      REPOSITÓRIO ATIVO NO GITEA SERVER
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white mt-1">
                    {gitRepo.repoUrl}
                  </div>
                </div>

                <span className="rounded-lg bg-emerald-950 px-3 py-1 text-xs text-emerald-400 border border-emerald-800 font-bold">
                  BRANCH: {gitRepo.branch}
                </span>
              </div>

              {/* Bloco de Comandos Git */}
              <div className="rounded-2xl border border-cyan-900/60 bg-[#040815] p-5">
                <h5 className="text-xs font-bold text-[#00E5FF] mb-3 uppercase">
                  Instruções de Trabalho no seu Terminal Local:
                </h5>

                <div className="space-y-2.5 text-xs">
                  {[
                    { label: '1. Clonar repositório:', cmd: gitRepo.cloneUrl },
                    { label: '2. Criar branch de solução:', cmd: 'git checkout -b feature/minha-solucao' },
                    { label: '3. Fazer commit da resolução:', cmd: 'git commit -am "feat: implement dynamic programming solution"' },
                    { label: '4. Enviar para validação:', cmd: 'git push origin feature/minha-solucao' },
                  ].map((step, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-800 bg-[#080F22] p-2.5 flex items-center justify-between">
                      <div className="truncate mr-3">
                        <span className="text-slate-400 block text-[10px] mb-0.5">{step.label}</span>
                        <code className="text-cyan-300 select-all">{step.cmd}</code>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(step.cmd, idx)}
                        className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[10px] text-slate-300 hover:text-white transition flex-shrink-0"
                      >
                        {copiedIndex === idx ? '✓ COPIADO' : 'COPIAR'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status do Webhook de Testes */}
              <div className="rounded-2xl border border-purple-900/50 bg-[#091126] p-4 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300 font-bold">AUTOMATION PIPELINE // BULLMQ</span>
                  <span className="text-emerald-400 font-bold">WEBHOOK ATIVO (:3030)</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  A cada <code className="text-purple-300">git push</code>, o Gitea envia um payload assinado com HMAC-SHA256 para o NestJS backend na fila BullMQ. Os testes de integração são executados e a nota é sincronizada automaticamente com seu perfil de desenvolvedor.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-purple-900/50 bg-[#0C1226] px-6 py-3 flex items-center justify-between text-xs text-slate-400">
          <span>GITEA CORE v1.24 // PORT 3030</span>
          <span>NEXUS CODE RECRUITER VERIFIED</span>
        </div>
      </div>
    </div>
  );
};
