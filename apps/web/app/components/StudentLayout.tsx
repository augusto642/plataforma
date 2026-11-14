'use client';

import React from 'react';
import { StudentSidebar } from './StudentSidebar';
import { StudentHeader } from './StudentHeader';
import { useSidebar } from '../context/SidebarContext';

interface StudentLayoutProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  hideHeader?: boolean;
}

export function StudentLayout({
  title = 'Nexus Code',
  subtitle,
  actions,
  children,
  hideHeader = false,
}: StudentLayoutProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-[#07090E] text-[#F1F5F9] font-sans antialiased flex selection:bg-[#8257E5] selection:text-white relative overflow-x-hidden">
      {/* Sidebar Lateral Retrátil Oficial */}
      <StudentSidebar />

      {/* Área de Conteúdo à Direita com Largura Dinâmica */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {!hideHeader && (
          <StudentHeader
            title={title}
            subtitle={subtitle}
            actions={actions}
          />
        )}

        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
