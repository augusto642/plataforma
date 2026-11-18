import type { CareerGoal, ExperienceLevel, WeeklyTimeCommitment } from '@plataforma/contracts';
import { apiFetch } from '../../lib/apiClient';

export type LearningProfileRequest =
  | { careerGoal: CareerGoal; experienceLevel: ExperienceLevel; weeklyTimeCommitment: WeeklyTimeCommitment }
  | { skipped: true };

export async function sendLearningProfile(body: LearningProfileRequest): Promise<void> {
  const response = await apiFetch('/dynamic-track/me/learning-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (response.status !== 204) throw new Error('Não foi possível registrar sua escolha.');
}
