'use client';

import React from 'react';

export type ExpLevel = 'junior' | 'mid' | 'senior';
export type TimeCommitment = '5h' | '10h' | '20h';
export type CareerGoal = 'global' | 'lead' | 'startup' | 'hackathons';

interface StepGoalsProps {
  expLevel: ExpLevel;
  setExpLevel: (exp: ExpLevel) => void;
  timeCommitment: TimeCommitment;
  setTimeCommitment: (time: TimeCommitment) => void;
  careerGoal: CareerGoal;
  setCareerGoal: (goal: CareerGoal) => void;
  onPrev: () => void;
  onNext: () => void;
}

export const StepGoals: React.FC<StepGoalsProps> = ({
  expLevel,
  setExpLevel,
  timeCommitment,
  setTimeCommitment,
  careerGoal,
  setCareerGoal,
  onPrev,
  onNext,
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
            background: 'rgba(4, 211, 97, 0.15)',
            border: '1px solid rgba(4, 211, 97, 0.3)',
            color: '#6EE7B7',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '12px',
          }}
        >
          🚀 Plano de Vôo
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
          Personalize seu Ritmo e Objetivo
        </h2>
        <p style={{ color: '#9499AD', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
          O Tutor IA socrático calibrará as dicas e a dificuldade dos desafios de acordo com o seu perfil.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', marginBottom: '24px' }}>
        {/* Section 1: Experience Level */}
        <div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#FFF',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>📊 Nível de Experiência Atual</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {[
              { id: 'junior' as ExpLevel, title: 'Iniciante', icon: '🟢', desc: 'Fundamentos de lógica e primeiras aplicações práticas' },
              { id: 'mid' as ExpLevel, title: 'Pleno / Praticante', icon: '🟡', desc: 'Já programa profissionalmente, busca arquitetura e escala' },
              { id: 'senior' as ExpLevel, title: 'Sênior / Lead', icon: '🟣', desc: 'Otimização extrema, sistemas críticos e liderança técnica' },
            ].map((item) => {
              const isSelected = expLevel === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setExpLevel(item.id)}
                  style={{
                    background: isSelected ? 'rgba(130, 87, 229, 0.12)' : '#151821',
                    border: `1px solid ${isSelected ? '#8257E5' : '#232738'}`,
                    borderRadius: '12px',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: isSelected ? '0 0 16px rgba(130, 87, 229, 0.2)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.background = '#1B1E2B';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = '#232738';
                      e.currentTarget.style.background = '#151821';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>{item.title}</span>
                    <span>{item.icon}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#9499AD', lineHeight: 1.3 }}>{item.desc}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Weekly Commitment */}
        <div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#FFF',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>⏱️ Tempo de Dedicação Semanal</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {[
              { id: '5h' as TimeCommitment, title: '5h / semana', icon: '☕', desc: 'Ritmo gradual (~1 lab completo por semana)' },
              { id: '10h' as TimeCommitment, title: '10-15h / semana', icon: '🚀', desc: 'Aceleração contínua (~3 labs/semana • Recomendado)' },
              { id: '20h' as TimeCommitment, title: '20h+ / semana', icon: '🔥', desc: 'Imersão extrema, daily coding e projetos profundos' },
            ].map((item) => {
              const isSelected = timeCommitment === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setTimeCommitment(item.id)}
                  style={{
                    background: isSelected ? 'rgba(130, 87, 229, 0.12)' : '#151821',
                    border: `1px solid ${isSelected ? '#8257E5' : '#232738'}`,
                    borderRadius: '12px',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: isSelected ? '0 0 16px rgba(130, 87, 229, 0.2)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.background = '#1B1E2B';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = '#232738';
                      e.currentTarget.style.background = '#151821';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>{item.title}</span>
                    <span>{item.icon}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#9499AD', lineHeight: 1.3 }}>{item.desc}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Primary Career Goal */}
        <div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#FFF',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>🎯 Objetivo Principal</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              {
                id: 'global' as CareerGoal,
                title: '🌍 Vaga Internacional (USD/EUR)',
                desc: 'Passar em entrevistas de FAANG/Silicon Valley e trabalhar remoto global',
              },
              {
                id: 'lead' as CareerGoal,
                title: '🏢 Evoluir para Staff / Tech Lead',
                desc: 'Dominar arquitetura distribuída, code reviews e mentoria técnica',
              },
              {
                id: 'startup' as CareerGoal,
                title: '🦄 Construir Minha Própria Startup',
                desc: 'Criar produtos escaláveis do zero com stack moderna e Web3',
              },
              {
                id: 'hackathons' as CareerGoal,
                title: '🏆 Vencer Hackathons & Subir no Ranking',
                desc: 'Competir na liga semanal, conquistar XP e visibilidade na comunidade',
              },
            ].map((item) => {
              const isSelected = careerGoal === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setCareerGoal(item.id)}
                  style={{
                    background: isSelected ? 'rgba(130, 87, 229, 0.12)' : '#151821',
                    border: `1px solid ${isSelected ? '#8257E5' : '#232738'}`,
                    borderRadius: '12px',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: isSelected ? '0 0 16px rgba(130, 87, 229, 0.2)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.background = '#1B1E2B';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = '#232738';
                      e.currentTarget.style.background = '#151821';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>{item.title}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#9499AD', lineHeight: 1.3 }}>{item.desc}</span>
                </div>
              );
            })}
          </div>
        </div>
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
            cursor: 'pointer',
            transition: 'all 0.25s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1B1E2B';
            e.currentTarget.style.color = '#FFF';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
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
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '13px 28px',
            background: 'linear-gradient(90deg, #04D361 0%, #00E5FF 100%)',
            border: 'none',
            borderRadius: '12px',
            color: '#07080B',
            fontSize: '14px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 8px 24px -4px rgba(4, 211, 97, 0.4)',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 12px 30px -4px rgba(4, 211, 97, 0.65)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 8px 24px -4px rgba(4, 211, 97, 0.4)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          ⚡ Finalizar & Provisionar Sandbox
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
};
