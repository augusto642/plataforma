import {
  SshKeyItem,
  GpgKeyItem,
  PersonalAccessToken,
  TutorPreferences,
  BillingInvoice,
  SecuritySession,
  PasskeyItem,
} from './types';

export const INITIAL_SSH_KEYS: SshKeyItem[] = [
  {
    id: 'ssh-1',
    title: 'MacBook Pro M3 Max (Dev Workstation)',
    fingerprint: 'SHA256:4k8Z9+Yf0wT1/o8J3rP9a2L0K1vX8Z7M4N5P6Q7R8S9',
    keyType: 'ED25519',
    createdAt: '12 Jan 2026',
    lastUsedAt: 'Hoje às 14:32 (Git Push)',
  },
  {
    id: 'ssh-2',
    title: 'Linux Arch Workstation (Home Lab)',
    fingerprint: 'SHA256:7u2B3+Xq9wK5/p1N4tL8m0V2Y3zQ6R7S8T9U0V1W2X3',
    keyType: 'ED25519',
    createdAt: '04 Fev 2026',
    lastUsedAt: 'Ontem às 21:05 (IDE Sandbox)',
  },
];

export const INITIAL_GPG_KEYS: GpgKeyItem[] = [
  {
    id: 'gpg-1',
    keyId: '4A8B9C0D1E2F3A4B',
    email: 'augusto.galvao@nexuscode.dev',
    expiresAt: '12 Jan 2028',
    status: 'valid',
  },
];

export const INITIAL_TOKENS: PersonalAccessToken[] = [
  {
    id: 'pat-1',
    name: 'Nexus CLI & VSCode Extension',
    tokenPrefix: 'nx_pat_7a9f...b3c1',
    scopes: ['repo:read', 'repo:write', 'sandbox:execute'],
    createdAt: '15 Jan 2026',
    expiresAt: 'Em 6 meses',
  },
  {
    id: 'pat-2',
    name: 'CI/CD Automated Runner',
    tokenPrefix: 'nx_pat_2e4d...98f4',
    scopes: ['sandbox:execute', 'metrics:read'],
    createdAt: '28 Fev 2026',
    expiresAt: 'Em 30 dias',
  },
];

export const INITIAL_TUTOR_PREFS: TutorPreferences = {
  rigidity: 'balanced',
  verbosity: 'step_by_step',
  faangInterviewMode: false,
  defaultLanguage: 'rust',
  enableAudioVoice: false,
  autoFormatCodeOnSubmit: true,
  strictBigOChecks: true,
};

export const INITIAL_INVOICES: BillingInvoice[] = [
  {
    id: 'inv-1042',
    invoiceNumber: 'INV-2026-03-1042',
    date: '01 Mar 2026',
    amount: 'R$ 89,00',
    status: 'paid',
    downloadUrl: '#',
  },
  {
    id: 'inv-0938',
    invoiceNumber: 'INV-2026-02-0938',
    date: '01 Fev 2026',
    amount: 'R$ 89,00',
    status: 'paid',
    downloadUrl: '#',
  },
  {
    id: 'inv-0814',
    invoiceNumber: 'INV-2026-01-0814',
    date: '01 Jan 2026',
    amount: 'R$ 89,00',
    status: 'paid',
    downloadUrl: '#',
  },
];

export const INITIAL_SESSIONS: SecuritySession[] = [
  {
    id: 'sess-1',
    device: 'macOS — Chrome 124',
    browser: 'Google Chrome',
    location: 'São Paulo, SP, Brasil',
    ipAddress: '177.18.240.112',
    isCurrentSession: true,
    lastActive: 'Agora (Sessão Ativa)',
  },
  {
    id: 'sess-2',
    device: 'Linux x86_64 — Firefox Developer Edition',
    browser: 'Mozilla Firefox',
    location: 'São Paulo, SP, Brasil',
    ipAddress: '177.18.240.112',
    isCurrentSession: false,
    lastActive: 'Há 2 horas',
  },
  {
    id: 'sess-3',
    device: 'iOS 17 — Safari Mobile (iPhone 15 Pro)',
    browser: 'Mobile Safari',
    location: 'São Paulo, SP, Brasil',
    ipAddress: '189.120.45.98',
    isCurrentSession: false,
    lastActive: 'Ontem às 19:40',
  },
];

export const INITIAL_PASSKEYS: PasskeyItem[] = [
  {
    id: 'pk-1',
    name: 'MacBook Touch ID (Biometria Apple)',
    authenticatorType: 'touch_id',
    createdAt: '15 Jan 2026',
  },
  {
    id: 'pk-2',
    name: 'YubiKey 5C NFC (FIDO2 Hardware)',
    authenticatorType: 'yubikey',
    createdAt: '02 Fev 2026',
  },
];
