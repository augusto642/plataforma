'use client';

import React from 'react';

function UnavailableCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
            <span aria-hidden="true">{icon}</span>
            <span>{title}</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed max-w-2xl">{description}</p>
        </div>
        <span className="shrink-0 bg-zinc-500/15 text-zinc-300 border border-zinc-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase">
          Ainda não disponível
        </span>
      </div>
    </div>
  );
}

export const GitKeysTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <UnavailableCard
        icon="🔑"
        title="Chaves SSH de autenticação Git"
        description="A API atual não possui listagem, cadastro ou remoção de chaves SSH da conta. Nenhuma chave é exibida aqui para não apresentar registros de exemplo como credenciais reais."
      />

      <UnavailableCard
        icon="🛡️"
        title="Chaves GPG de commits verificados"
        description="A API atual não possui listagem, importação ou vínculo de chaves GPG da conta. Nenhuma chave é exibida e nenhum selo de verificação é prometido por esta tela."
      />

      <UnavailableCard
        icon="🎟️"
        title="Personal Access Tokens (PATs)"
        description="A API atual não emite, lista ou revoga tokens pessoais de acesso. Nenhum token é exibido ou gerado aqui; quando esse recurso existir no backend, esta área passará a operar sobre registros reais."
      />
    </div>
  );
};
