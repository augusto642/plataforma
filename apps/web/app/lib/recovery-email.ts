let pendingEmail = '';

export function prefillRecoveryEmail(email: string) {
  pendingEmail = email.trim();
}

export function takeRecoveryEmail() {
  const email = pendingEmail;
  pendingEmail = '';
  return email;
}
