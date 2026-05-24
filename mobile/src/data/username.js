export const USERNAME_DOMAIN = 'khoaivn.com';

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;

export function normalizeUsername(input) {
  return (input ?? '').trim().toLowerCase();
}

export function validateUsername(input) {
  const u = normalizeUsername(input);
  if (!u) return 'Username is required.';
  if (u.length < 3) return 'Username must be at least 3 characters.';
  if (u.length > 32) return 'Username must be 32 characters or fewer.';
  if (!USERNAME_RE.test(u)) {
    return 'Use only letters, numbers, dot, dash, or underscore.';
  }
  return null;
}

export function usernameToEmail(username) {
  return `${normalizeUsername(username)}@${USERNAME_DOMAIN}`;
}

export function emailToUsername(email) {
  if (!email) return '';
  const at = email.indexOf('@');
  return at > 0 ? email.slice(0, at) : email;
}
