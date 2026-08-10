import { env } from '../../config/env';

export function isLegalAcceptanceRequired(): boolean {
  return env.requireLegalAcceptance;
}
