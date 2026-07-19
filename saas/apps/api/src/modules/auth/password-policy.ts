const COMMON_PASSWORDS = new Set([
  '12345678',
  'password',
  'senha123',
  'qwerty123',
  'admin123',
  'consultoria',
]);

export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordPolicy(password: string, email?: string): PasswordPolicyResult {
  const normalized = password ?? '';
  const errors: string[] = [];

  if (normalized.length < 8) {
    errors.push('PASSWORD_MIN_LENGTH');
  }
  if (/^\d+$/.test(normalized)) {
    errors.push('PASSWORD_ONLY_NUMBERS');
  }
  if (email && normalized.toLowerCase() === email.trim().toLowerCase()) {
    errors.push('PASSWORD_EQUALS_EMAIL');
  }
  if (COMMON_PASSWORDS.has(normalized.toLowerCase())) {
    errors.push('PASSWORD_TOO_COMMON');
  }

  return { valid: errors.length === 0, errors };
}

export function assertPasswordPolicy(password: string, email?: string): void {
  const result = validatePasswordPolicy(password, email);
  if (!result.valid) {
    const error = new Error('WEAK_PASSWORD') as Error & { details?: string[] };
    error.details = result.errors;
    throw error;
  }
}
