'use client';

import React from 'react';

interface RegisterStepperProps {
  currentStep: number;
}

const STEPS = [
  { num: 1, tag: 'Etapa 01', title: 'Credenciais' },
  { num: 2, tag: 'Etapa 02', title: 'Trilha Tech' },
  { num: 3, tag: 'Etapa 03', title: 'Perfil & Metas' },
  { num: 4, tag: 'Etapa 04', title: 'Workspace' },
];

export const RegisterStepper: React.FC<RegisterStepperProps> = ({ currentStep }) => {
  const percentage = Math.max(25, ((currentStep - 1) / 3) * 100);

  return (
    <div style={{ width: '100%', maxWidth: '760px', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          position: 'relative',
        }}
      >
        {STEPS.map((step) => {
          const isActive = currentStep === step.num;
          const isCompleted = currentStep > step.num;

          return (
            <div
              key={step.num}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: isActive
                  ? 'rgba(130, 87, 229, 0.12)'
                  : isCompleted
                  ? 'rgba(4, 211, 97, 0.08)'
                  : 'rgba(21, 24, 33, 0.7)',
                border: `1px solid ${
                  isActive
                    ? 'rgba(130, 87, 229, 0.5)'
                    : isCompleted
                    ? 'rgba(4, 211, 97, 0.35)'
                    : '#232738'
                }`,
                borderRadius: '12px',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
                boxShadow: isActive ? '0 0 20px rgba(130, 87, 229, 0.15)' : 'none',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: isActive
                    ? '#8257E5'
                    : isCompleted
                    ? '#04D361'
                    : '#1B1E2B',
                  color: isActive ? '#FFF' : isCompleted ? '#07080B' : '#64687A',
                  border: `1px solid ${
                    isActive
                      ? '#996DFF'
                      : isCompleted
                      ? '#04D361'
                      : '#232738'
                  }`,
                  boxShadow: isActive
                    ? '0 0 12px rgba(130, 87, 229, 0.6)'
                    : isCompleted
                    ? '0 0 10px rgba(4, 211, 97, 0.4)'
                    : 'none',
                  flexShrink: 0,
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {isCompleted ? '✓' : step.num}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span
                  style={{
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: isActive ? '#996DFF' : isCompleted ? '#04D361' : '#64687A',
                    fontWeight: 600,
                  }}
                >
                  {step.tag}
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: isActive ? '#FFFFFF' : isCompleted ? '#F4F4F6' : '#9499AD',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                  }}
                >
                  {step.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          width: '100%',
          height: '4px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, #8257E5 0%, #04D361 100%)',
            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 0 12px rgba(130, 87, 229, 0.6)',
          }}
        />
      </div>
    </div>
  );
};
