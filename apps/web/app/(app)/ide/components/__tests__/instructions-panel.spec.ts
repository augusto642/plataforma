import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InstructionsPanel } from '../InstructionsPanel';

describe('InstructionsPanel', () => {
  it('exposes an accessible control to restore the collapsed editor', () => {
    const html = renderToStaticMarkup(React.createElement(InstructionsPanel, {
      title: 'Aula',
      description: 'Conteúdo',
      language: 'python',
      editorCollapsed: true,
      onToggleEditor: () => {},
    }));
    expect(html).toContain('Mostrar editor');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="activity-editor"');
    expect(html).not.toContain('Intermediário');
  });
});
