export type SettingsTab =
  | 'profile'
  | 'git-ssh'
  | 'tutor'
  | 'billing'
  | 'security';

// B42 (Sprint 14) — os tipos TutorPreferences/TutorRigidityLevel/
// TutorVerbosity foram removidos: só existiam para semear a aba de
// preferências da tutora, que simulava salvamento sem endpoint,
// persistência ou consumidor. A aba hoje é um estado honesto de
// indisponibilidade (ver TutorPreferencesTab).
