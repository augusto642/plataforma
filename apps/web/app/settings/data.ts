import type { TutorPreferences } from './types';

// B39 (Sprint 12) — este arquivo mantém apenas defaults locais de UI
// que não representam dados da conta. As antigas fixtures de chaves,
// tokens, sessões e passkeys foram removidas: a API não possui
// endpoints para esses registros e eles eram exibidos como se fossem
// reais, com ações simuladas.
export const INITIAL_TUTOR_PREFS: TutorPreferences = {
  rigidity: 'balanced',
  verbosity: 'step_by_step',
  faangInterviewMode: false,
  defaultLanguage: 'rust',
  enableAudioVoice: false,
  autoFormatCodeOnSubmit: true,
  strictBigOChecks: true,
};
