'use client';

import React from 'react';

// Redesign v2 (Central 213) — passo 3 do cadastro: Trilha Sugerida.
// Adaptado de StepTrackSuggestion da trilha dinâmica (Central 209).
// O aluno NÃO escolhe a trilha aqui: a IA sugere com base no perfil e
// nas metas informados no passo anterior. A investigação leva até 2 dias.
//
// DECISÃO DE ARQUITETURA: este branch NÃO inclui o backend da 209 (sem
// módulo dynamic-track, sem migration). Por isso este passo mostra
// SEMPRE o estado "preparando" — nunca uma sugestão inventada. O card
// da trilha sugerida (com motivo + "Começar minha trilha") só existe
// no dashboard (DynamicTrackCard), e só renderiza quando a API
// devolver uma sugestão real.

interface StepTrackSuggestionProps {
  onPrev: () => void;
  onNext: () => void;
  isSubmitting?: boolean;
}

const NEXT_STEPS: Array<{
  icon: string;
  title: string;
  description: string;
  href: string;
  cta: string;
}> = [
  {
    icon: '🚀',
    title: 'Trilha inicial grátis',
    description: 'Comece agora pela primeira missão na IDE.',
    href: '/ide',
    cta: 'Abrir a IDE',
  },
  {
    icon: '🏆',
    title: 'Desafios iniciais',
    description: 'Resolva desafios curtos e ganhe seus primeiros pontos.',
    href: '/desafios',
    cta: 'Ver desafios',
  },
  {
    icon: '📚',
    title: 'Cursos avulsos',
    description: 'Não quer esperar a sugestão? Faça qualquer curso do catálogo.',
    href: '/courses',
    cta: 'Ver cursos',
  },
];

export const StepTrackSuggestion: React.FC<StepTrackSuggestionProps> = ({
  onPrev,
  onNext,
  isSubmitting = false,
}) => {
  return (
    <div style={{ animation: 'fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: 'rgba(130, 87, 229, 0.15)',
            border: '1px solid rgba(130, 87, 229, 0.3)',
            color: '#C4B5FD',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '12px',
          }}
        >
          ✨ Trilha personalizada
        </div>
        <h2
          style={{
            fontSize: '26px',
            fontWeight: 800,
            letterSpacing: '-0.5px',
            color: '#FFF',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          Sua trilha está sendo preparada
        </h2>
        <p style={{ color: '#9499AD', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
          A IA está analisando seu perfil, o mercado e as vagas para montar sua trilha
          personalizada. Ela chega em até 2 dias — avisaremos você aqui na plataforma.
        </p>
        <p style={{ color: '#9499AD', fontSize: '14px', lineHeight: 1.5, margin: '12px 0 0' }}>
          Vamos analisar seu perfil e suas metas — seu motivo, o mercado, a stack,
          os desafios e as vagas — e sugerir a melhor trilha para você. Quando ela
          estiver pronta, avisamos no seu dashboard.
        </p>
      </div>

      {/* Alternativa (brief do cadastro): quem não quiser esperar a
          sugestão faz cursos avulsos — todos destinos reais da
          plataforma, nenhum conteúdo inventado. */}
      <p style={{ color: '#9499AD', fontSize: '14px', lineHeight: 1.5, margin: '0 0 12px' }}>
        Prefere escolher? Veja os cursos avulsos — ou comece agora por aqui:
      </p>

      {/* O que fazer agora */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {NEXT_STEPS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              background: '#151821',
              border: '1px solid #232738',
              borderRadius: '14px',
              padding: '16px',
              textDecoration: 'none',
              transition: 'border-color 0.25s, background 0.25s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(130, 87, 229, 0.6)';
              e.currentTarget.style.background = '#181B26';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#232738';
              e.currentTarget.style.background = '#151821';
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                background: '#1B1E2B',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFF' }}>
                {item.title}
              </div>
              <div style={{ fontSize: '12px', color: '#9499AD', lineHeight: 1.4 }}>
                {item.description}
              </div>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#996DFF', whiteSpace: 'nowrap' }}>
              {item.cta} →
            </span>
          </a>
        ))}
      </div>

      {/* Action Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <button
          type="button"
          onClick={onPrev}
          disabled={isSubmitting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '13px 20px',
            background: '#151821',
            border: '1px solid #232738',
            borderRadius: '12px',
            color: '#9499AD',
            fontSize: '14px',
            fontWeight: 600,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.25s',
            opacity: isSubmitting ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.background = '#1B1E2B';
              e.currentTarget.style.color = '#FFF';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#151821';
            e.currentTarget.style.color = '#9499AD';
            e.currentTarget.style.borderColor = '#232738';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Voltar
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={isSubmitting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '13px 28px',
            background: '#8257E5',
            border: 'none',
            borderRadius: '12px',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 800,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 8px 24px -4px rgba(130, 87, 229, 0.4)',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            opacity: isSubmitting ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.boxShadow = '0 12px 30px -4px rgba(130, 87, 229, 0.65)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 8px 24px -4px rgba(130, 87, 229, 0.4)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {isSubmitting ? 'Criando sua conta…' : '⚡ Criar conta e receber minha trilha'}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
};
