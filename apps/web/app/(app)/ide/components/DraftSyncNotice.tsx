'use client';

import { useActivityDraftSync } from '../useActivityDraftSync';

export function DraftSyncNotice({ sync }: { sync: ReturnType<typeof useActivityDraftSync> }) {
  if (sync.state.phase === 'error') {
    return <p role="alert" className="p-3 text-xs text-amber-300">
      Não foi possível sincronizar o rascunho. A cópia desta aba foi mantida.{' '}
      <button type="button" className="underline" onClick={sync.retry}>Tentar novamente</button>
    </p>;
  }
  if (sync.state.phase === 'conflict') {
    return <div role="alert" className="p-3 text-xs text-amber-300">
      Existe outra versão salva. Escolha qual rascunho manter:
      <div className="mt-2 flex flex-wrap gap-3">
        <button type="button" className="underline" onClick={sync.useLocal}>Manter versão desta aba</button>
        <button type="button" className="underline" onClick={sync.useRemote}>Usar versão salva</button>
      </div>
    </div>;
  }
  return null;
}
