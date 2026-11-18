'use client';

import React from 'react';

interface InstructionsPanelProps {
  title: string;
  description: string;
  difficulty?: string;
  language?: string;
  hints?: string[];
  courseTitle?: string;
  editorCollapsed?: boolean;
  onToggleEditor?: () => void;
}

export const InstructionsPanel: React.FC<InstructionsPanelProps> = ({
  title,
  description,
  difficulty,
  language = 'TypeScript',
  hints = [],
  courseTitle,
  editorCollapsed = false,
  onToggleEditor,
}) => {
  return (
    <div className="flex flex-col bg-[#121b1a] text-[#bdcbc3] select-text">
      {onToggleEditor && (
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#2a3935]">
          <span className="text-xs font-semibold text-[#dce8df]">Conteúdo da atividade</span>
          <button
            type="button"
            onClick={onToggleEditor}
            aria-controls="activity-editor"
            aria-expanded={!editorCollapsed}
            className="rounded-lg border border-[#41534a] bg-[#1b2922] px-3 py-2 text-xs font-semibold text-[#dceae0] hover:bg-[#2a3c30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a1e5b7]"
          >
            {editorCollapsed ? 'Mostrar editor' : 'Recolher editor'}
          </button>
        </div>
      )}
      <div className={`p-6 sm:p-8 ${editorCollapsed ? 'w-full max-w-4xl mx-auto' : ''}`}>
      {/* Course Context & Difficulty */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {courseTitle && (
          <span className="text-xs text-[#a3b2ac] font-medium">{courseTitle}</span>
        )}
        <span className="text-[11px] px-2.5 py-1 rounded-md bg-[#94dba30e] text-[#b1e6bf] border border-[#779b7e38] font-semibold">
          {language}
        </span>
        {difficulty && <span className="text-[11px] text-[#a3b2ac]">{difficulty}</span>}
      </div>

      {/* Challenge Title */}
      <h1 className="text-2xl font-semibold text-[#edf5ef] mb-4 tracking-tight">{title}</h1>

      {/* Description */}
      <div className="text-sm text-[#bdcbc3] leading-7">
        <p className="whitespace-pre-wrap">{description}</p>
      </div>

      {hints.length > 0 && (
        <div className="mt-7 p-4 rounded-xl border border-[#8ccf9d24] bg-[#1b2c22]">
          <h2 className="text-sm font-semibold text-[#c1e8ca] mb-2">
            Instruções
          </h2>
          <ul className="space-y-2 text-sm text-[#bdcbc3] leading-6">
            {hints.map((hint, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="whitespace-pre-wrap">{hint}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      </div>
    </div>
  );
};
