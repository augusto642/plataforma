export type SettingsTab =
  | 'profile'
  | 'git-ssh'
  | 'tutor'
  | 'billing'
  | 'security';

export type TutorRigidityLevel = 'gentle' | 'balanced' | 'hardcore';
export type TutorVerbosity = 'concise' | 'step_by_step' | 'ascii_diagrams';

export interface TutorPreferences {
  rigidity: TutorRigidityLevel;
  verbosity: TutorVerbosity;
  faangInterviewMode: boolean;
  defaultLanguage: 'rust' | 'go' | 'typescript' | 'python' | 'cpp';
  enableAudioVoice: boolean;
  autoFormatCodeOnSubmit: boolean;
  strictBigOChecks: boolean;
}
