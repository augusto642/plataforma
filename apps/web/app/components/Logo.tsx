'use client';

import React, { useId } from 'react';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showText?: boolean;
  subtitle?: string;
  href?: string;
  className?: string;
  theme?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  subtitle,
  href = '/',
  className = '',
  theme = 'dark',
}) => {
  const slashGradId = useId();
  const dimensions = {
    sm: { box: 'w-7 h-7 min-w-[28px] rounded-lg', svg: 'w-4 h-4', inner: 'rounded-[6px]', text: 'text-sm', gap: 'gap-2.5' },
    md: { box: 'w-9 h-9 min-w-[36px] rounded-xl', svg: 'w-5 h-5', inner: 'rounded-[10px]', text: 'text-lg', gap: 'gap-3' },
    lg: { box: 'w-10 h-10 min-w-[40px] rounded-xl', svg: 'w-6 h-6', inner: 'rounded-[10px]', text: 'text-xl', gap: 'gap-3.5' },
    xl: { box: 'w-12 h-12 min-w-[48px] rounded-xl', svg: 'w-7 h-7', inner: 'rounded-[10px]', text: 'text-2xl', gap: 'gap-4' },
    '2xl': { box: 'w-14 h-14 min-w-[56px] rounded-2xl', svg: 'w-8 h-8', inner: 'rounded-[14px]', text: 'text-2xl', gap: 'gap-4' },
  }[size];

  const content = (
    <div className={`flex items-center ${dimensions.gap} group cursor-pointer select-none ${className}`}>
      {/* Official Nexus Code Mark (</>) — clean geometric monogram, no center circle */}
      <div
        className={`relative ${dimensions.box} bg-gradient-to-br from-[#8257E5] via-[#6D4AFF] to-[#00E5FF] p-[1.5px] shadow-[0_0_18px_rgba(130,87,229,0.38)] shrink-0 flex items-center justify-center group-hover:scale-105 group-hover:shadow-[0_0_24px_rgba(0,229,255,0.35)] transition-all duration-200`}
      >
        <div
          className={`w-full h-full ${
            theme === 'light' ? 'bg-[#0F172A]' : 'bg-[#090A10]'
          } ${dimensions.inner} flex items-center justify-center`}
        >
          <svg className={dimensions.svg} viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id={slashGradId} x1="28" y1="10" x2="20" y2="38" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#C4B5FD" />
                <stop offset="100%" stopColor="#00E5FF" />
              </linearGradient>
            </defs>
            <path
              d="M16 14L6 24L16 34"
              stroke="#9D74FF"
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M27.5 11.5L20.5 36.5"
              stroke={`url(#${slashGradId})`}
              strokeWidth="4.2"
              strokeLinecap="round"
            />
            <path
              d="M32 14L42 24L32 34"
              stroke="#00E5FF"
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Brand Wordmark */}
      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className={`font-headline font-black ${dimensions.text} tracking-tight flex items-center ${
              theme === 'light' ? 'text-zinc-900' : 'text-white'
            }`}
          >
            NEXUS{' '}
            <span className="ml-0.5 text-transparent bg-clip-text bg-gradient-to-r from-[#9D74FF] to-[#8257E5]">
              CODE
            </span>
          </span>
          {subtitle && (
            <span className="hidden sm:block font-code text-[10px] text-[#00E5FF] tracking-wider uppercase font-bold mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8257E5] rounded-xl"
      >
        {content}
      </Link>
    );
  }

  return content;
};

export default Logo;
