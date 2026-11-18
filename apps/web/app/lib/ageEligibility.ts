export const AGE_CONFIRMATION_KEY = 'nexus-age-eligibility-version';
export const AGE_ELIGIBILITY_TOKEN_KEY = 'nexus-age-eligibility-token';

export function clearGuestAgeEligibility(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(AGE_CONFIRMATION_KEY);
  window.sessionStorage.removeItem(AGE_ELIGIBILITY_TOKEN_KEY);
}

export function getGuestAgeEligibilityToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(AGE_ELIGIBILITY_TOKEN_KEY);
}
