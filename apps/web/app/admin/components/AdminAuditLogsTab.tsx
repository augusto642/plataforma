'use client';

import React, { useState } from 'react';
import { AuditLogItem, CertificateItem, SeverityLevel } from '../types';

interface AdminAuditLogsTabProps {
  logs: AuditLogItem[];
  certificates: CertificateItem[];
  onToggleCertificateStatus: (certId: string) => void;
}

export const AdminAuditLogsTab: React.FC<AdminAuditLogsTabProps> = ({
  logs,
  certificates,
  onToggleCertificateStatus,
}) => {
  const [selectedSubTab, setSelectedSubTab] = useState<'logs' | 'certificates'>('logs');
  const [severityFilter, setSeverityFilter] = useState<'all' | SeverityLevel>('all');
  const [selectedCert, setSelectedCert] = useState<CertificateItem | null>(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  const filteredLogs = logs.filter((log) => {
    if (severityFilter === 'all') return true;
    return log.severity === severityFilter;
  });

  const handleInspectCert = (cert: CertificateItem) => {
    setSelectedCert(cert);
    setIsVerifyModalOpen(true);
  };

  const getSeverityBadge = (sev: SeverityLevel) => {
    switch (sev) {
      case 'info':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#8257E5]/15 text-[#8257E5] border border-[#8257E5]/30">
            INFO
          </span>
        );
      case 'warn':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#FFA116]/15 text-[#FFA116] border border-[#FFA116]/30">
            AVISO
          </span>
        );
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30 animate-pulse">
            CRÍTICO
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header with SubTab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight">
            Auditoria, Segurança & Certificação SHA-256
          </h1>
          <p className="text-xs text-[#A1A1AA]">
            Trilha de auditoria imutável, eventos de segurança e emissão criptográfica de certificados.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center gap-1 bg-[#121217] p-1.5 rounded-2xl border border-[#27272A] text-xs">
          <button
            onClick={() => setSelectedSubTab('logs')}
            className={`px-4 py-1.5 rounded-xl font-medium transition-all ${
              selectedSubTab === 'logs'
                ? 'bg-[#8257E5] text-white font-semibold shadow-[0_0_15px_rgba(130,87,229,0.3)]'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            🛡️ Logs de Segurança ({logs.length})
          </button>
          <button
            onClick={() => setSelectedSubTab('certificates')}
            className={`px-4 py-1.5 rounded-xl font-medium transition-all ${
              selectedSubTab === 'certificates'
                ? 'bg-[#8257E5] text-white font-semibold shadow-[0_0_15px_rgba(130,87,229,0.3)]'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            📜 Certificados SHA-256 ({certificates.length})
          </button>
        </div>
      </div>

      {/* VIEW 1: AUDIT LOGS */}
      {selectedSubTab === 'logs' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-[#121217] border border-[#27272A] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#71717A] font-mono">Filtrar por Severidade:</span>
              <div className="flex items-center gap-1 bg-[#181820] p-1 rounded-xl border border-[#27272A] text-xs">
                {(['all', 'info', 'warn', 'critical'] as const).map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                      severityFilter === sev
                        ? 'bg-[#8257E5] text-white font-semibold'
                        : 'text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    {sev === 'all' ? 'Todos' : sev === 'info' ? 'Info' : sev === 'warn' ? 'Avisos' : 'Críticos'}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs text-[#04D361] font-mono">
              Integridade do Log: Hash-Chained OK
            </span>
          </div>

          {/* Logs Table */}
          <div className="rounded-2xl bg-[#121217] border border-[#27272A] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#27272A] bg-[#181820]/60 text-[#71717A] font-mono text-[11px] uppercase">
                    <th className="py-3 px-4">Severidade</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Ação Executada</th>
                    <th className="py-3 px-4">Ator Responsável</th>
                    <th className="py-3 px-4">Alvo / Target</th>
                    <th className="py-3 px-4">IP Origem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A] text-[#EDEDED]">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#181820]/40 transition-colors">
                      <td className="py-3 px-4">{getSeverityBadge(log.severity)}</td>
                      <td className="py-3 px-4 font-mono text-[#71717A] text-[11px]">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-white block">{log.action}</span>
                        {log.details && (
                          <span className="text-[11px] text-[#A1A1AA]">{log.details}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-white">{log.actor.name}</p>
                        <p className="text-[11px] text-[#71717A] font-mono">{log.actor.email}</p>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#A1A1AA] text-[11px]">{log.target}</td>
                      <td className="py-3 px-4 font-mono text-[#00E5FF] text-[11px]">{log.ipAddress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: CERTIFICATES SHA-256 */}
      {selectedSubTab === 'certificates' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="p-5 rounded-2xl bg-[#121217] border border-[#27272A] hover:border-[#8257E5]/50 transition-all duration-300 space-y-3 relative group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">📜</span>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-[#996DFF] transition-colors">
                        {cert.studentName}
                      </h3>
                      <p className="text-xs text-[#A1A1AA]">{cert.courseTitle}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                      cert.status === 'valid'
                        ? 'bg-[#04D361]/15 text-[#04D361] border-[#04D361]/30'
                        : 'bg-[#F43F5E]/15 text-[#F43F5E] border-[#F43F5E]/30'
                    }`}
                  >
                    {cert.status === 'valid' ? 'VÁLIDO' : 'REVOGADO'}
                  </span>
                </div>

                {/* Hash pill */}
                <div className="p-2.5 rounded-xl bg-[#09090A] border border-[#27272A] font-mono text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-[#71717A]">
                    <span>Código: {cert.certificateCode}</span>
                    <span className="text-[#FFA116] font-bold">Nota: {cert.score}%</span>
                  </div>
                  <p className="text-[#04D361] truncate font-mono text-[10px]">
                    SHA-256: {cert.sha256Hash}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-[#27272A] text-xs">
                  <span className="text-[11px] text-[#71717A] font-mono">
                    Emitido em: {new Date(cert.issuedAt).toLocaleDateString('pt-BR')}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleInspectCert(cert)}
                      className="px-3 py-1.5 rounded-lg bg-[#8257E5]/15 hover:bg-[#8257E5]/30 border border-[#8257E5]/40 text-[#8257E5] font-semibold transition-colors"
                    >
                      Inspecionar Hash
                    </button>
                    <button
                      onClick={() => onToggleCertificateStatus(cert.id)}
                      className={`px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                        cert.status === 'valid'
                          ? 'bg-[#181820] hover:bg-[#F43F5E]/20 text-[#F43F5E] border-[#27272A] hover:border-[#F43F5E]/40'
                          : 'bg-[#04D361]/15 text-[#04D361] border-[#04D361]/40'
                      }`}
                    >
                      {cert.status === 'valid' ? 'Revogar' : 'Revalidar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Modal: Verificação Criptográfica SHA-256 */}
      {isVerifyModalOpen && selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#121217] border border-[#04D361]/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(4,211,97,0.2)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔐</span>
                <h3 className="text-base font-bold text-white font-heading">
                  Verificador Criptográfico SHA-256
                </h3>
              </div>
              <button
                onClick={() => setIsVerifyModalOpen(false)}
                className="text-[#71717A] hover:text-white p-1 rounded-lg hover:bg-[#181820]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#04D361]/10 border border-[#04D361]/30 text-[#04D361] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#04D361] animate-pulse" />
                <span className="font-mono font-bold">Assinatura Digital Válida pela NEXUS CODE CA</span>
              </div>

              <div className="p-3 rounded-xl bg-[#181820] border border-[#27272A] space-y-2 font-mono">
                <div>
                  <span className="text-[#71717A] text-[11px] block">Titular:</span>
                  <span className="text-white font-bold">{selectedCert.studentName} ({selectedCert.studentEmail})</span>
                </div>
                <div>
                  <span className="text-[#71717A] text-[11px] block">Trilha de Conclusão:</span>
                  <span className="text-[#8257E5] font-bold">{selectedCert.courseTitle}</span>
                </div>
                <div>
                  <span className="text-[#71717A] text-[11px] block">Código do Certificado:</span>
                  <span className="text-[#FFA116] font-bold">{selectedCert.certificateCode}</span>
                </div>
                <div>
                  <span className="text-[#71717A] text-[11px] block">Hash SHA-256 (Imutável):</span>
                  <span className="text-[#00E5FF] break-all text-[11px]">{selectedCert.sha256Hash}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-[#27272A]">
              <button
                onClick={() => setIsVerifyModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#181820] hover:bg-[#202028] text-white text-xs font-semibold"
              >
                Fechar Verificação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
