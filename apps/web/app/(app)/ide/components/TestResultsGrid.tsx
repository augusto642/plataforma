'use client';

import React from 'react';

export interface TestCaseResultItem {
  id: string;
  name: string;
  passed: boolean;
  durationMs?: number;
  errorMessage?: string;
  isHidden?: boolean;
}

interface TestResultsGridProps {
  results: TestCaseResultItem[];
  score?: number;
  maxScore?: number;
  xpEarned?: number;
}

export const TestResultsGrid: React.FC<TestResultsGridProps> = ({
  results,
  score,
  maxScore = 100,
  xpEarned,
}) => {
  if (results.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-zinc-500 italic bg-[#0A0C10] border-t border-[#1E222D]">
        Execute os testes para visualizar a validação dos casos de teste.
      </div>
    );
  }

  const passedCount = results.filter((r) => r.passed).length;
  const isAllPassed = passedCount === results.length;

  return (
    <div className="p-4 bg-[#0A0C10] border-t border-[#1E222D] space-y-4 select-text">
      {/* Score and XP Card */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-[#12151F] border border-[#1E222D]">
        <div className="flex items-center gap-3">
          <span className="text-xl">{isAllPassed ? '🎉' : '⚠️'}</span>
          <div>
            <div className="text-sm font-bold text-white">
              {passedCount} de {results.length} testes aprovados
            </div>
            {score !== undefined && (
              <div className="text-xs text-zinc-400">
                Pontuação: {score} / {maxScore}
              </div>
            )}
          </div>
        </div>

        {xpEarned && xpEarned > 0 && isAllPassed && (
          <div className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs animate-bounce">
            +{xpEarned} XP Conquistados!
          </div>
        )}
      </div>

      {/* Test Cases List */}
      <div className="grid grid-cols-1 gap-2">
        {results.map((test, idx) => (
          <div
            key={test.id || idx}
            className={`p-3 rounded-lg border text-xs flex flex-col gap-1 transition-all ${
              test.passed
                ? 'bg-emerald-950/20 border-emerald-800/30 text-zinc-200'
                : 'bg-red-950/20 border-red-800/30 text-red-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{test.passed ? '✓' : '✗'}</span>
                <span className="font-semibold">{test.name}</span>
                {test.isHidden && (
                  <span className="text-[10px] text-zinc-500 bg-[#1E222D] px-1.5 py-0.5 rounded">
                    Oculto
                  </span>
                )}
              </div>
              {test.durationMs !== undefined && (
                <span className="text-[11px] text-zinc-500">{test.durationMs}ms</span>
              )}
            </div>

            {test.errorMessage && (
              <div className="mt-1 p-2 rounded bg-black/40 text-red-300 font-mono text-[11px] whitespace-pre-wrap">
                {test.errorMessage}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
