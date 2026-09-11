import React from 'react';
import { Course } from '../types';

interface CourseTechIconProps {
  type: Course['iconType'] | 'logo';
  className?: string;
}

export function CourseTechIcon({ type, className = 'w-7 h-7' }: CourseTechIconProps) {
  switch (type) {
    case 'fullstack':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <circle cx="16" cy="16" r="14" stroke="#00E5FF" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
          <path d="M 9 22 L 9 10 L 23 22 L 23 10" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="23" cy="10" r="2" fill="#04D361" />
        </svg>
      );

    case 'gobackend':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <circle cx="8" cy="16" r="4" fill="#121217" stroke="#8257E5" strokeWidth="2" />
          <circle cx="24" cy="9" r="4" fill="#121217" stroke="#00E5FF" strokeWidth="2" />
          <circle cx="24" cy="23" r="4" fill="#121217" stroke="#04D361" strokeWidth="2" />
          <path d="M 12 16 L 20 10 M 12 16 L 20 22 M 24 13 L 24 19" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <circle cx="8" cy="16" r="1.5" fill="#8257E5" />
          <circle cx="24" cy="9" r="1.5" fill="#00E5FF" />
          <circle cx="24" cy="23" r="1.5" fill="#04D361" />
        </svg>
      );

    case 'algorithms':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <path d="M 16 6 L 8 16 L 24 16 Z" stroke="#04D361" strokeWidth="2" strokeLinejoin="round" fill="rgba(4,211,97,0.1)" />
          <path d="M 8 16 L 4 26 L 12 26 Z" stroke="#00E5FF" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M 24 16 L 20 26 L 28 26 Z" stroke="#8257E5" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="16" cy="6" r="2" fill="#FFFFFF" />
          <circle cx="8" cy="16" r="2" fill="#04D361" />
          <circle cx="24" cy="16" r="2" fill="#00E5FF" />
        </svg>
      );

    case 'devops':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <rect x="5" y="6" width="22" height="20" rx="6" stroke="#F59E0B" strokeWidth="2" fill="rgba(245,158,11,0.08)" />
          <path d="M 10 13 L 14 16 L 10 19" stroke="#04D361" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="16" y1="19" x2="22" y2="19" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'ai':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <path d="M 16 4 L 19 13 L 28 16 L 19 19 L 16 28 L 13 19 L 4 16 L 13 13 Z" fill="rgba(130,87,229,0.3)" stroke="#996DFF" strokeWidth="1.5" />
          <circle cx="16" cy="16" r="2" fill="#FFFFFF" />
          <circle cx="16" cy="16" r="4" stroke="#04D361" strokeWidth="1" strokeDasharray="2 2" />
        </svg>
      );

    case 'fundamentals':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <circle cx="9" cy="9" r="3" stroke="#04D361" strokeWidth="2" fill="#121217" />
          <circle cx="9" cy="23" r="3" stroke="#04D361" strokeWidth="2" fill="#121217" />
          <circle cx="23" cy="16" r="3" stroke="#00E5FF" strokeWidth="2" fill="#121217" />
          <line x1="9" y1="12" x2="9" y2="20" stroke="#FFFFFF" strokeWidth="2" />
          <path d="M 9 12 C 9 16 14 16 20 16" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'logo':
      return (
        <svg viewBox="0 0 84 64" className={className} fill="none">
          <path d="M 14 46 L 14 18 L 20 18 L 32 36 L 32 18 L 38 18 L 38 46 L 32 46 L 20 28 L 20 46 Z" fill="#FFFFFF" />
          <path d="M 44 22 L 54 32 L 44 42" stroke="#04D361" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 66 22 L 56 32 L 66 42" stroke="#8257E5" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    default:
      return null;
  }
}
