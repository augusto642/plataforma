'use client';

import React from 'react';

interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '28px',
        right: '28px',
        zIndex: 2000,
        background: '#14141c',
        border: '1px solid #04D361',
        color: '#FFFFFF',
        padding: '12px 20px',
        borderRadius: '10px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(4, 211, 97, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '13px',
        fontWeight: 600,
        animation: 'fadeInUp 0.25s ease-out'
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#04D361" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
