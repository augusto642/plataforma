import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CAREER_GOALS, EXPERIENCE_LEVELS, WEEKLY_TIME_COMMITMENTS } from '@plataforma/contracts';

const mocks = vi.hoisted(() => ({
  auth: { user: null as null | { id: string }, isLoading: false, refreshSession: vi.fn() },
  apiFetch: vi.fn(),
  replace: vi.fn(),
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('../../lib/apiClient', () => ({ apiFetch: mocks.apiFetch }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('next/image', () => ({ default: (props: { alt: string }) => React.createElement('img', { alt: props.alt }) }));
vi.mock('next/link', () => ({ default: (props: { href: string; children: React.ReactNode }) => React.createElement('a', { href: props.href }, props.children) }));

import InitialProfilePage from './page';
import { sendLearningProfile } from './learning-profile';

describe('contrato de perfil de aprendizagem', () => {
  beforeEach(() => { mocks.apiFetch.mockReset(); });

  it('envia os três campos e aceita resposta 204 vazia', async () => {
    mocks.apiFetch.mockResolvedValue({ status: 204 });
    const body = { careerGoal: 'backend', experienceLevel: 'beginner', weeklyTimeCommitment: '5h' } as const;
    await expect(sendLearningProfile(body)).resolves.toBeUndefined();
    expect(mocks.apiFetch).toHaveBeenCalledOnce();
    expect(mocks.apiFetch).toHaveBeenCalledWith('/dynamic-track/me/learning-profile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
  });

  it('envia apenas skipped ao pular', async () => {
    mocks.apiFetch.mockResolvedValue({ status: 204 });
    await sendLearningProfile({ skipped: true });
    expect(JSON.parse(mocks.apiFetch.mock.calls[0][1].body)).toEqual({ skipped: true });
  });

  it('propaga erros HTTP, resposta inesperada e erro de conexão', async () => {
    for (const status of [401, 500, 200]) {
      mocks.apiFetch.mockResolvedValueOnce({ status });
      await expect(sendLearningProfile({ skipped: true })).rejects.toThrow();
    }
    mocks.apiFetch.mockRejectedValueOnce(new Error('offline'));
    await expect(sendLearningProfile({ skipped: true })).rejects.toThrow('offline');
  });
});

describe('entrada do perfil', () => {
  beforeEach(() => { mocks.auth.user = null; mocks.auth.isLoading = false; });

  it('aguarda a sessão e não mostra o formulário antes dela', () => {
    mocks.auth.isLoading = true;
    const html = renderToStaticMarkup(React.createElement(InitialProfilePage));
    expect(html).toContain('Verificando sua sessão');
    expect(html).not.toContain('learning-goal');
  });

  it('oferece entrada quando não identifica a conta', () => {
    const html = renderToStaticMarkup(React.createElement(InitialProfilePage));
    expect(html).toContain('href="/login"');
    expect(html).not.toContain('learning-goal');
  });

  it('oferece os valores exatos dos enums e a opção de pular', () => {
    mocks.auth.user = { id: 'a' };
    const html = renderToStaticMarkup(React.createElement(InitialProfilePage));
    expect(html).toContain('id="learning-goal"');
    expect(html).toContain('id="learning-experience"');
    expect(html).toContain('id="learning-time"');
    for (const value of [...CAREER_GOALS, ...EXPERIENCE_LEVELS, ...WEEKLY_TIME_COMMITMENTS]) {
      expect(html).toContain(`value="${value}"`);
    }
    expect(html).toContain('Pular e ir praticar');
    expect(html).toContain('registradas na sua conta');
  });
});
