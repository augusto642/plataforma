'use client';

import React from 'react';
import { DigitalCertificate } from '../types';

interface CertificatesTabProps {
  certificates: DigitalCertificate[];
  onOpenCertificate: (cert: DigitalCertificate) => void;
}

export function CertificatesTab({ certificates, onOpenCertificate }: CertificatesTabProps) {
  return (
    <div>
      {/* HEADER DA ABA */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                background: 'rgba(4, 211, 97, 0.15)',
                border: '1px solid #04D361',
                color: '#04D361',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.5px'
              }}
            >
              VERIFICADO ON-CHAIN &amp; SHA-256
            </span>
            <span style={{ fontSize: '13px', color: '#94A3B8' }}>• {certificates.length} Formações Concluídas</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFF', margin: 0, letterSpacing: '-0.3px' }}>
            Certificados Digitais &amp; Diplomas Oficiais
          </h2>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: '4px 0 0 0' }}>
            Cada certificação possui um hash criptográfico imutável, auditável por empresas parceiras e recrutadores técnicos.
          </p>
        </div>
      </div>

      {/* GRID DE CERTIFICADOS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '24px'
        }}
      >
        {certificates.map((cert) => (
          <div
            key={cert.id}
            style={{
              background: '#101015',
              border: '1px solid #262630',
              borderRadius: '20px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
              transition: 'transform 0.2s, border-color 0.2s'
            }}
          >
            {/* TOPO ESTILIZADO COM GRAVURA DIPLOMÁTICA */}
            <div
              style={{
                height: '140px',
                background: 'linear-gradient(135deg, #12131D 0%, #17112e 50%, #0d1e2e 100%)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderBottom: '1px solid #262630',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Marca d'água holográfica */}
              <div
                style={{
                  position: 'absolute',
                  right: '-15px',
                  bottom: '-25px',
                  fontSize: '80px',
                  opacity: 0.08,
                  userSelect: 'none',
                  pointerEvents: 'none'
                }}
              >
                📜
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#00E5FF',
                    letterSpacing: '1px',
                    textTransform: 'uppercase'
                  }}
                >
                  NEXUS ACCREDITED DIPLOMA
                </span>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'rgba(4, 211, 97, 0.2)',
                    border: '1.5px solid #04D361',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#04D361',
                    boxShadow: '0 0 10px rgba(4, 211, 97, 0.3)'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#996DFF', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
                  {cert.issuer}
                </span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFF', letterSpacing: '-0.3px' }}>
                  {cert.title}
                </div>
              </div>
            </div>

            {/* CORPO DO CERTIFICADO */}
            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#F1F5F9', marginBottom: '4px' }}>
                  {cert.trackName}
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '14px' }}>
                  Emitido em {cert.issueDate} • Carga Horária: <strong style={{ color: '#FFF' }}>{cert.hours}</strong>
                </div>

                {/* HABILIDADES VALIDADAS */}
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#71717A', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Competências Validadas:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {cert.skills.map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid #27273A',
                          color: '#CBD5E1',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 500
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* HASH CRIPTOGRÁFICO */}
                <div
                  style={{
                    background: '#090A0F',
                    border: '1px dashed #262630',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: '11px',
                    color: '#00E5FF',
                    marginBottom: '20px',
                    wordBreak: 'break-all'
                  }}
                >
                  <span style={{ color: '#71717A', display: 'block', fontSize: '9px', marginBottom: '2px' }}>
                    HASH SHA-256 (ASSINATURA DIGITAL):
                  </span>
                  {cert.hashSha256}
                </div>
              </div>

              {/* BOTÃO DE AÇÃO */}
              <button
                onClick={() => onOpenCertificate(cert)}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #18112e 0%, #221345 100%)',
                  border: '1px solid #8257E5',
                  color: '#FFF',
                  padding: '12px 18px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(130, 87, 229, 0.25)',
                  transition: 'all 0.2s'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Visualizar Credencial &amp; Emitir PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
