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
          {badge}
        </span>
      </div>
    </div>
  );
}

// B42 (Sprint 14) — esta aba exibia controles de personalização da
// tutora (rigidez, verbosidade, modo entrevista, linguagem padrão)
// com um botão "Salvar" que simulava sucesso via setTimeout: não
// havia chamada de API, persistência nem qualquer consumidor dessas
// preferências no produto. Como a API não possui endpoint de
// preferências da tutora, a aba passou a declarar a indisponibilidade
// em vez de fingir um salvamento que nunca acontecia.
export const TutorPreferencesTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <UnavailableCard
        icon="🧠"
        title="Personalização da tutora"
        badge="Ainda não disponível"
        description="A API atual não possui um endpoint de preferências da tutora: ajustes de rigidez pedagógica, verbosidade das dicas e modo entrevista não são salvos no servidor nem aplicados às sessões de mentoria. Os controles foram removidos para não confirmar um salvamento que nunca acontecia — quando o endpoint existir, as opções voltam a esta aba salvando de verdade."
      />

      <UnavailableCard
        icon="⚙️"
        title="Parâmetros de sessão e de IDE"
        badge="Ainda não disponível"
        description="Linguagem padrão de sandbox, formatação automática ao enviar e validações estritas também dependiam do mesmo salvamento inexistente e seguiam sem efeito sobre a IDE. Nenhum parâmetro é exibido como ativo nesta tela enquanto ele não puder ser persistido e aplicado de fato."
      />
    </div>
  );
};
