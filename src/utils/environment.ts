// P3 Forge — Environment URL resolver
// Never hardcode env URLs. Always read from p3f_client.p3f_envurl or env var.

import type { P3FClient } from '../api/types';

export function resolveEnvUrl(client?: P3FClient | null): string {
  const url = client?.p3f_prodenvurl
    ?? process.env.REACT_APP_PP_ENV_URL
    ?? '';
  if (!url) throw new Error('No environment URL available');
  return url;
}

export function resolveUatEnvUrl(client?: P3FClient | null): string {
  const url = client?.p3f_uatenvurl
    ?? process.env.REACT_APP_PP_ENV_URL
    ?? '';
  if (!url) throw new Error('No UAT environment URL available');
  return url;
}
