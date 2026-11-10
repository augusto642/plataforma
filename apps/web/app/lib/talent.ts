import { apiFetch } from './apiClient';

/**
 * Fase 4 premium (desenho §5) — client de vagas, perfil Talent Match,
 * introduções e organizações. Nenhum texto promete emprego ou
 * contratação: matching é visibilidade + introdução mediada.
 */

export interface JobPosting {
  id: string;
  title: string;
  skills: string[];
  level: string;
  source: string;
  externalUrl: string | null;
  postedAt: string;
  expiresAt: string;
  company: { name: string } | null;
}

export interface TalentMatch {
  job: JobPosting;
  match: { score: number; matchedSkills: string[]; missingSkills: string[] };
}

export interface TalentProfile {
  id: string;
  talentVisible: boolean;
  careerTier: string;
  xp: number;
  level: number;
  effectivelyVisible: boolean;
  profile: {
    headline: string | null;
    skillsProven: string[];
    projectUrls: string[];
    spotlight: boolean;
    visible: boolean;
  } | null;
  certificates: { kind: string; title: string; issuedAt: string; code: string }[];
}

export interface StudentIntroduction {
  id: string;
  companyName: string;
  jobTitle: string | null;
  companyMessage: string | null;
  status: string;
  createdAt: string;
  decidedAt: string | null;
}

export interface OrgDashboard {
  organization: { id: string; name: string; seats: number; companyId: string | null };
  seatsUsed: number;
  seatsAvailable: number;
  members: {
    userId: string;
    name: string;
    role: string;
    careerTier: string;
    xp: number;
    level: number;
    enrollmentsCount: number;
  }[];
}

async function parseError(res: Response): Promise<Error> {
  const body = await res.json().catch(() => ({}));
  const message =
    (body as { message?: string | string[] }).message ?? 'Não foi possível completar a operação.';
  return new Error(Array.isArray(message) ? message.join(' ') : message);
}

export async function getJobs(): Promise<JobPosting[]> {
  const res = await apiFetch('/talent/jobs');
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function getMyMatches(): Promise<TalentMatch[]> {
  const res = await apiFetch('/talent/matches/me');
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function getMyTalentProfile(): Promise<TalentProfile> {
  const res = await apiFetch('/talent/profile/me');
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function updateMyTalentProfile(body: {
  headline?: string;
  projectUrls?: string[];
  visible?: boolean;
  spotlight?: boolean;
}): Promise<TalentProfile['profile']> {
  const res = await apiFetch('/talent/profile/me', { method: 'PUT', body: JSON.stringify(body) });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function refreshMyTalentProfile(): Promise<TalentProfile['profile']> {
  const res = await apiFetch('/talent/profile/me/refresh', { method: 'POST' });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function getMyIntroductions(): Promise<StudentIntroduction[]> {
  const res = await apiFetch('/talent/introductions/me');
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function decideIntroduction(id: string, accept: boolean): Promise<StudentIntroduction> {
  const res = await apiFetch(`/talent/introductions/${id}/${accept ? 'accept' : 'decline'}`, {
    method: 'POST',
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function getMyOrganizations(): Promise<{ id: string; name: string; seats: number; myRole: string }[]> {
  const res = await apiFetch('/organizations/me');
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function getOrgDashboard(orgId: string): Promise<OrgDashboard> {
  const res = await apiFetch(`/organizations/${orgId}/dashboard`);
  if (!res.ok) throw await parseError(res);
  return res.json();
}
