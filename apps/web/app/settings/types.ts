export type SettingsTab =
  | 'profile'
  | 'git-ssh'
  | 'tutor'
  | 'billing'
  | 'security';

export interface SshKeyItem {
  id: string;
  title: string;
  fingerprint: string;
  keyType: 'ED25519' | 'RSA-4096' | 'ECDSA';
  createdAt: string;
  lastUsedAt: string;
}

export interface GpgKeyItem {
  id: string;
  keyId: string;
  email: string;
  expiresAt: string;
  status: 'valid' | 'expired' | 'revoked';
}

export interface PersonalAccessToken {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string;
}

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

export interface BillingInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: string;
  status: 'paid' | 'pending' | 'failed';
  downloadUrl: string;
}

export interface SecuritySession {
  id: string;
  device: string;
  browser: string;
  location: string;
  ipAddress: string;
  isCurrentSession: boolean;
  lastActive: string;
}

export interface PasskeyItem {
  id: string;
  name: string;
  authenticatorType: 'touch_id' | 'windows_hello' | 'yubikey' | 'security_key';
  createdAt: string;
}
