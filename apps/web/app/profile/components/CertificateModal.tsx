'use client';

import React from 'react';
import { DigitalCertificate } from '../types';

interface CertificateModalProps {
  certificate: DigitalCertificate | null;
  studentName: string;
  onClose: () => void;
  onDownload: () => void;
}

export function CertificateModal({ certificate, studentName, onClose, onDownload }: CertificateModalProps) {
  if (!certificate) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          background: '#0d0d12',
          border: '1px solid rgba(130, 87, 229, 0.4)',
          borderRadius: '24px',
          maxWidth: '720px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(130, 87, 229, 0.2)',
          position: 'relative'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: '#16161D',
            border: '1px solid #262630',
            color: '#A1A1AA',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          ✕
        </button>

        <div
          style={{
            background: 'linear-gradient(135deg, #0b0c10 0%, #12131c 100%)',
            border: '8px double rgba(130, 87, 229, 0.35)',
            borderRadius: '16px',
            padding: '40px 32px',
            margin: '24px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.03,
              fontSize: '150px',
              fontWeight: 900,
              pointerEvents: 'none',
              userSelect: 'none'
            }}
          >
            NEXUS
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
            <div
              style={{
                width: '32px',
                height: '30px',
                background: '#16161D',
                border: '1px solid rgba(130, 87, 229, 0.5)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8257E5" strokeWidth="2.5">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <strong style={{ letterSpacing: '1px', fontSize: '15px', color: '#FFF' }}>NEXUS CODE ACADEMY</strong>
          </div>

          <div
            style={{
              fontSize: '24px',
              fontWeight: 800,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: '#FFF',
              marginBottom: '12px'
            }}
          >
            Certificado de Excelência Técnica
          </div>

          <div style={{ fontSize: '13px', color: '#A1A1AA', marginBottom: '20px' }}>
            Certificamos solenemente que o engenheiro de software
          </div>

          <div
            style={{
              fontSize: '28px',
              fontWeight: 900,
              color: '#996DFF',
              marginBottom: '16px',
              textDecoration: 'underline',
              textDecorationColor: 'rgba(130, 87, 229, 0.4)',
              textUnderlineOffset: '8px'
            }}
          >
            {studentName.toUpperCase()}
          </div>

          <p
            style={{
              fontSize: '14px',
              color: '#D4D4D8',
              maxWidth: '520px',
              margin: '0 auto 24px auto',
              lineHeight: 1.6
            }}
          >
            Concluiu com aproveitamento superior e distinção a formação avançada em{' '}
            <strong style={{ color: '#FFF' }}>{certificate.trackName}</strong>, demonstrando domínio pleno na arquitetura de
            sistemas concorrentes, engenharia de alta performance e tecnologias de ponta verificadas.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              paddingTop: '20px',
              textAlign: 'left',
              fontSize: '12px'
            }}
          >
            <div>
              <label style={{ color: '#71717A', display: 'block', marginBottom: '2px' }}>Data de Emissão</label>
              <span style={{ color: '#FFF', fontWeight: 600 }}>{certificate.issueDate}</span>
            </div>
            <div>
              <label style={{ color: '#71717A', display: 'block', marginBottom: '2px' }}>Carga Horária</label>
              <span style={{ color: '#FFF', fontWeight: 600 }}>{certificate.hours} Práticas</span>
            </div>
            <div>
              <label style={{ color: '#71717A', display: 'block', marginBottom: '2px' }}>Status de Validação</label>
              <span style={{ color: '#04D361', fontWeight: 600 }}>● Autêntico & Assinado</span>
            </div>
          </div>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#71717A', marginBottom: '6px' }}>
              HASH CRIPTOGRÁFICO DE VERIFICAÇÃO PÚBLICA
            </div>
            <div
              style={{
                background: '#16161D',
                border: '1px dashed #262630',
                borderRadius: '6px',
                padding: '8px 12px',
                fontFamily: 'ui-monospace, monospace',
                fontSize: '11px',
                color: '#00E5FF',
                margin: '0 auto',
                maxWidth: '560px',
                wordBreak: 'break-all'
              }}
            >
              SHA256: {certificate.hashSha256}
            </div>
          </div>
        </div>

        <div style={{ padding: '0 24px 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              background: '#16161D',
              border: '1px solid #262630',
              color: '#EDEDED',
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Fechar
          </button>
          <button
            onClick={onDownload}
            style={{
              background: 'linear-gradient(135deg, #8257E5, #632cd6)',
              border: 'none',
              color: '#FFF',
              padding: '8px 18px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(130, 87, 229, 0.35)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Baixar Certificado PDF
          </button>
        </div>
      </div>
    </div>
  );
}
