import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import { SidebarProvider } from '../context/SidebarContext';
import { QueryProvider } from '../providers/QueryProvider';
import { PlanInterestNotice } from '../components/PlanInterestNotice';

// B75 (Sprint 18 · Volta 3 · TL M2) — layout do grupo (app): todas
// as rotas daqui consomem sessão (ou são as portas dela: login e
// cadastro), então os providers moram aqui — QueryProvider +
// AuthProvider + SidebarProvider + o aviso que consome a intenção de plano salva na
// landing quando há sessão ativa. As rotas públicas vivem no grupo
// (public), sem provider nenhum.
export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <AuthProvider>
        <SidebarProvider>
          {children}
          <PlanInterestNotice />
        </SidebarProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
