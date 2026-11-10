'use client';

import React from 'react';

// B40/A4 (Sprint 13) — Auditoria & Certificados em estado HONESTO.
// Antes: logs de auditoria inventados (atores, IPs e ações fabricados,
// persistidos em localStorage) e uma lista de certificados fictícia com
// ação simulada de revogar/revalidar. A API atual:
//  - NÃO expõe listagem de logs de auditoria administrativa;
//  - NÃO expõe listagem nem revogação de certificados — só a
//    verificação pública por código (GET /courses/certificates/
//    verify/:code, página /verify), que consulta o registro real.
// Sem endpoint, nada é listado nem simulado aqui (padrão B39).

function UnavailableCard({
  icon,
  title,
  badge,
  description,
  children,
}: {
  icon: string;
  title: string;
  badge: string;
  description: string;
  children?: React.ReactNode;
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
          {children}
        </div>
        <span className="shrink-0 bg-zinc-500/15 text-zinc-300 border border-zinc-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase">
          {badge}
        </span>
      </div>
    </div>
  );
}

export const AdminAuditLogsTab: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-white font-heading">Auditoria &amp; Certificados</h2>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          Nenhum registro de exemplo é exibido nesta área: só dados de endpoints reais.
        </p>
      </div>

      <UnavailableCard
        icon="🧾"
        title="Logs de auditoria administrativa"
        badge="Ainda não disponível"
        description="A API atual não expõe a lista de ações administrativas (quem fez o quê, quando). Os logs fabricados que esta tela mostrava — com atores, endereços IP e ações inventados — foram removidos, e nenhuma ação é registrada localmente como se fosse auditoria de verdade."
      />

      <UnavailableCard
        icon="📜"
        title="Certificados emitidos"
        badge="Listagem não disponível"
        description="Não há endpoint de listagem ou revogação de certificados para o painel. A verificação de autenticidade existe e é pública: qualquer pessoa pode conferir um código real de certificado na página de verificação — ela responde a partir do registro persistido na emissão (e código desconhecido retorna “não encontrado”, nunca “válido”)."
      />
    </div>
  );
};
