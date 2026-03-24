// P3 Forge — Gate routing logic
// Gate 0: ALWAYS active — no exceptions ever.

import { TICKET_TYPE, COMPLEXITY } from '../api/types';

export function gate1Required(tier: 1 | 2 | 3, type: number, complexity: number): boolean {
  if (tier === 1) return true;
  if (tier === 2) return !(type === TICKET_TYPE.BUG && complexity <= COMPLEXITY.M);
  if (tier === 3) return type === TICKET_TYPE.CHANGE_REQUEST;
  return true;
}

export function gate2Required(tier: 1 | 2 | 3, type: number, complexity: number): boolean {
  if (tier === 1) return true;
  if (tier === 2) return true;
  if (tier === 3) return !(type === TICKET_TYPE.BUG && complexity <= COMPLEXITY.M);
  return true;
}
