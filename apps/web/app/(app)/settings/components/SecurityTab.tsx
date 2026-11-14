'use client';

import React from 'react';

function UnavailableCard({
  icon,
  title,
  badge,
  description,
}: {
  icon: string;
  title: string;
  badge: string;
  description: string;
}) {
  return (
    <div className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
            <span aria-hidden="true">{icon}</span>
            <span>{title}</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed max-w-2xl">{description}</p>
        </div>
        <span className="shrink-0 bg-[#121624] text-zinc-300 border border-[#1C2338] text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase">
          {badge}
        </span>
      </div>
    </div>
  );
}

export const SecurityTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <UnavailableCard
        icon="🔐"
        title="Autenticação de dois fatores e passkeys"
        badge="Ainda não disponível"
        description="A API atual não expõe registros de 2FA, passkeys ou outros métodos de autenticação desta conta. Por isso, nenhum método é listado como cadastrado e nenhuma ação de cadastro, reconfiguração ou remoção é oferecida nesta tela."
      />

      <UnavailableCard
        icon="💻"
        title="Sessões da conta"
        badge="Registros não disponíveis"
        description="A API atual não fornece a lista de dispositivos autenticados nem uma operação para encerrar sessões de outros dispositivos. Nenhum dispositivo é exibido aqui para não apresentar dados de exemplo como se fossem sessões reais da sua conta."
      />

      <UnavailableCard
        icon="🔑"
        title="Alteração de senha"
        badge="Ainda não disponível"
        description="Ainda não há um endpoint de alteração de senha disponível para esta área. O formulário foi removido para não simular uma atualização que não aconteceria no servidor."
      />
    </div>
  );
};
