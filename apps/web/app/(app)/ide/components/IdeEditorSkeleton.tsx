'use client';

import React from 'react';

export const IdeEditorSkeleton: React.FC = () => (
  <div className="flex flex-col h-full bg-[#070A13] p-4 font-mono text-xs animate-pulse select-none">
    <div className="flex items-center gap-2 mb-4 text-zinc-600">
      <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
      <div className="w-28 h-3 bg-zinc-800 rounded" />
    </div>
    <div className="space-y-3 text-zinc-700">
      <div className="w-1/3 h-3 bg-zinc-800/80 rounded" />
      <div className="w-2/3 h-3 bg-zinc-800/60 rounded" />
      <div className="w-1/2 h-3 bg-zinc-800/40 rounded" />
      <div className="w-3/4 h-3 bg-zinc-800/60 rounded" />
      <div className="w-2/5 h-3 bg-zinc-800/50 rounded" />
      <div className="w-1/4 h-3 bg-zinc-800/30 rounded" />
    </div>
    <div className="mt-8 flex items-center gap-2 text-zinc-600">
      <span className="inline-block animate-spin text-brand-purple">⚡</span>
      <span className="text-[11px] text-zinc-500">Inicializando Monaco Editor Engine...</span>
    </div>
  </div>
);
