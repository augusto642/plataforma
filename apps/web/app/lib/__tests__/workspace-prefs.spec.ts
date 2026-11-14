import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WORKSPACE_PREFERENCES,
  getWorkspaceStarterTemplate,
  readWorkspacePreferences,
} from '../workspacePrefs';
import { PRIMARY_TECHNOLOGIES } from '../../(app)/register/data/registrationOptions';

describe('workspacePrefs & starter templates', () => {
  it('retorna preferências padrão seguras em ambiente sem window', () => {
    expect(readWorkspacePreferences()).toEqual(DEFAULT_WORKSPACE_PREFERENCES);
  });

  it('fornece template inicial dedicado para cada tecnologia do cadastro', () => {
    for (const tech of PRIMARY_TECHNOLOGIES) {
      const tpl = getWorkspaceStarterTemplate(tech.id);
      expect(tpl.filename.length).toBeGreaterThan(0);
      expect(tpl.runtimeLabel.length).toBeGreaterThan(0);
      expect(tpl.lines.length).toBeGreaterThanOrEqual(4);
      expect(tpl.expectedOutput).toContain('✓');
    }
  });

  it('usa fallback TypeScript quando tecnologia desconhecida é informada', () => {
    const fallback = getWorkspaceStarterTemplate('desconhecida');
    expect(fallback.filename).toBe('missao-01.ts');
  });
});
