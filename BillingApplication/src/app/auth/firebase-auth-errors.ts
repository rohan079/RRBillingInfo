/** Human-readable messages for Firebase Auth errors on the login form. */
export function firebaseAuthUserMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Sign-in failed.';
  const rec = err as { code?: string; message?: string };
  const code = rec.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    default:
      break;
  }
  if (rec.message && typeof rec.message === 'string') {
    return rec.message.replace(/^Firebase:\s*/i, '').replace(/\s*\(auth\/[^)]+\)\s*$/, '');
  }
  return 'Sign-in failed.';
}
