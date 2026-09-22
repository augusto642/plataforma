'use client';

import React from 'react';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showText?: boolean;
  href?: string;
  className?: string;
  theme?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  href = '/',
  className = '',
  theme = 'dark',
}) => {
  // Dimension tokens
  const dimensions = {
    sm: { box: 'w-7 h-7 min-w-[28px]', text: 'text-sm', badge: 'text-[9px] px-1 py-0.5', gap: 'gap-4' },
    md: { box: 'w-9 h-9 min-w-[36px]', text: 'text-base', badge: 'text-[10px] px-1.5 py-0.5', gap: 'gap-5' },
    lg: { box: 'w-11 h-11 min-w-[44px]', text: 'text-lg', badge: 'text-xs px-2 py-0.5', gap: 'gap-6' },
    xl: { box: 'w-14 h-14 min-w-[56px]', text: 'text-2xl', badge: 'text-xs px-2.5 py-1', gap: 'gap-7' },
    '2xl': { box: 'w-16 h-16 min-w-[64px]', text: 'text-2xl', badge: 'text-xs px-2.5 py-0.5', gap: 'gap-8' },
  }[size];

  const content = (
    <div className={`flex items-center ${dimensions.gap} group cursor-pointer select-none ${className}`}>
      {/* Official Geometric Cyber Badge */}
      <div
        className={`${dimensions.box} rounded-xl ${
          theme === 'light' 
            ? 'bg-[#0F172A] border border-zinc-700 shadow-md shadow-zinc-300/50' 
            : 'bg-[#121217] border border-[#8257E5]/50 shadow-[0_0_15px_rgba(130,87,229,0.25)]'
        } flex items-center justify-center p-1 group-hover:border-[#8257E5] transition-all duration-300`}
      >
        <svg viewBox="0 0 84 64" className="w-full h-full" fill="none">
          {/* N Letter */}
          <path
            d="M 14 46 L 14 18 L 20 18 L 32 36 L 32 18 L 38 18 L 38 46 L 32 46 L 20 28 L 20 46 Z"
            fill="#FFFFFF"
          />
          {/* Chevron > (Neon Green) */}
          <path
            d="M 44 22 L 54 32 L 44 42"
            stroke="#04D361"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Chevron < (Cyber Purple) */}
          <path
            d="M 66 22 L 56 32 L 66 42"
            stroke="#8257E5"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className={`flex items-center gap-4 sm:gap-5 font-bold tracking-tight font-heading ${
          theme === 'light' ? 'text-zinc-900' : 'text-white'
        }`}>
          <span className={`${dimensions.text} tracking-tight`}>NEXUS</span>
          <span
            className={`${dimensions.badge} font-mono ${
              theme === 'light'
                ? 'text-[#8257E5] bg-[#8257E5]/10 border border-[#8257E5]/30'
                : 'text-[#04D361] bg-[#04D361]/10 border border-[#04D361]/30'
            } rounded font-bold uppercase tracking-wider`}
          >
            CODE
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center text-decoration-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8257E5] rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
};

export default Logo;
