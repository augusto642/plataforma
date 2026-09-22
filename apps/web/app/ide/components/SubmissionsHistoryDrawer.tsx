'use client';

import React from 'react';

export interface SubmissionHistoryItem {
  id: string;
  createdAt: string;
  status: string;
  score?: number;
  durationMs?: number;
  codeSnippet?: string;
}

interface SubmissionsHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: SubmissionHistoryItem[];
  onSelectSubmission?: (submission: SubmissionHistoryItem) => void;
}

export const SubmissionsHistoryDrawer: React.FC<SubmissionsHistoryDrawerProps> = ({
  isOpen,
  onClose,
  submissions,
  onSelectSubmission,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md h-full bg-[#0E1118] border-l border-[#1E222D] shadow-2xl flex flex-col">
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#1E222D] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>📜</span>
            <h2 className="text-sm font-bold text-white">Histórico de Submissões</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-[#1A1E2B] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Submissions List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {submissions.length === 0 ? (
            <div className="text-center text-xs text-zinc-500 italic py-8">
              Nenhuma submissão registrada para esta atividade.
            </div>
          ) : (
            submissions.map((sub) => (
              <div
                key={sub.id}
                onClick={() => onSelectSubmission?.(sub)}
                className="p-3 rounded-xl bg-[#151821] border border-[#232738] hover:border-[#8257E5]/50 cursor-pointer transition-all flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      sub.status === 'passed'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {sub.status.toUpperCase()}
                  </span>
                  <span className="text-zinc-500 text-[11px]">
                    {new Date(sub.createdAt).toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400 mt-1">
                  <span>Pontuação: {sub.score ?? 0}/100</span>
                  {sub.durationMs && <span>{sub.durationMs}ms</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
