'use client';

import React from 'react';
import { SandpackPreview, SandpackProvider } from '@codesandbox/sandpack-react';

interface SandpackReactPreviewProps {
  code: string;
}

export const SandpackReactPreview: React.FC<SandpackReactPreviewProps> = ({ code }) => (
  <SandpackProvider
    template="react"
    files={{
      '/src/App.js': {
        code,
      },
    }}
    options={{
      activeFile: '/src/App.js',
      autorun: true,
      recompileMode: 'delayed',
      recompileDelay: 500,
    }}
    theme="dark"
  >
    <SandpackPreview
      showOpenInCodeSandbox={false}
      showRefreshButton
      style={{ height: '100%', width: '100%' }}
    />
  </SandpackProvider>
);
