'use client';

import React, { useEffect, useRef, useState } from 'react';

interface FrontendPreviewPaneProps {
  code: string;
  language?: string;
  autoRefresh?: boolean;
}

export const FrontendPreviewPane: React.FC<FrontendPreviewPaneProps> = ({
  code,
  language = 'html',
  autoRefresh = true,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewportSize, setViewportSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  // Gera o HTML sandboxed injetando Tailwind CSS e script de captura de logs
  const generateDocumentHtml = (userCode: string) => {
    let bodyContent = userCode;

    // Se for apenas Javascript ou React, envolve em container básico se não tiver tags HTML
    if (!userCode.includes('<html') && !userCode.includes('<!DOCTYPE')) {
      bodyContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #ffffff; color: #0f172a; }
  </style>
  <script>
    // Captura segura de console.log para o parent
    const origLog = console.log;
    console.log = function(...args) {
      origLog.apply(console, args);
      window.parent.postMessage({ type: 'PREVIEW_CONSOLE_LOG', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }, '*');
    };
    window.onerror = function(msg, url, line) {
      window.parent.postMessage({ type: 'PREVIEW_CONSOLE_ERROR', message: msg + ' (linha ' + line + ')' }, '*');
    };
  </script>
</head>
<body>
  ${userCode}
</body>
</html>`;
    }

    return bodyContent;
  };

  const updateIframeContent = () => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(generateDocumentHtml(code));
    doc.close();
    setLastRefreshedAt(new Date());
  };

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setTimeout(() => {
      updateIframeContent();
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [code, autoRefresh]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PREVIEW_CONSOLE_LOG') {
        setConsoleLogs((prev) => [...prev.slice(-19), `[LOG] ${event.data.message}`]);
      } else if (event.data?.type === 'PREVIEW_CONSOLE_ERROR') {
        setConsoleLogs((prev) => [...prev.slice(-19), `[ERRO] ${event.data.message}`]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const getViewportWidthClass = () => {
    switch (viewportSize) {
      case 'mobile':
        return 'w-[375px]';
      case 'tablet':
        return 'w-[768px]';
      case 'desktop':
      default:
        return 'w-full';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0C0F17] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Barra de Ferramentas do Preview */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#121624] border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-white tracking-wide">Live Preview</span>
          <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-[10px]">
            Tailwind CSS 3.4
          </span>
        </div>

        {/* Viewport switcher */}
        <div className="flex items-center gap-1 bg-[#07090E] p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setViewportSize('desktop')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
              viewportSize === 'desktop' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Desktop
          </button>
          <button
            type="button"
            onClick={() => setViewportSize('tablet')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
              viewportSize === 'tablet' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tablet
          </button>
          <button
            type="button"
            onClick={() => setViewportSize('mobile')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
              viewportSize === 'mobile' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Mobile
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={updateIframeContent}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            ↻ Atualizar
          </button>
        </div>
      </div>

      {/* Área de renderização do iframe responsivo */}
      <div className="flex-1 bg-[#181a20] p-4 overflow-auto flex items-center justify-center">
        <div
          className={`${getViewportWidthClass()} h-full bg-white rounded-lg shadow-2xl transition-all duration-300 overflow-hidden border border-slate-700 flex flex-col`}
        >
          <iframe
            ref={iframeRef}
            title="Frontend Preview Sandbox"
            sandbox="allow-scripts allow-modals allow-forms"
            className="w-full h-full border-0 bg-white"
          />
        </div>
      </div>

      {/* Mini console de logs do iframe */}
      {consoleLogs.length > 0 && (
        <div className="border-t border-slate-800 bg-[#07090E] p-2.5 max-h-24 overflow-y-auto text-[11px] font-mono space-y-1">
          <div className="flex items-center justify-between text-slate-500 pb-1 border-b border-slate-800">
            <span>CONSOLE DO PREVIEW ({consoleLogs.length})</span>
            <button
              onClick={() => setConsoleLogs([])}
              className="hover:text-slate-300 text-[10px]"
            >
              limpar
            </button>
          </div>
          {consoleLogs.map((log, i) => (
            <div
              key={i}
              className={log.startsWith('[ERRO]') ? 'text-rose-400' : 'text-slate-300'}
            >
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
