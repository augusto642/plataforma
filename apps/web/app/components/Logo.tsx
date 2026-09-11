'use client';

import React from 'react';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  href?: string;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  href = '/',
  className = '',
}) => {
  // Dimension tokens
  const dimensions = {
    sm: { box: 'w-8 h-7 min-w-[32px] min-h-[28px]', text: 'text-sm', badge: 'text-[9px] px-1 py-0.2' },
    md: { box: 'w-10 h-8 min-w-[40px] min-h-[32px]', text: 'text-base', badge: 'text-[10px] px-1.5 py-0.5' },
    lg: { box: 'w-12 h-10 min-w-[48px] min-h-[40px]', text: 'text-xl', badge: 'text-xs px-2 py-0.5' },
  }[size];

  const content = (
    <div className={`flex items-center gap-2.5 group cursor-pointer select-none ${className}`}>
      {/* Official Geometric Cyber Badge */}
      <div
        className={`${dimensions.box} rounded-xl bg-[#121217] border border-[#8257E5]/50 flex items-center justify-center p-1 shadow-[0_0_15px_rgba(130,87,229,0.25)] group-hover:border-[#04D361] group-hover:shadow-[0_0_20px_rgba(4,211,97,0.3)] transition-all duration-300`}
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
        <div className="flex items-center gap-1.5 font-bold tracking-tight text-white font-heading">
          <span className={`${dimensions.text} tracking-tight`}>NEXUS</span>
          <span
            className={`${dimensions.badge} font-mono text-[#04D361] bg-[#04D361]/10 border border-[#04D361]/30 rounded font-bold uppercase tracking-wider`}
          >
            CODE
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center text-decoration-none">
        {content}
      </Link>
    );
  }

  return content;
};

export default Logo;
